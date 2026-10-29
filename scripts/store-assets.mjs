// Renders Chrome Web Store images from the built extension and the local demo:
// 1280x800 screenshots of a form beside the side panel, and the 440x280 small promo tile.
// Run `npm run build` first. Output goes to .output/store/.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const extension = path.join(root, '.output/chrome-mv3')
const out = path.join(root, '.output/store')
const demo = 'http://127.0.0.1:4173'
const profile = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-010-2030',
  linkedin: 'https://linkedin.com/in/ada',
  github: 'https://github.com/ada',
  website: 'https://ada.example',
}

await mkdir(out, { recursive: true })
const server = spawn(process.execPath, ['demo/serve.mjs'], { cwd: root, stdio: 'ignore', env: { ...process.env, PORT: '4173' } })
const userData = await mkdtemp(path.join(tmpdir(), 'localauto-store-'))
try {
  await waitForDemo()
  const context = await chromium.launchPersistentContext(userData, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox', '--hide-scrollbars'],
  })
  try {
    let [worker] = context.serviceWorkers()
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 })
    const extensionId = new URL(worker.url()).host
    const page = await context.newPage()
    await page.setViewportSize({ width: 860, height: 800 })
    await page.goto(`${demo}/greenhouse.html`)
    const panel = await context.newPage()
    await panel.setViewportSize({ width: 420, height: 800 })
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`)
    await panel.locator('#profile-fullName:not([disabled])').waitFor()
    for (const [key, value] of Object.entries(profile)) await panel.locator(`#profile-${key}`).fill(value)
    await panel.locator('#save-profile').click()
    await panel.locator('#edit-profile').waitFor()

    // 1. A profile fill on a Greenhouse-style form.
    await fill(panel)
    await compose(page, panel, '1-fill', 'Fill a form from your profile', 'Name, email, phone, and links go into empty fields when you click.')

    // 2. Keep the answers you wrote.
    await page.locator('input[type=radio][value="1"]').check()
    await page.locator('#sponsor').selectOption('no')
    await page.locator('#why').fill('I like building small tools that keep data on the device.')
    await page.locator('#python').fill('5')
    await page.locator('#why').scrollIntoViewIfNeeded()
    await panel.locator('#collect-button').click()
    await panel.locator('#save-answers').waitFor()
    await compose(page, panel, '2-review', 'Keep the answers you choose', 'Review the questions you answered and keep only the ones to reuse.', '#application .list-title')
    await panel.locator('#save-answers').click()
    await panel.getByText(/Saved \d+ answers? on this device/).waitFor()

    // 3. A paraphrased form: exact questions fill, paraphrases wait for Accept.
    await page.goto(`${demo}/return-visit.html`)
    await panel.bringToFront()
    await fill(panel)
    await page.locator('#visa').scrollIntoViewIfNeeded()
    await compose(page, panel, '3-suggestions', 'Paraphrases wait for you', 'A reworded question shows the past answer and its source. Nothing fills until you accept.', '#suggestions')

    // 4. Settings: saved answers stay on the device and can be deleted.
    const options = await context.newPage()
    await options.setViewportSize({ width: 1280, height: 800 })
    await options.goto(`chrome-extension://${extensionId}/options.html`)
    await options.locator('#saved-answers').scrollIntoViewIfNeeded()
    await options.evaluate(() => document.getElementById('saved-answers')?.scrollIntoView({ block: 'start' }))
    await options.screenshot({ path: path.join(out, 'screenshot-4-settings.png') })

    await promoTile(context)
  } finally {
    await context.close()
  }
  console.log(`Store images are in ${path.relative(root, out)}/`)
} finally {
  server.kill()
  await rm(userData, { recursive: true, force: true })
}

async function fill(panel) {
  await panel.bringToFront()
  await panel.locator('#fill-button').click()
  await panel.locator('#notice').waitFor()
  await panel.waitForFunction(() => !document.querySelector('#fill-button')?.hasAttribute('disabled'))
}

async function compose(page, panel, name, title, caption, panelAnchor) {
  await page.bringToFront()
  const form = await page.screenshot({ type: 'png' })
  await panel.bringToFront()
  if (panelAnchor) {
    await panel.evaluate((selector) => document.querySelector(selector)?.scrollIntoView({ block: 'start' }), panelAnchor)
  }
  const side = await panel.screenshot({ type: 'png' })
  const html = `<!doctype html><html><body style="margin:0;width:1280px;height:800px;display:flex;background:#1c1915;font:15px/1.4 'Segoe UI',system-ui,sans-serif">
    <div style="position:relative;width:860px;height:800px">
      <img src="data:image/png;base64,${form.toString('base64')}" style="display:block;width:860px;height:800px" />
      <div style="position:absolute;left:24px;right:24px;bottom:24px;padding:14px 18px;border-radius:12px;background:rgb(28 25 21 / 88%);color:#fff8ec">
        <strong style="display:block;font-size:20px;letter-spacing:-0.01em">${title}</strong><span style="opacity:.85">${caption}</span>
      </div>
    </div>
    <img src="data:image/png;base64,${side.toString('base64')}" style="display:block;width:420px;height:800px;border-left:1px solid #ddd4c4" />
  </body></html>`
  const canvas = await page.context().newPage()
  await canvas.setViewportSize({ width: 1280, height: 800 })
  await canvas.setContent(html)
  await canvas.screenshot({ path: path.join(out, `screenshot-${name}.png`) })
  await canvas.close()
}

async function promoTile(context) {
  const icon = await readFile(path.join(root, 'public/icon/128.png'))
  const canvas = await context.newPage()
  await canvas.setViewportSize({ width: 440, height: 280 })
  await canvas.setContent(`<!doctype html><html><body style="margin:0;width:440px;height:280px;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:0 36px;box-sizing:border-box;background:#f3f0e8;color:#1c1915;font:16px/1.35 'Segoe UI',system-ui,sans-serif">
    <div style="display:flex;align-items:center;gap:14px">
      <img src="data:image/png;base64,${icon.toString('base64')}" style="width:56px;height:56px" />
      <strong style="font-size:30px;letter-spacing:-0.02em">Localauto</strong>
    </div>
    <div style="font-size:18px">Fill job applications from answers you already gave.</div>
    <div style="color:#1f6b4a;font-weight:600">On your device. No account.</div>
  </body></html>`)
  await canvas.screenshot({ path: path.join(out, 'promo-small-440x280.png') })
  await canvas.close()
}

async function waitForDemo() {
  const start = Date.now()
  while (Date.now() - start < 8000) {
    try {
      if ((await fetch(`${demo}/`)).ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('demo server did not start')
}

