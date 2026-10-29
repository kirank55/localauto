// Product Hunt gallery, 1270×760, plus a 240×240 thumbnail.
// Shots are the real side panel and the local demo. Run `npm run build` first.
// Output: .output/product-hunt/
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const extension = path.join(root, '.output/chrome-mv3')
const out = path.join(root, '.output/product-hunt')
const raw = path.join(out, 'raw')
const port = 4174
const demoOrigin = `http://127.0.0.1:${port}`
const composeOnly = process.argv.includes('--compose-only')
let fontCss

const profile = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-010-2030',
  linkedin: 'https://linkedin.com/in/ada',
  github: 'https://github.com/ada',
  website: 'https://ada.example',
}

await mkdir(raw, { recursive: true })
if (!composeOnly) await capture()
await compose()
console.log(`Product Hunt images are in ${path.relative(root, out)}/`)

async function capture() {
  const server = spawn(process.execPath, ['demo/serve.mjs'], {
    cwd: root,
    stdio: 'ignore',
    env: { ...process.env, PORT: String(port) },
  })
  const userData = await mkdtemp(path.join(tmpdir(), 'localauto-ph-'))
  try {
    await waitForDemo()
    const context = await chromium.launchPersistentContext(userData, {
      headless: false,
      viewport: { width: 880, height: 900 },
      deviceScaleFactor: 2,
      locale: 'en-US',
      colorScheme: 'light',
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
      ],
    })
    try {
      let [worker] = context.serviceWorkers()
      if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 })
      const extensionId = new URL(worker.url()).host
      const page = await context.newPage()
      await page.setViewportSize({ width: 840, height: 1200 })
      const panel = await context.newPage()
      await panel.setViewportSize({ width: 460, height: 1400 })
      await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`)
      await brand(panel)
      await panel.addStyleTag({ content: '#page-host{display:none !important}' })
      await panel.locator('#personality').click()
      await panel.locator('#personality-menu [role="option"]', { hasText: 'Software engineer' }).click()
      await panel.locator('#profile-fullName:not([disabled])').waitFor()
      for (const [key, value] of Object.entries(profile)) await panel.locator(`#profile-${key}`).fill(value)
      await panel.locator('#save-profile').click()
      await panel.locator('#edit-profile').waitFor()

      await openForm(page, '/greenhouse.html')
      await fill(panel)
      await page.bringToFront()
      await page.locator('h1').scrollIntoViewIfNeeded()
      const field = (selector) => page.locator(selector).locator('xpath=ancestor::div[contains(@class,"field")][1]')
      await shotClip(page, union([
        await boxOf(page.locator('h1')),
        await boxOf(field('#first_name')),
        await boxOf(field('#last_name')),
        await boxOf(field('#email')),
        await boxOf(field('#phone')),
      ]), 'form-profile.png', 18)
      await panel.bringToFront()
      await panel.addStyleTag({ content: '#filled .card:nth-of-type(n+5){display:none !important}' })
      await shot(panel.locator('#filled'), 'filled-profile.png')

      await page.bringToFront()
      await page.locator('input[type=radio][value="1"]').check()
      await page.locator('#sponsor').selectOption('no')
      await page.locator('#why').fill('I like building small tools that keep data on the device.')
      await page.locator('#python').fill('5')
      await panel.bringToFront()
      await panel.locator('#collect-button').click()
      await panel.locator('#save-answers').waitFor()
      await panel.locator('article', { hasText: 'Python' }).locator('input[type=checkbox]').uncheck()
      await panel.locator('#keep-count').waitFor()
      await panel.setViewportSize({ width: 560, height: 1500 })
      await panel.locator('h2.list-title').evaluate((element) => element.scrollIntoView({ block: 'start' }))
      await shotClip(panel, await fromTo(panel, 'h2.list-title', '#save-answers'), 'review.png', 16)
      await panel.setViewportSize({ width: 460, height: 1400 })

      await page.bringToFront()
      await page.locator('.select__control').click()
      await page.locator('.select__option', { hasText: 'Yes' }).click()
      await page.locator('.select__single-value', { hasText: 'Yes' }).waitFor()
      await panel.bringToFront()
      await panel.locator('#collect-button').click()
      await panel.locator('#save-answers').click()
      await panel.getByText(/Saved \d+ answers? on this device/).waitFor()

      await page.bringToFront()
      await page.reload()
      await openForm(page)
      await fill(panel)
      await page.locator('#why').waitFor()
      await expectValue(page.locator('#why'), 'I like building small tools that keep data on the device.')
      await page.locator('.select__single-value', { hasText: 'Yes' }).waitFor()
      await shot(page.locator('.field', { has: page.locator('#why') }), 'field-why.png')
      await shot(page.locator('.field', { has: page.locator('#relocate') }), 'field-relocate.png')
      await panel.bringToFront()
      await panel.addStyleTag({ content: '#filled .card:nth-of-type(n+5){display:block !important} #filled .card{border-top:0 !important}' })
      await shot(panel.locator('#filled .card', { hasText: 'Why do you want this role?' }), 'card-why.png')
      await shot(panel.locator('#filled .card', { hasText: 'relocation' }), 'card-relocate.png')

      await page.bringToFront()
      await page.goto(`${demoOrigin}/return-visit.html`)
      await page.locator('body').waitFor()
      await brand(page)
      await fill(panel)
      await panel.locator('#suggestions').waitFor()
      const suggestions = await panel.locator('#suggestions').innerText()
      if (!suggestions.includes('legally authorised to work in the US')) {
        throw new Error(`missing the US suggestion\n${suggestions}`)
      }
      if (suggestions.includes('UK')) throw new Error(`UK was offered as a suggestion\n${suggestions}`)
      await panel.addStyleTag({ content: 'html,body,#app{background:transparent !important}' })
      await shot(panel.locator('#suggestions'), 'suggestions.png', { omitBackground: true })
      await shot(panel.locator('#suggestions .card').first(), 'card-suggestion.png', { omitBackground: true })
      await page.bringToFront()
      await page.setViewportSize({ width: 520, height: 900 })
      await page.evaluate(() => { document.body.style.background = '#ffffff' })
      await shot(page.locator('.field', { hasText: 'legally authorised to work in the US' }), 'field-us.png')

      const options = await context.newPage()
      await options.setViewportSize({ width: 720, height: 1400 })
      await options.goto(`chrome-extension://${extensionId}/options.html`)
      await options.locator('#saved-answers .q').first().waitFor()
      await brand(options)
      await options.addStyleTag({ content: '.answer-list .meta{display:none !important}' })
      await shot(options.locator('#saved-answers'), 'settings.png')
    } finally {
      await context.close()
    }
  } finally {
    server.kill()
    await rm(userData, { recursive: true, force: true })
  }
}

async function openForm(page, pathname) {
  if (pathname) await page.goto(`${demoOrigin}${pathname}`)
  await page.locator('h1').waitFor()
  await brand(page)
  await page.evaluate(() => {
    document.querySelector('.eyebrow')?.remove()
    const heading = document.querySelector('h1')
    const note = heading?.nextElementSibling
    if (note && note.tagName === 'P') note.remove()
    document.title = 'Product engineer'
    document.body.style.background = '#ffffff'
  })
}

async function brand(target) {
  const css = await fontFace()
  await target.addStyleTag({
    content: `${css}
      html, body, button, input, textarea, select, label { font-family: Inter, system-ui, sans-serif !important; }
      :focus, :focus-visible { outline: none !important; }
      * { caret-color: transparent !important; }`,
  })
  await target.evaluate(() => document.fonts.ready)
}

async function fill(panel) {
  await panel.bringToFront()
  await panel.locator('#fill-button').click()
  await panel.locator('#notice').waitFor()
  await panel.waitForFunction(() => !document.querySelector('#fill-button')?.hasAttribute('disabled'))
  await panel.locator('#filled').waitFor()
}

async function shot(locator, name, options = {}) {
  await locator.scrollIntoViewIfNeeded()
  const file = path.join(raw, name)
  await locator.screenshot({ path: file, type: 'png', animations: 'disabled', caret: 'hide', ...options })
  const { width, height } = pngSize(await readFile(file))
  console.log(`${name} ${width}×${height}`)
}

async function shotClip(target, box, name, pad) {
  const clip = padded(box, pad)
  const file = path.join(raw, name)
  await target.screenshot({ path: file, type: 'png', clip, animations: 'disabled', caret: 'hide' })
  const { width, height } = pngSize(await readFile(file))
  console.log(`${name} ${width}×${height}`)
}

async function boxOf(locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('missing box')
  return box
}

function union(boxes) {
  return {
    x: Math.min(...boxes.map((box) => box.x)),
    y: Math.min(...boxes.map((box) => box.y)),
    right: Math.max(...boxes.map((box) => box.x + box.width)),
    bottom: Math.max(...boxes.map((box) => box.y + box.height)),
  }
}

async function fromTo(target, start, end) {
  const a = await target.locator(start).boundingBox()
  const b = await target.locator(end).boundingBox()
  if (!a || !b) throw new Error(`missing clip ${start} ${end}`)
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), right: Math.max(a.x + a.width, b.x + b.width), bottom: Math.max(a.y + a.height, b.y + b.height) }
}

function padded(box, pad) {
  return {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.right - box.x + pad * 2,
    height: box.bottom - box.y + pad * 2,
  }
}

async function expectValue(locator, expected) {
  const start = Date.now()
  let last = ''
  while (Date.now() - start < 8000) {
    last = await locator.inputValue()
    if (last === expected) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`expected ${JSON.stringify(expected)} but saw ${JSON.stringify(last)}`)
}

async function waitForDemo() {
  const start = Date.now()
  while (Date.now() - start < 8000) {
    try {
      if ((await fetch(`${demoOrigin}/`)).ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('demo server did not start')
}

async function compose() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const context = await browser.newContext({
      viewport: { width: 1270, height: 760 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
    })
    const page = await context.newPage()
    const frames = [
      ['01-the-answer-stays.png', hero()],
      ['02-empty-fields.png', emptyFields()],
      ['03-same-question.png', sameQuestion()],
      ['04-paraphrase-waits.png', paraphrase()],
      ['05-never-a-suggestion.png', conflict()],
      ['06-you-choose.png', youChoose()],
      ['07-no-account.png', noAccount()],
      ['08-where-it-runs.png', whereItRuns()],
    ]
    for (const [name, body] of frames) {
      await render(page, name, body)
    }
    await renderThumb(browser)
    await context.close()
  } finally {
    await browser.close()
  }
}

function hero() {
  return `<body class="ink hero">
    <div class="hero-copy">
      <div class="brand">${mark('#f4f4f3', '#171717')} Localauto <span class="beta">Beta</span></div>
      <p class="kicker">Chrome extension for Greenhouse and Lever</p>
      <h1>The answer stays<br>on this device.</h1>
      <p class="soft">The next form can use it.</p>
      <p class="lede">A repeated question fills when you click. A paraphrase waits until you accept it.</p>
    </div>
    <div class="hero-shot">${lift(picture('suggestions.png'), 16)}</div>
  </body>`
}

function emptyFields() {
  return slide({
    n: '02',
    title: 'Empty fields only.',
    sub: 'A value you already typed stays. Passwords and card numbers are never written.',
    body: `<div class="compare">
      <figure>
        <figcaption>On the form</figcaption>
        ${frame(picture('form-profile.png'), 16)}
      </figure>
      <figure>
        <figcaption>In the side panel</figcaption>
        ${lift(picture('filled-profile.png'), 12)}
      </figure>
    </div>`,
  })
}

function sameQuestion() {
  return slide({
    n: '03',
    title: 'A repeated question fills on click.',
    sub: 'Same words, aside from case and punctuation.',
    body: `<div class="compare even">
      <figure>
        <figcaption>On the form</figcaption>
        ${frame(picture('field-why.png', { pad: 18 }), 16)}
        <div class="pair-gap"></div>
        ${frame(picture('field-relocate.png', { pad: 18 }), 16)}
      </figure>
      <figure>
        <figcaption>In the side panel</figcaption>
        <div class="replica">
          <h2>Filled</h2>
          ${picture('card-why.png')}
          ${picture('card-relocate.png')}
        </div>
      </figure>
    </div>`,
  })
}

function paraphrase() {
  return split({
    n: '04',
    title: 'A paraphrase is only a suggestion.',
    sub: 'Nothing is written until you accept that one field.',
    visual: `<figure>
        <figcaption>On the form</figcaption>
        ${frame(picture('field-us.png', { pad: 18 }), 16)}
      </figure>
      <figure>
        <figcaption>In the side panel</figcaption>
        <div class="replica">${picture('card-suggestion.png')}</div>
      </figure>`,
  })
}

function conflict() {
  return `<body class="slide statement">
    ${num('05')}
    ${lockup(false)}
    <p class="kicker">The rule</p>
    <h1 class="xl">A conflict is never<br>a suggestion.</h1>
    <div class="pair">
      <article>
        <p class="eyebrow">Saved on this device</p>
        <h2>Are you authorized to work in the United States?</h2>
        <p class="answer">Yes</p>
      </article>
      <article class="held">
        <p class="eyebrow">On the next form</p>
        <h2>Are you authorized to work in the UK?</h2>
        <p class="answer muted">Left empty</p>
        <p class="why">Not offered. The countries do not agree.</p>
      </article>
    </div>
  </body>`
}

function youChoose() {
  return split({
    n: '06',
    title: 'Learning is a list you review.',
    sub: 'Uncheck anything you do not want kept.',
    visual: frame(picture('review.png', { pad: 4, maxHeight: 590 }), 16),
  })
}

function noAccount() {
  return split({
    n: '07',
    title: 'There is no account.',
    sub: 'Nothing is uploaded. Delete any answer, or delete them all.',
    visual: lift(picture('settings.png', { maxHeight: 640 }), 12),
  })
}

function whereItRuns() {
  return `<body class="ink closer">
    ${num('08')}
    <div>
      ${lockup(true)}
      <p class="kicker light">Where it runs</p>
      <h1 class="xl">The form you<br>have open.</h1>
      <p class="lede">Checked against live Greenhouse, Lever, and Ashby forms.</p>
    </div>
    <div>
      <div class="places">
        <div><b>Greenhouse</b><span>Dropdown questions included</span></div>
        <div><b>Lever</b><span>Checkbox questions included</span></div>
        <div><b>Ashby</b><span>Native fields</span></div>
        <div><b>Any other website</b><span>When the field says what it is</span></div>
      </div>
      <p class="later">Not in this beta: Workday, LinkedIn Easy Apply, and resume uploads.</p>
    </div>
  </body>`
}

function slide({ n, title, sub, body }) {
  const xl = title.length < 28
  return `<body class="slide">
    ${num(n)}
    ${lockup(false)}
    <h1 class="${xl ? 'xl' : ''}">${title}</h1>
    <p class="sub">${sub}</p>
    ${body}
  </body>`
}

function split({ n, title, sub, visual }) {
  return `<body class="split">
    ${num(n)}
    <div>
      ${lockup(false)}
      <h1>${title}</h1>
      <p class="sub">${sub}</p>
    </div>
    <div class="split-visual">${visual}</div>
  </body>`
}

function lockup(light) {
  const glyph = light ? ['#f4f4f3', '#171717'] : ['#171717', '#f4f4f3']
  return `<div class="brand">${mark(...glyph)} Localauto</div>`
}

function num(n) {
  return `<span class="num">${n}</span>`
}

function mark(ground, glyph) {
  return `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="${ground}"/><path fill="${glyph}" d="M9 7.2h5.1V19.8H23v4.6H9z"/></svg>`
}

function lift(html, radius) {
  return `<div class="lift" style="border-radius:${radius}px">${html}</div>`
}

function frame(html, radius) {
  return `<div class="frame" style="border-radius:${radius}px">${html}</div>`
}

function picture(name, { pad = 0, maxHeight = 0 } = {}) {
  return `<span class="pic" data-raw="${name}" data-pad="${pad}" data-max="${maxHeight}"></span>`
}

async function render(page, name, body) {
  const html = `<!doctype html><html><head><style>${await galleryCss()}</style></head>${await hydrate(body)}</html>`
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const big = path.join(raw, name)
  await page.screenshot({ path: big, type: 'png', animations: 'disabled' })
  await downscale(page.context().browser(), big, path.join(out, name))
  const size = pngSize(await readFile(path.join(out, name)))
  console.log(`${name} ${size.width}×${size.height}`)
}

async function hydrate(body) {
  let html = body
  for (const slot of body.matchAll(/<span class="pic" data-raw="([^"]+)" data-pad="(\d+)" data-max="(\d+)"><\/span>/g)) {
    const buf = await readFile(path.join(raw, slot[1]))
    const pad = Number(slot[2])
    const maxHeight = Number(slot[3])
    let cssWidth = buf.readUInt32BE(16) / 2 + pad * 2
    let cssHeight = buf.readUInt32BE(20) / 2 + pad * 2
    if (maxHeight > 0 && cssHeight > maxHeight) {
      cssWidth *= maxHeight / cssHeight
      cssHeight = maxHeight
    }
    const img = `<img alt="" src="data:image/png;base64,${buf.toString('base64')}" style="width:${cssWidth}px;height:${cssHeight}px;max-width:100%;padding:${pad}px;box-sizing:border-box;background:#fff;display:block">`
    html = html.replace(slot[0], img)
  }
  return html
}

async function renderThumb(browser) {
  const context = await browser.newContext({ viewport: { width: 240, height: 240 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.setContent(`<!doctype html><html><body style="margin:0;width:240px;height:240px">${mark('#171717', '#f4f4f3').replace('class="mark"', 'style="width:240px;height:240px;display:block"')}</body></html>`)
  const big = path.join(raw, 'thumbnail@2x.png')
  await page.screenshot({ path: big, type: 'png' })
  await downscale(browser, big, path.join(out, 'thumbnail.png'), 240, 240)
  await context.close()
}

async function downscale(browser, src, dest, width = 1270, height = 760) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const buf = await readFile(src)
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:#f4f4f3}img{width:${width}px;height:${height}px;display:block}</style><img src="data:image/png;base64,${buf.toString('base64')}">`)
  await page.screenshot({ path: dest, type: 'png' })
  await context.close()
}

async function fontFace() {
  if (!fontCss) {
    const regular = await readFile(path.join(root, 'website/fonts/inter-latin.woff2'))
    const italic = await readFile(path.join(root, 'website/fonts/inter-latin-italic.woff2'))
    fontCss = `@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:block;src:url(data:font/woff2;base64,${regular.toString('base64')}) format('woff2')}
@font-face{font-family:Inter;font-style:italic;font-weight:100 900;font-display:block;src:url(data:font/woff2;base64,${italic.toString('base64')}) format('woff2')}`
  }
  return fontCss
}

async function galleryCss() {
  return `${await fontFace()}
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1270px; height: 760px; overflow: hidden; position: relative; }
    body {
      background: #f4f4f3;
      color: #171717;
      font-family: Inter, system-ui, sans-serif;
      font-optical-sizing: auto;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .ink { background: #171717; color: #f4f4f3; }
    .mark { width: 28px; height: 28px; display: block; flex: none; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 20px; letter-spacing: -0.03em; }
    .beta { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgb(244 244 243 / 55%); border-radius: 999px; padding: 3px 7px; transform: translateY(1px); }
    .kicker { margin: 22px 0 0; font-size: 13px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; color: #8d8d86; }
    .kicker.light { color: #a3a39c; }
    h1 { margin: 12px 0 0; font-size: 48px; font-weight: 560; letter-spacing: -0.042em; line-height: 1.02; }
    h1.xl { font-size: 64px; letter-spacing: -0.045em; }
    .soft { margin: 14px 0 0; font-size: 36px; font-weight: 500; font-style: italic; letter-spacing: -0.03em; line-height: 1.1; color: #a7a79f; }
    .lede, .sub { margin: 16px 0 0; font-size: 22px; line-height: 1.4; font-weight: 450; }
    .ink .lede { color: #c8c8c1; max-width: 460px; }
    .sub { color: #5e5e5c; max-width: 760px; }
    .hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 36px; padding: 0 44px 0 68px; }
    .hero h1 { font-size: 72px; line-height: 0.94; letter-spacing: -0.048em; }
    .hero-shot { max-height: 688px; display: flex; align-items: center; }
    .hero-shot img { max-height: 688px; width: auto; height: auto; }
    .slide { display: flex; flex-direction: column; padding: 40px 56px 44px; }
    .num { position: absolute; top: 42px; right: 48px; font-size: 13px; font-weight: 650; letter-spacing: 0.12em; color: #8a8a84; }
    .ink .num { color: #8d8d86; }
    .split { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); align-items: center; gap: 40px; padding: 48px 56px; }
    .split h1 { font-size: 52px; letter-spacing: -0.044em; }
    .split-visual { display: flex; flex-direction: column; gap: 32px; align-items: flex-start; min-width: 0; }
    .split-visual figure { width: 100%; }
    .compare { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); gap: 28px; align-items: start; margin-top: 26px; min-height: 0; }
    .compare.even { grid-template-columns: 1fr 1fr; }
    figure { margin: 0; min-width: 0; }
    figcaption { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #5e5e5c; }
    .frame, .lift, .replica { width: fit-content; max-width: 100%; }
    .frame, .lift { overflow: hidden; line-height: 0; box-shadow: 0 16px 36px rgb(23 23 23 / 8%); }
    .frame { background: #fff; border: 1px solid #d9d9d6; }
    .ink .lift { box-shadow: 0 28px 70px rgb(0 0 0 / 38%); }
    .frame img, .lift img, .replica img { max-width: 100%; height: auto; }
    .pair-gap { height: 14px; }
    .replica { background: #fff; border: 1px solid #d9d9d6; border-radius: 12px; box-shadow: 0 16px 36px rgb(23 23 23 / 8%); padding: 12px 14px 8px; }
    .replica h2 { margin: 0 0 8px; font-size: 13px; font-weight: 650; letter-spacing: 0.04em; text-transform: uppercase; }
    .replica img + img { border-top: 1px solid #d9d9d6; margin-top: 8px; padding-top: 8px; }
    .solo { margin-top: 22px; min-height: 0; }
    .solo .frame, .solo .lift { max-height: 500px; }
    .solo img { max-height: 500px; width: auto; }
    .statement { padding-top: 36px; }
    .statement h1 { max-width: 16ch; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 28px; }
    .pair article { display: flex; flex-direction: column; min-height: 300px; padding: 26px 28px 22px; background: #fff; border: 1px solid #d9d9d6; border-radius: 16px; }
    .pair .eyebrow { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #5e5e5c; }
    .pair h2 { margin: 16px 0 0; font-size: 30px; font-weight: 560; letter-spacing: -0.03em; line-height: 1.15; }
    .pair .answer { margin: auto 0 0; padding-top: 22px; font-size: 28px; font-weight: 600; letter-spacing: -0.03em; }
    .pair .answer.muted { color: #5e5e5c; }
    .pair .why { margin: 6px 0 0; color: #5e5e5c; font-size: 16px; line-height: 1.4; }
    .pair article.held { box-shadow: inset 3px 0 0 #171717; }
    .closer { display: grid; grid-template-columns: 0.9fr 1.1fr; align-items: center; gap: 36px; padding: 48px 56px; }
    .closer h1 { font-size: 68px; }
    .places { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .places div { background: #f4f4f3; color: #171717; border-radius: 16px; padding: 28px 26px 26px; }
    .places b { display: block; font-size: 26px; font-weight: 600; letter-spacing: -0.03em; }
    .places span { display: block; margin-top: 8px; color: #5e5e5c; font-size: 17px; line-height: 1.35; }
    .later { margin: 18px 0 0; color: #a3a39c; font-size: 17px; line-height: 1.4; }
  `
}

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}
