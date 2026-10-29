import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const extension = path.join(root, '.output/chrome-mv3')
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'))

if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage', 'sidePanel', 'activeTab'])) {
  throw new Error(`unexpected permissions ${JSON.stringify(manifest.permissions)}`)
}
if (manifest.content_scripts[0]?.all_frames !== true) throw new Error('content script must run in all frames')
const matches = manifest.content_scripts[0].matches
if (!matches.includes('https://*/*') || !matches.includes('http://*/*')) {
  throw new Error(`content script must run on every website, got ${JSON.stringify(matches)}`)
}

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
    console.log('e2e ok')
  } finally {
    await context.close()
  }
} finally {
  server.kill()
  await rm(userData, { recursive: true, force: true })
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
