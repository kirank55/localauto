import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const extension = path.join(root, '.output/chrome-mv3')
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'))

if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage', 'sidePanel', 'activeTab', 'scripting'])) {
  throw new Error(`unexpected permissions ${JSON.stringify(manifest.permissions)}`)
}
for (const script of manifest.content_scripts) {
  if (script.all_frames !== true) throw new Error('content scripts must run in all frames')
  if (!script.matches.includes('https://*/*') || !script.matches.includes('http://*/*') || script.matches.length !== 2) {
    throw new Error(`content scripts must run on every website and nothing else, got ${JSON.stringify(script.matches)}`)
  }
}
if (!manifest.content_scripts.some((script) => script.world === 'MAIN')) throw new Error('the choice bridge must run in the main world')

const server = spawn(process.execPath, ['demo/serve.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PORT: '4173' },
})

const userData = await mkdtemp(path.join(tmpdir(), 'localauto-e2e-'))
try {
  await waitForDemo()
  const context = await chromium.launchPersistentContext(userData, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      '--no-sandbox',
    ],
  })
  try {
    let [worker] = context.serviceWorkers()
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 })
    const extensionId = new URL(worker.url()).host
    const demo = await context.newPage()
    await demo.goto('http://127.0.0.1:4173/greenhouse.html')
    const panel = await context.newPage()
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`)

    await panel.locator('#profile-fullName').fill('Ada Lovelace')
    await panel.locator('#profile-email').fill('ada@example.com')
    await panel.locator('#profile-phone').fill('555-010-2030')
    await panel.locator('#profile-linkedin').fill('https://linkedin.com/in/ada')
    await panel.locator('#profile-github').fill('https://github.com/ada')
    await panel.locator('#profile-website').fill('https://ada.example')
    await panel.locator('#fill-button').click()
    await panel.locator('#notice').waitFor({ timeout: 8000 })

    await poll(() => demo.locator('#first_name').inputValue(), 'Ada', panel)
    await poll(() => demo.locator('#last_name').inputValue(), 'Lovelace')
    await poll(() => demo.locator('#email').inputValue(), 'ada@example.com')
    await poll(() => demo.locator('#phone').inputValue(), '555-010-2030')
    await poll(() => demo.locator('#why').inputValue(), '')

    await demo.locator('#why').fill('Because the work is local.')
    await panel.locator('#collect-button').click()
    await panel.locator('#save-answers').click()
    await panel.getByText('Saved 1 answer on this device.').waitFor({ timeout: 8000 })
    await demo.locator('#why').fill('')
    await panel.locator('#fill-button').click()
    await poll(() => demo.locator('#why').inputValue(), 'Because the work is local.')

    // A react-select style question: the answer is picked through the page, not typed into the search box.
    await demo.bringToFront()
    await demo.locator('#relocate').locator('xpath=ancestor::div[contains(@class,"select__control")]').click()
    await demo.locator('.select__option', { hasText: 'No' }).click()
    await poll(() => demo.locator('.select__single-value').innerText(), 'No')
    await demo.locator('#python').fill('5')
    await panel.bringToFront()
    await panel.locator('#collect-button').click()
    await panel.getByText('Are you open to relocation for this role?').waitFor({ timeout: 8000 })
    await panel.locator('#save-answers').click()
    await panel.getByText(/Saved \d+ answers? on this device/).waitFor({ timeout: 8000 })
    await demo.reload()
    await panel.locator('#fill-button').click()
    await poll(() => demo.locator('.select__single-value').innerText().catch(() => ''), 'No', panel)
    await poll(() => demo.locator('#relocate').inputValue(), '')

    // Lever markup: clean labels in the report, and the full name in the single name field.
    await demo.goto('http://127.0.0.1:4173/lever.html')
    await panel.bringToFront()
    await panel.locator('#fill-button').click()
    await poll(() => demo.locator('#name').inputValue(), 'Ada Lovelace', panel)
    await panel.locator('.card strong', { hasText: /^Full name$/ }).waitFor({ timeout: 8000 })

    // Results belong to the page they came from. Moving the tab clears them.
    await demo.goto('http://127.0.0.1:4173/return-visit.html')
    await panel.locator('#fill-button').click()
    await panel.locator('#accept-0').waitFor({ timeout: 8000 })
    await demo.goto('http://127.0.0.1:4173/submit.html')
    await panel.locator('#accept-0').waitFor({ state: 'detached', timeout: 8000 })

    await demo.goto('http://127.0.0.1:4173/embedded.html')
    await panel.bringToFront()
    await panel.locator('#fill-button').click()
    const frame = demo.frameLocator('iframe[title="Application"]')
    await poll(() => frame.locator('#email').inputValue(), 'ada@example.com', panel)
    await panel.getByText(/Filled \d+ field/).waitFor({ timeout: 8000 })

    const shots = path.join(root, 'e2e', 'shots')
    await mkdir(shots, { recursive: true })
    await panel.screenshot({ path: path.join(shots, 'sidepanel.png') })
    await demo.screenshot({ path: path.join(shots, 'embedded.png') })
  } finally {
    await context.close()
  }
  await installAfterTabOpened()
  console.log('e2e ok')
} finally {
  server.kill()
  await rm(userData, { recursive: true, force: true })
}

/** Chrome does not add content scripts to tabs that were open before install. Fill injects them. */
async function installAfterTabOpened() {
  const lateData = await mkdtemp(path.join(tmpdir(), 'localauto-e2e-late-'))
  const context = await chromium.launchPersistentContext(lateData, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--no-sandbox', '--enable-unsafe-extension-debugging'],
  })
  try {
    const demo = await context.newPage()
    await demo.goto('http://127.0.0.1:4173/greenhouse.html')
    const session = await context.browser().newBrowserCDPSession()
    const { id } = await session.send('Extensions.loadUnpacked', { path: extension })
    const panel = await context.newPage()
    await panel.goto(`chrome-extension://${id}/sidepanel.html`)
    await panel.locator('#profile-email').fill('ada@example.com')
    await panel.locator('#fill-button').click()
    await poll(() => demo.locator('#email').inputValue(), 'ada@example.com', panel)
  } finally {
    await context.close()
    await rm(lateData, { recursive: true, force: true })
  }
}

async function waitForDemo() {
  const start = Date.now()
  while (Date.now() - start < 8000) {
    try {
      const response = await fetch('http://127.0.0.1:4173/')
      if (response.ok) return
    } catch {
      // The server is still booting.
    }
    await delay(100)
  }
  throw new Error('demo server did not start')
}

async function poll(read, expected, panel) {
  const start = Date.now()
  let last = ''
  while (Date.now() - start < 8000) {
    last = await read()
    if (last === expected) return
    await delay(100)
  }
  const detail = panel ? await panel.locator('body').innerText().catch(() => '') : ''
  throw new Error(`expected ${JSON.stringify(expected)} but last saw ${JSON.stringify(last)}\n${detail}`)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
