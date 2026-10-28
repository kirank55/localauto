import { spawn } from 'node:child_process'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const extensionDir = path.join(root, '.output/chrome-mv3-dev')
const demoOrigin = 'http://127.0.0.1:4173'

const children = []
let context
let userData
let stopping = false

process.on('SIGINT', () => {
  void stop(0)
})
process.on('SIGTERM', () => {
  void stop(0)
})

try {
  if (!(await isUp(`${demoOrigin}/`))) {
    children.push(
      spawn(process.execPath, ['demo/serve.mjs'], {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, PORT: '4173' },
      }),
    )
  }

  const wxt = spawn(process.execPath, [path.join(root, 'node_modules/wxt/bin/wxt.mjs')], {
    cwd: root,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, LOCALAUTO_TRY: '1' },
  })
  children.push(wxt)
  const built = watchForBuild(wxt)
  wxt.on('exit', (code, signal) => {
    if (stopping || signal === 'SIGINT' || signal === 'SIGTERM') return
    if (code === 0 || code === null) return
    console.error(`\nThe extension watcher stopped (${code}).`)
    void stop(1)
  })

  await Promise.all([waitFor(`${demoOrigin}/`, 'The demo server did not start.'), built])
  await stat(path.join(extensionDir, 'manifest.json'))

  userData = await mkdtemp(path.join(tmpdir(), 'localauto-try-'))
  context = await chromium.launchPersistentContext(userData, {
    headless: false,
    viewport: null,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      '--no-sandbox',
      '--window-size=1280,840',
    ],
  })
  context.on('close', () => {
    void stop(0)
  })

  let [worker] = context.serviceWorkers()
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 20000 })
  const extensionId = new URL(worker.url()).host
  const submit = await context.newPage()
  await submit.goto(`${demoOrigin}/submit.html`)
  const panel = await context.newPage()
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`)
  await panel.locator('#personality').waitFor({ timeout: 15000 })
  await submit.locator('#submit-application').waitFor({ timeout: 15000 })
  await panel.bringToFront()

  console.log('\nTry is ready.')
  console.log('The side panel is in front. The submit demo is the other tab.')
  console.log('Settings is the button in the panel. Saving a file reloads the extension.')
  console.log('Close the browser window to stop.\n')
  await new Promise(() => {})
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("Executable doesn't exist")) {
    console.error('\nInstall the browser once: npx playwright install chromium\n')
  } else {
    console.error(`\n${message}\n`)
  }
  await stop(1)
}

function watchForBuild(wxt) {
  let buffer = ''
  let done = false
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The extension build did not finish.')), 90000)
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    }
    const onData = (chunk) => {
      const text = chunk.toString()
      const visible = text.replace(/^.*unpacked extension manually.*$/gm, '')
      if (visible) process.stdout.write(visible)
      buffer = (buffer + text).slice(-4000)
      if (buffer.includes('Built extension in')) finish()
    }
    wxt.stdout?.on('data', onData)
    wxt.stderr?.on('data', onData)
  })
}

async function isUp(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitFor(url, failure) {
  const start = Date.now()
  while (Date.now() - start < 15000) {
    if (await isUp(url)) return
    await delay(100)
  }
  throw new Error(failure)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function stop(code) {
  if (stopping) return
  stopping = true
  await context?.close().catch(() => undefined)
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM')
  }
  if (userData) await rm(userData, { recursive: true, force: true }).catch(() => undefined)
  process.exit(code)
}
