const Match = window.LocalautoMatch

const SLOT_DETAIL = {
  email: 'Profile email',
  phone: 'Profile phone',
  linkedin: 'Profile LinkedIn',
  github: 'Profile GitHub',
  website: 'Profile website',
  firstName: 'Profile first name',
  lastName: 'Profile last name',
  fullName: 'Profile name',
}

const GREENHOUSE = [
  { key: 'first', label: 'First Name', slot: 'firstName' },
  { key: 'last', label: 'Last Name', slot: 'lastName' },
  { key: 'email', label: 'Email', slot: 'email', type: 'email' },
  { key: 'phone', label: 'Phone', slot: 'phone', type: 'tel' },
  { key: 'linkedin', label: 'LinkedIn Profile', slot: 'linkedin', type: 'url', wide: true },
  { key: 'github', label: 'GitHub', slot: 'github', type: 'url' },
  { key: 'website', label: 'Website', slot: 'website', type: 'url' },
]

const LEVER = [
  { key: 'name', label: 'Name', slot: 'fullName', wide: true },
  { key: 'email', label: 'Email', slot: 'email', type: 'email' },
  { key: 'phone', label: 'Phone', slot: 'phone', type: 'tel' },
  { key: 'linkedin', label: 'LinkedIn', slot: 'linkedin', type: 'url', wide: true },
  { key: 'github', label: 'GitHub', slot: 'github', type: 'url' },
  { key: 'portfolio', label: 'Portfolio', slot: 'website', type: 'url' },
]

const KEEP = [
  { key: 'us', question: 'Are you authorized to work in the United States?', control: 'radio' },
  { key: 'sponsor', question: 'Will you now or in the future require sponsorship?', control: 'select' },
  { key: 'why', question: 'Why do you want this role?', control: 'textarea' },
  { key: 'python', question: 'How many years of Python experience do you have?', control: 'text' },
]

const NEXT = [
  { key: 'name', label: 'Name', slot: 'fullName', control: 'text' },
  { key: 'email', label: 'Email', slot: 'email', control: 'text', type: 'email' },
  { key: 'auth', label: 'Are you legally authorised to work in the US?', yesNo: true, control: 'radio' },
  { key: 'uk', label: 'Are you authorized to work in the UK?', yesNo: true, control: 'radio' },
  { key: 'why', label: 'Why do you want this role?', control: 'textarea' },
  { key: 'python', label: 'Years of Python experience', control: 'text' },
  { key: 'visa', label: 'Will you require visa sponsorship?', control: 'select' },
  { key: 'veteran', label: 'Are you a veteran?', yesNo: true, control: 'radio' },
  { key: 'shipped', label: 'Tell us about a project you shipped', control: 'textarea' },
]

const PRESETS = {
  us: {
    saved: 'Are you authorized to work in the United States?',
    next: 'Are you legally authorised to work in the US?',
    answer: 'Yes',
    yesNo: true,
  },
  uk: {
    saved: 'Are you authorized to work in the United States?',
    next: 'Are you authorized to work in the UK?',
    answer: 'Yes',
    yesNo: true,
  },
  exact: {
    saved: 'Why do you want this role?',
    next: 'Why do you want this role?!',
    answer: 'I like small tools.',
    yesNo: false,
  },
  tell: {
    saved: 'Tell us about yourself',
    next: 'Tell us about your work in the United States',
    answer: 'I like small tools.',
    yesNo: false,
  },
  years: {
    saved: 'How many years of Python experience do you have?',
    next: 'Years of Python experience',
    answer: '5',
    yesNo: false,
  },
  numbers: {
    saved: 'Do you have 5 years of Python experience?',
    next: 'Do you have 10 years of Python experience?',
    answer: 'Yes',
    yesNo: false,
  },
  veteran: {
    saved: 'Are you willing to relocate?',
    next: 'Are you a veteran?',
    answer: 'Yes',
    yesNo: true,
  },
  legend: {
    saved: 'Are you authorized to work in the United States?',
    next: 'Work authorization in the United States',
    answer: 'Yes',
    yesNo: true,
  },
  scotland: {
    saved: 'Are you authorized to work in Scotland?',
    next: 'Are you authorized to work in the UK?',
    answer: 'Yes',
    yesNo: true,
  },
  accent: {
    saved: 'Where did you study in Montréal?',
    next: 'Where did you study in Montreal?',
    answer: 'Montreal',
    yesNo: false,
  },
}

const COUNTRY_NAMES = {
  US: 'United States',
  UK: 'United Kingdom',
  AE: 'United Arab Emirates',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  CZ: 'Czech Republic',
  KR: 'South Korea',
  HK: 'Hong Kong',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IN: 'India',
  IE: 'Ireland',
  NL: 'Netherlands',
  MX: 'Mexico',
  BR: 'Brazil',
  ES: 'Spain',
  IT: 'Italy',
  JP: 'Japan',
  CN: 'China',
  SG: 'Singapore',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  PL: 'Poland',
  PT: 'Portugal',
  AT: 'Austria',
  BE: 'Belgium',
  IL: 'Israel',
}

function initialState() {
  return {
    stage: 'profile',
    host: 'greenhouse',
    profile: {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-010-2030',
      linkedin: 'https://linkedin.com/in/ada',
      github: 'https://github.com/ada',
      website: 'https://ada.example',
    },
    pages: {
      greenhouse: { first: '', last: '', email: '', phone: '', linkedin: '', github: '', website: '' },
      lever: { name: '', email: '', phone: '', linkedin: '', github: '', portfolio: '' },
      next: {
        name: '',
        email: '',
        auth: '',
        uk: '',
        why: '',
        python: '',
        visa: '',
        veteran: '',
        shipped: 'A small local tool.',
      },
    },
    origins: { greenhouse: {}, lever: {}, next: {} },
    typed: { us: 'yes', sponsor: 'no', why: 'I like small tools.', python: '5' },
    found: false,
    keepOn: {},
    saved: [],
    keepNotice: '',
    reports: { profile: null, next: null },
  }
}

let state = initialState()

function el(tag, props, kids) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue
    if (key === 'class') node.className = value
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value)
    else if (key === 'checked' || key === 'selected' || key === 'value') node[key] = value
    else node.setAttribute(key, value === true ? '' : String(value))
  }
  appendKids(node, kids || [])
  return node
}

function appendKids(node, kids) {
  for (const kid of kids) {
    if (kid == null || kid === false) continue
    if (Array.isArray(kid)) appendKids(node, kid)
    else node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)))
  }
}

function announce(message) {
  const live = document.getElementById('live-status')
  if (live) live.textContent = message
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const first = parts[0] || ''
  if (parts.length < 2) return { first, last: '' }
  return { first, last: parts.slice(1).join(' ') }
}

function valueForSlot(slot) {
  const { first, last } = splitName(state.profile.fullName)
  switch (slot) {
    case 'email':
      return state.profile.email.trim()
    case 'phone':
      return state.profile.phone.trim()
    case 'linkedin':
      return state.profile.linkedin.trim()
    case 'github':
      return state.profile.github.trim()
    case 'website':
      return state.profile.website.trim()
    case 'firstName':
      return first
    case 'lastName':
      return last
    case 'fullName':
      return state.profile.fullName.trim()
    default:
      return ''
  }
}

function keepAnswer(key) {
  const raw = state.typed[key]
  if (key === 'us' || key === 'sponsor') {
    if (raw === 'yes') return 'Yes'
    if (raw === 'no') return 'No'
    return ''
  }
  return String(raw || '').trim()
}

function controlValue(field, answer) {
  if (field.control === 'radio' || field.control === 'select') {
    const canonical = String(answer).trim().toLowerCase()
    if (canonical === 'yes' || canonical === 'y' || canonical === 'true') return 'yes'
    if (canonical === 'no' || canonical === 'n' || canonical === 'false') return 'no'
    return ''
  }
  return String(answer)
}

function displayValue(field, stored) {
  if ((field.control === 'radio' || field.control === 'select') && (stored === 'yes' || stored === 'no')) {
    return stored === 'yes' ? 'Yes' : 'No'
  }
  return stored
}

function newestExact(label) {
  let found = null
  for (const answer of state.saved) {
    if (Match.judge(answer.question, label, false).kind === 'exact') found = answer
  }
  return found
}

function bestOf(label, yesNo, kind) {
  let best = null
  state.saved.forEach((answer, index) => {
    const result = Match.judge(answer.question, label, yesNo)
    if (result.kind !== kind) return
    const shared = result.shared.length
    if (!best || shared > best.shared || (shared === best.shared && index > best.index)) {
      best = { answer, result, shared, index }
    }
  })
  return best
}

function fillSummary(report) {
  const parts = []
  if (report.applied.length) parts.push(`Filled ${report.applied.length}.`)
  if (report.suggestions.length) {
    parts.push(`${report.suggestions.length} suggestion${report.suggestions.length === 1 ? '' : 's'} waiting.`)
  }
  if (report.conflicts.length) parts.push(`${report.conflicts.length} withheld.`)
  if (report.quiet.length) parts.push(`${report.quiet.length} not offered.`)
  if (report.skipped.length) parts.push(`${report.skipped.length} left alone.`)
  if (report.notes.length) parts.push(report.notes.join(' '))
  return parts.join(' ') || 'Nothing to write.'
}

function fillProfile(page, fields) {
  const applied = []
  const skipped = []
  const notes = []
  let mentionedLastName = false
  for (const field of fields) {
    const current = state.pages[page][field.key]
    const origin = state.origins[page][field.key]
    if (String(current).trim()) {
      if (origin && origin.value === current) {
        applied.push({ label: field.label, value: current, detail: origin.detail, tag: origin.tag })
      } else {
        skipped.push({ label: field.label, reason: 'already had an answer' })
      }
      continue
    }
    const value = valueForSlot(field.slot)
    if (!value) {
      if (field.slot === 'lastName' && !splitName(state.profile.fullName).last && !mentionedLastName) {
        notes.push('Last name left empty. A one-word name does not invent one.')
        mentionedLastName = true
      }
      continue
    }
    state.pages[page][field.key] = value
    const detail = SLOT_DETAIL[field.slot]
    state.origins[page][field.key] = { tag: 'Profile', detail, value }
    applied.push({ label: field.label, value, detail, tag: 'Profile' })
  }
  if (page === 'greenhouse') skipped.push({ label: 'Hidden field', reason: 'hidden' })
  state.reports.profile = { applied, suggestions: [], conflicts: [], quiet: [], skipped, notes }
  announce(fillSummary(state.reports.profile))
}

function fillNext(silent) {
  const applied = []
  const suggestions = []
  const skipped = []
  const conflicts = []
  const quiet = []
  const notes = []
  if (state.saved.length === 0) notes.push('Nothing is kept yet, so only profile fields can fill.')
  for (const field of NEXT) {
    const current = state.pages.next[field.key]
    const origin = state.origins.next[field.key]
    if (String(current).trim()) {
      if (origin && origin.value === current) {
        applied.push({
          label: field.label,
          value: displayValue(field, current),
          detail: origin.detail,
          tag: origin.tag,
        })
      } else {
        skipped.push({ label: field.label, reason: 'already had an answer' })
      }
      continue
    }
    if (field.slot) {
      const value = valueForSlot(field.slot)
      if (!value) continue
      state.pages.next[field.key] = value
      const detail = SLOT_DETAIL[field.slot]
      state.origins.next[field.key] = { tag: 'Profile', detail, value }
      applied.push({ label: field.label, value, detail, tag: 'Profile' })
      continue
    }
    const exact = newestExact(field.label)
    if (exact) {
      const stored = controlValue(field, exact.answer)
      if (!stored) {
        skipped.push({ label: field.label, reason: 'could not apply the saved answer' })
        continue
      }
      state.pages.next[field.key] = stored
      state.origins.next[field.key] = { tag: 'Exact', detail: exact.question, value: stored }
      applied.push({ label: field.label, value: displayValue(field, stored), detail: exact.question, tag: 'Exact' })
      continue
    }
    const suggestion = bestOf(field.label, Boolean(field.yesNo), 'suggestion')
    if (suggestion) {
      suggestions.push({
        key: field.key,
        label: field.label,
        value: suggestion.answer.answer,
        source: suggestion.answer.question,
      })
      continue
    }
    if (state.saved.length === 0) continue
    const conflict = bestOf(field.label, Boolean(field.yesNo), 'conflict')
    if (conflict) conflicts.push({ label: field.label, source: conflict.answer.question, result: conflict.result })
    else quiet.push(field.label)
  }
  state.reports.next = { applied, suggestions, conflicts, quiet, skipped, notes }
  if (!silent) announce(fillSummary(state.reports.next))
}

function accept(key) {
  const field = NEXT.find((item) => item.key === key)
  if (!field) return
  const suggestion = bestOf(field.label, Boolean(field.yesNo), 'suggestion')
  if (!suggestion) return
  const stored = controlValue(field, suggestion.answer.answer)
  if (!stored) return
  state.pages.next[key] = stored
  state.origins.next[key] = { tag: 'Accepted', detail: 'Accepted suggestion', value: stored }
  fillNext(true)
  announce(`Accepted ${field.label}.`)
  render('fill-button')
}

function findAnswers() {
  state.found = true
  announce('Review the questions, then save the ones you want kept.')
  render('collect-button')
}

function saveSelected() {
  state.saved = KEEP.map((item) => ({ question: item.question, answer: keepAnswer(item.key), key: item.key })).filter(
    (item) => item.answer && state.keepOn[item.key] !== false,
  )
  state.keepNotice = state.saved.length
    ? `Kept ${state.saved.length} for the next step on this page.`
    : 'Nothing kept. The next form can still fill the profile.'
  announce(state.keepNotice)
  render('save-answers')
}

function pageLabel() {
  if (state.stage === 'profile' && state.host === 'lever') return 'Support engineer · Lever'
  if (state.stage === 'next') return 'Later application'
  return 'Product engineer · Greenhouse'
}

function stageNote() {
  if (state.stage === 'profile') {
    return 'Fill writes empty profile slots from the panel. A value already on the form stays. Greenhouse splits the name. The Lever Name field gets the whole name, and Portfolio uses the website. Try a one-word name if you want Last name to stay empty.'
  }
  if (state.stage === 'keep') {
    return 'These are the custom questions from the Greenhouse demo, already answered. Find answers to save lists them in the panel. Profile fields are not in that list. Uncheck any answer you do not want kept.'
  }
  const base =
    'A later form. The same Why question can fill. The US wording can be a suggestion. The UK wording is withheld when a US answer is the near miss. A veteran question stays quiet. The project question already has an answer.'
  if (state.saved.length === 0) return `${base} Nothing is kept yet, so only the profile can fill.`
  return base
}

function onTabKey(event) {
  const order = ['profile', 'keep', 'next']
  const index = order.indexOf(state.stage)
  let next = null
  if (event.key === 'ArrowRight') next = order[(index + 1) % order.length]
  if (event.key === 'ArrowLeft') next = order[(index - 1 + order.length) % order.length]
  if (event.key === 'Home') next = order[0]
  if (event.key === 'End') next = order[order.length - 1]
  if (!next) return
  event.preventDefault()
  state.stage = next
  render(`tab-${next}`)
}

function render(focusId) {
  const root = document.getElementById('theater')
  if (!root) return
  root.replaceChildren(buildTheater())
  if (focusId) document.getElementById(focusId)?.focus()
}

function buildTheater() {
  const tabs = [
    ['profile', 'Profile'],
    ['keep', 'Keep an answer'],
    ['next', 'Next form'],
  ]
  return el('div', {}, [
    el(
      'div',
      { class: 'tabs', role: 'tablist', 'aria-label': 'Demonstration steps' },
      tabs
        .map(([id, label]) =>
          el(
            'button',
            {
              type: 'button',
              id: `tab-${id}`,
              role: 'tab',
              class: state.stage === id ? 'is-on' : '',
              'aria-selected': state.stage === id ? 'true' : 'false',
              'aria-controls': 'desk-panel',
              tabindex: state.stage === id ? '0' : '-1',
              onClick: () => {
                state.stage = id
                render(`tab-${id}`)
              },
              onKeydown: onTabKey,
            },
            [label],
          ),
        )
        .concat(
          el(
            'button',
            {
              type: 'button',
              class: 'linkish',
              id: 'start-over',
              onClick: () => {
                state = initialState()
                announce('Demonstration reset.')
                render('tab-profile')
              },
            },
            ['Start over'],
          ),
        ),
    ),
    el(
      'div',
      { class: 'blotter', id: 'desk-panel', role: 'tabpanel', 'aria-labelledby': `tab-${state.stage}` },
      [buildSheet(), buildPanel()],
    ),
    el('p', { class: 'stage-note', id: 'stage-note' }, [stageNote()]),
  ])
}

function buildSheet() {
  if (state.stage === 'keep') return buildKeepSheet()
  if (state.stage === 'next') return buildNextSheet()
  return buildProfileSheet()
}

function buildProfileSheet() {
  const lever = state.host === 'lever'
  const page = lever ? 'lever' : 'greenhouse'
  const fields = lever ? LEVER : GREENHOUSE
  return el('article', { class: 'sheet' }, [
    el('p', { class: 'kicker' }, [lever ? 'Lever-style demo' : 'Greenhouse-style demo']),
    el('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Application form' }, [
      hostButton('greenhouse', 'Greenhouse'),
      hostButton('lever', 'Lever'),
    ]),
    el('h3', {}, [lever ? 'Support engineer' : 'Product engineer']),
    el('p', { class: 'sheet-lead' }, [
      lever
        ? 'A stand-in for the Lever demo. Name is one field. Portfolio is the website.'
        : 'A stand-in for the Greenhouse demo. Nothing here is submitted.',
    ]),
    el('div', { class: 'fields compact' }, fields.map((field) => textField(page, field))),
    lever ? null : el('p', { class: 'note' }, ['A hidden field is on this form. Fill counts it and does not write it.']),
  ])
}

function hostButton(host, label) {
  return el(
    'button',
    {
      type: 'button',
      id: `host-${host}`,
      role: 'radio',
      'aria-checked': state.host === host ? 'true' : 'false',
      onClick: () => {
        state.host = host
        state.reports.profile = null
        render(`host-${host}`)
      },
    },
    [label],
  )
}

function textField(page, field) {
  return el('label', { class: field.wide ? 'wide' : '' }, [
    field.label,
    el('input', {
      id: `${page}-${field.key}`,
      type: field.type || 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      name: `localauto-demo-${page}-${field.key}`,
      value: state.pages[page][field.key],
      class: state.origins[page][field.key] ? 'is-filled' : '',
      onInput: (event) => rememberPage(page, field.key, event.currentTarget),
    }),
  ])
}

function rememberPage(page, key, node) {
  state.pages[page][key] = node.value
  const origin = state.origins[page][key]
  if (origin && origin.value !== node.value) delete state.origins[page][key]
  node.classList.toggle('is-filled', Boolean(state.origins[page][key]))
}

function buildKeepSheet() {
  return el('article', { class: 'sheet' }, [
    el('p', { class: 'kicker' }, ['Greenhouse-style demo']),
    el('h3', {}, ['Product engineer']),
    el('p', { class: 'sheet-lead' }, ['You typed these. Change an answer if you want the kept text to change.']),
    el('div', { class: 'fields' }, KEEP.map(keepControl)),
  ])
}

function keepControl(field) {
  const value = state.typed[field.key]
  if (field.control === 'radio') {
    return el('fieldset', { class: 'wide' }, [
      el('legend', {}, [field.question]),
      el('div', { class: 'choices' }, [
        yesNoChoice('keep', field.key, 'yes', 'Yes', value, (next) => {
          state.typed[field.key] = next
        }),
        yesNoChoice('keep', field.key, 'no', 'No', value, (next) => {
          state.typed[field.key] = next
        }),
      ]),
    ])
  }
  if (field.control === 'select') return questionSelect('keep', field.key, field.question, value, true)
  return el('label', { class: 'wide' }, [
    field.question,
    field.control === 'textarea'
      ? el('textarea', {
          id: `keep-${field.key}`,
          autocomplete: 'off',
          onInput: (event) => {
            state.typed[field.key] = event.currentTarget.value
            syncAnswer(field.key)
          },
        }, [value])
      : el('input', {
          id: `keep-${field.key}`,
          type: 'text',
          autocomplete: 'off',
          value,
          onInput: (event) => {
            state.typed[field.key] = event.currentTarget.value
            syncAnswer(field.key)
          },
        }),
  ])
}

function syncAnswer(key) {
  const slot = document.querySelector(`[data-answer-for="${key}"]`)
  if (slot) slot.textContent = keepAnswer(key) || 'Empty'
  const box = slot?.closest('label')?.querySelector('input[type="checkbox"]')
  if (box) box.disabled = !keepAnswer(key)
}

function yesNoChoice(scope, key, value, label, current, onPick) {
  return el('label', { class: 'choice' }, [
    el('input', {
      type: 'radio',
      name: `localauto-demo-${scope}-${key}`,
      value,
      checked: current === value,
      onChange: () => {
        onPick(value)
        if (scope === 'keep') syncAnswer(key)
        if (scope === 'next') {
          state.pages.next[key] = value
          const origin = state.origins.next[key]
          if (origin && origin.value !== value) delete state.origins.next[key]
        }
      },
    }),
    label,
  ])
}

function questionSelect(scope, key, label, value, typed) {
  const select = el('select', {
    id: `${scope}-${key}`,
    autocomplete: 'off',
    onChange: (event) => {
      const next = event.currentTarget.value
      if (typed) {
        state.typed[key] = next
        syncAnswer(key)
      } else {
        state.pages.next[key] = next
        const origin = state.origins.next[key]
        if (origin && origin.value !== next) delete state.origins.next[key]
      }
    },
  }, [
    el('option', { value: '', selected: value === '' }, ['Please select']),
    el('option', { value: 'yes', selected: value === 'yes' }, ['Yes']),
    el('option', { value: 'no', selected: value === 'no' }, ['No']),
  ])
  return el('label', { class: 'wide' }, [label, select])
}

function buildNextSheet() {
  return el('article', { class: 'sheet' }, [
    el('p', { class: 'kicker' }, ['Second form']),
    el('h3', {}, ['Later application']),
    el('p', { class: 'sheet-lead' }, [
      'Some questions match. Some only rhyme. The project question already has a value.',
    ]),
    el('div', { class: 'fields' }, NEXT.map(nextControl)),
  ])
}

function nextControl(field) {
  const value = state.pages.next[field.key]
  if (field.control === 'radio') {
    return el('fieldset', { class: 'wide' }, [
      el('legend', {}, [field.label]),
      el('div', { class: 'choices' }, [
        yesNoChoice('next', field.key, 'yes', 'Yes', value, () => {}),
        yesNoChoice('next', field.key, 'no', 'No', value, () => {}),
      ]),
    ])
  }
  if (field.control === 'select') return questionSelect('next', field.key, field.label, value, false)
  const control =
    field.control === 'textarea'
      ? el('textarea', {
          id: `next-${field.key}`,
          autocomplete: 'off',
          class: state.origins.next[field.key] ? 'is-filled' : '',
          onInput: (event) => rememberPage('next', field.key, event.currentTarget),
        }, [value])
      : el('input', {
          id: `next-${field.key}`,
          type: field.type || 'text',
          autocomplete: 'off',
          name: `localauto-demo-next-${field.key}`,
          value,
          class: state.origins.next[field.key] ? 'is-filled' : '',
          onInput: (event) => rememberPage('next', field.key, event.currentTarget),
        })
  return el('label', { class: 'wide' }, [field.label, control])
}

function buildPanel() {
  return el('aside', { class: 'sim', 'aria-label': 'Side panel demonstration' }, [
    el('header', {}, [
      el('div', { class: 'sim-head' }, [
        el('p', { class: 'sim-title' }, ['Localauto']),
        el('span', { class: 'sim-personality' }, ['Software engineer']),
      ]),
      el('p', { class: 'promise' }, ['Answers stay on this device. Nothing is sent to an account.']),
    ]),
    state.stage === 'keep' ? keepActions() : fillActions(),
    profileSection(),
  ])
}

function profileSection() {
  const fields = [
    ['fullName', 'Full name', 'text'],
    ['email', 'Email', 'email'],
    ['phone', 'Phone', 'tel'],
    ['linkedin', 'LinkedIn', 'url'],
    ['github', 'GitHub', 'url'],
    ['website', 'Website', 'url'],
  ]
  return el('div', { class: 'section' }, [
    el('h3', {}, ['Profile']),
    ...fields.map(([key, label, type]) =>
      el('label', {}, [
        label,
        el('input', {
          id: `profile-${key}`,
          type,
          autocomplete: 'off',
          spellcheck: 'false',
          name: `localauto-demo-profile-${key}`,
          value: state.profile[key],
          onInput: (event) => {
            state.profile[key] = event.currentTarget.value
          },
        }),
      ]),
    ),
    el('div', { class: 'chips' }, [
      el(
        'button',
        {
          type: 'button',
          id: 'try-full-name',
          onClick: () => {
            state.profile.fullName = 'Ada Lovelace'
            render('try-full-name')
          },
        },
        ['Ada Lovelace'],
      ),
      el(
        'button',
        {
          type: 'button',
          id: 'try-ada',
          onClick: () => {
            state.profile.fullName = 'Ada'
            render('try-ada')
          },
        },
        ['Ada'],
      ),
    ]),
    el('p', { class: 'meta' }, ['Examples for the name field.']),
  ])
}

function fillActions() {
  const report = state.stage === 'next' ? state.reports.next : state.reports.profile
  return el('div', {}, [
    el('div', { class: 'section' }, [
      el('h3', {}, ['This page']),
      el('p', { class: 'meta' }, [pageLabel()]),
      el(
        'button',
        {
          type: 'button',
          class: 'primary',
          id: 'fill-button',
          onClick: () => {
            if (state.stage === 'next') fillNext(false)
            else fillProfile(state.host, state.host === 'lever' ? LEVER : GREENHOUSE)
            render('fill-button')
          },
        },
        ['Fill empty fields'],
      ),
    ]),
    buildReport(report),
  ])
}

function keepActions() {
  const kids = [
    el('div', { class: 'section' }, [
      el('h3', {}, ['This page']),
      el('p', { class: 'meta' }, [pageLabel()]),
      el(
        'button',
        { type: 'button', class: 'secondary', id: 'collect-button', onClick: findAnswers },
        ['Find answers to save'],
      ),
    ]),
  ]
  if (state.found) {
    kids.push(
      el('div', { class: 'section' }, [
        el('h3', {}, ['Save answers']),
        el('p', { class: 'meta' }, ['Only checked questions are kept. On this page they last until you reload.']),
        ...KEEP.map((item) => {
          const answer = keepAnswer(item.key)
          return el('label', { class: 'check' }, [
            el('input', {
              type: 'checkbox',
              checked: state.keepOn[item.key] !== false && Boolean(answer),
              disabled: !answer,
              onChange: (event) => {
                state.keepOn[item.key] = event.currentTarget.checked
              },
            }),
            el('span', {}, [
              el('strong', {}, [item.question]),
              el('span', { class: 'value', 'data-answer-for': item.key }, [answer || 'Empty']),
            ]),
          ])
        }),
        el(
          'button',
          { type: 'button', class: 'primary', id: 'save-answers', onClick: saveSelected },
          ['Save selected'],
        ),
        state.keepNotice ? el('p', { class: 'notice', id: 'notice', role: 'status' }, [state.keepNotice]) : null,
      ]),
    )
  }
  return el('div', {}, kids)
}

function buildReport(report) {
  if (!report) return null
  const blocks = []
  if (report.applied.length) blocks.push(panelSection('Filled', report.applied.map(appliedCard)))
  if (report.suggestions.length) {
    blocks.push(
      panelSection('Suggestions', [
        el('p', { class: 'meta' }, ['These wordings differ. Nothing is filled until you accept.']),
        ...report.suggestions.map(suggestionCard),
      ]),
    )
  }
  if (report.conflicts.length) blocks.push(panelSection('Withheld', report.conflicts.map(conflictCard)))
  if (report.quiet.length) {
    blocks.push(
      panelSection(
        'Not offered',
        report.quiet.map((label) => el('p', { class: 'meta' }, [`${label} shares no significant word with a saved answer.`])),
      ),
    )
  }
  const left = leftAlone(report)
  if (left.length) blocks.push(panelSection('Left alone', left))
  if (report.notes.length) blocks.push(el('div', { class: 'section' }, report.notes.map((note) => el('p', { class: 'meta' }, [note]))))
  if (!blocks.length) blocks.push(el('p', { class: 'meta' }, ['Nothing to write.']))
  return el('div', { id: 'report' }, blocks)
}

function panelSection(title, kids) {
  return el('div', { class: 'section' }, [el('h3', {}, [title]), ...kids])
}

function appliedCard(item) {
  const tone = item.tag === 'Accepted' ? '' : item.tag.toLowerCase()
  return el('div', { class: 'report-card' }, [
    el('div', { class: 'report-top' }, [
      el('strong', {}, [item.label]),
      el('span', { class: tone ? `tag ${tone}` : 'tag' }, [item.tag]),
    ]),
    el('span', { class: 'value' }, [item.value]),
    el('em', { class: 'detail' }, [item.detail]),
  ])
}

function suggestionCard(item) {
  return el('div', { class: 'report-card' }, [
    el('div', { class: 'report-top' }, [
      el('strong', {}, [item.label]),
      el('span', { class: 'tag suggestion' }, ['Suggestion']),
    ]),
    el('em', { class: 'detail' }, [`From: ${item.source}`]),
    el('span', { class: 'value' }, [item.value]),
    el(
      'button',
      { type: 'button', class: 'primary slim', id: `accept-${item.key}`, onClick: () => accept(item.key) },
      ['Accept'],
    ),
  ])
}

function conflictCard(item) {
  return el('div', { class: 'report-card' }, [
    el('div', { class: 'report-top' }, [
      el('strong', {}, [item.label]),
      el('span', { class: 'tag conflict' }, ['Withheld']),
    ]),
    el('p', { class: 'meta' }, [`Near miss: ${item.source}`]),
    ...mismatchSentences(item.result).map((line) => el('p', { class: 'meta' }, [line])),
  ])
}

function leftAlone(report) {
  const lines = []
  const hidden = report.skipped.filter((item) => item.reason === 'hidden').length
  for (const item of report.skipped) {
    if (item.reason === 'hidden') continue
    lines.push(el('p', { class: 'meta' }, [`${item.label} ${item.reason}.`]))
  }
  if (hidden) lines.push(el('p', { class: 'meta' }, [`Skipped ${hidden} hidden field${hidden === 1 ? '' : 's'}.`]))
  return lines
}

function sameList(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function countryPhrase(codes) {
  if (!codes.length) return 'no country'
  return codes.map((code) => COUNTRY_NAMES[code] || code).join(', ')
}

function numberPhrase(numbers) {
  if (!numbers.length) return 'no number'
  return numbers.join(', ')
}

function mismatchSentences(result) {
  const lines = []
  if (!sameList(result.savedSlots.countries, result.nextSlots.countries)) {
    lines.push(
      `Countries do not agree. Saved: ${countryPhrase(result.savedSlots.countries)}. This question: ${countryPhrase(result.nextSlots.countries)}.`,
    )
  }
  if (!sameList(result.savedSlots.numbers, result.nextSlots.numbers)) {
    lines.push(
      `Numbers do not agree. Saved: ${numberPhrase(result.savedSlots.numbers)}. This question: ${numberPhrase(result.nextSlots.numbers)}.`,
    )
  }
  if (result.savedSlots.yesNo !== result.nextSlots.yesNo) {
    lines.push(result.savedSlots.yesNo ? 'The saved question is yes/no. This one is not.' : 'This question is yes/no. The saved one is not.')
  }
  return lines
}

function listWords(words) {
  if (words.length === 1) return words[0]
  if (words.length === 2) return `${words[0]} and ${words[1]}`
  return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`
}

function verdictCopy(result, answer) {
  if (result.kind === 'empty') return ['Type both questions.', 'The check runs when both sides have letters or numbers.']
  if (result.kind === 'exact') {
    const extra =
      result.savedSlots.yesNo !== result.nextSlots.yesNo
        ? ' The wording matches, so this fills even if the yes/no flags differ.'
        : ''
    return ['Fills on click.', `These match aside from case, accents, and punctuation.${extra}`]
  }
  if (result.kind === 'suggestion') {
    const offer = answer.trim() ? ` Would offer “${answer.trim()}”.` : ''
    return [
      'A suggestion, until you accept it.',
      `The slots agree, and they share ${listWords(result.shared)}. Fill will not write this.${offer}`,
    ]
  }
  if (result.kind === 'conflict') {
    return ['Withheld.', `${mismatchSentences(result).join(' ')} A conflict never becomes a suggestion.`]
  }
  if (!result.agree) return ['Not offered.', 'The slots do not agree, and the questions share no significant word.']
  const bothYes = result.savedSlots.yesNo && result.nextSlots.yesNo
  return [
    'Not offered.',
    bothYes
      ? 'The slots agree, including yes/no, but there is no significant word in common. Unrelated yes/no questions stay quiet.'
      : 'The slots agree, but there is no significant word in common.',
  ]
}

function canonicalNode(canonical, shared) {
  const node = el('p', { class: 'canonical' })
  if (!canonical) {
    node.textContent = '—'
    return node
  }
  const marks = new Set(shared)
  canonical.split(' ').forEach((word, index) => {
    if (index) node.append(' ')
    if (marks.has(word)) {
      const mark = document.createElement('mark')
      mark.textContent = word
      node.append(mark)
    } else node.append(word)
  })
  return node
}

function factList(slots) {
  return el('ul', { class: 'facts' }, [
    el('li', {}, [`Country: ${countryPhrase(slots.countries)}`]),
    el('li', {}, [`Numbers: ${slots.numbers.length ? slots.numbers.join(', ') : 'none'}`]),
    el('li', {}, [slots.yesNo ? 'Yes/no question' : 'Not a yes/no question']),
  ])
}

function renderLab(activePreset) {
  const saved = document.getElementById('saved-question')
  const next = document.getElementById('next-question')
  const answer = document.getElementById('saved-answer')
  const yesNo = document.getElementById('yesno-control')
  const verdict = document.getElementById('verdict')
  const breakdown = document.getElementById('breakdown')
  if (!saved || !next || !answer || !yesNo || !verdict || !breakdown) return
  const result = Match.judge(saved.value, next.value, yesNo.checked)
  const [title, body] = verdictCopy(result, answer.value)
  const tone = result.kind === 'exact' || result.kind === 'suggestion' || result.kind === 'conflict' ? result.kind : ''
  verdict.className = tone ? `verdict ${tone}` : 'verdict'
  verdict.replaceChildren(el('h3', {}, [title]), el('p', {}, [body]))
  breakdown.replaceChildren(
    el('div', {}, [el('h3', {}, ['Saved question']), canonicalNode(result.savedCanonical, result.shared), factList(result.savedSlots)]),
    el('div', {}, [el('h3', {}, ['This question']), canonicalNode(result.nextCanonical, result.shared), factList(result.nextSlots)]),
    el('p', { class: 'shared-line' }, [result.shared.length ? `Shared words: ${listWords(result.shared)}.` : 'No shared significant word.']),
  )
  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.setAttribute('aria-pressed', button.getAttribute('data-preset') === activePreset ? 'true' : 'false')
  })
}

function initLab() {
  const saved = document.getElementById('saved-question')
  const next = document.getElementById('next-question')
  const answer = document.getElementById('saved-answer')
  const yesNo = document.getElementById('yesno-control')
  const refresh = () => renderLab('')
  saved.addEventListener('input', refresh)
  next.addEventListener('input', refresh)
  answer.addEventListener('input', refresh)
  yesNo.addEventListener('change', refresh)
  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = PRESETS[button.getAttribute('data-preset')]
      saved.value = preset.saved
      next.value = preset.next
      answer.value = preset.answer
      yesNo.checked = preset.yesNo
      renderLab(button.getAttribute('data-preset'))
    })
  })
  renderLab('us')
}

function initPeople() {
  const buttons = [...document.querySelectorAll('[data-personality]')]
  function select(id, focus) {
    for (const button of buttons) {
      const on = button.getAttribute('data-personality') === id
      button.setAttribute('aria-checked', on ? 'true' : 'false')
      if (on && focus) button.focus()
    }
    document.querySelectorAll('[data-person]').forEach((card) => {
      card.classList.toggle('is-on', card.getAttribute('data-person') === id)
    })
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button.getAttribute('data-personality'), false))
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
      event.preventDefault()
      const nextIndex = event.key === 'ArrowRight' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length
      select(buttons[nextIndex].getAttribute('data-personality'), true)
    })
  })
}

function initCopy() {
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const text = document.getElementById(button.getAttribute('data-copy'))?.innerText || ''
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.left = '-999px'
        document.body.append(area)
        area.select()
        document.execCommand('copy')
        area.remove()
      }
      const previous = button.textContent
      button.textContent = 'Copied'
      window.setTimeout(() => {
        button.textContent = previous
      }, 1400)
    })
  })
}

function initChrome() {
  const bar = document.getElementById('progress')
  const links = [...document.querySelectorAll('a[data-nav]')]
  const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean)
  function onScroll() {
    const root = document.documentElement
    const max = root.scrollHeight - root.clientHeight
    if (bar) bar.style.transform = `scaleX(${max > 0 ? root.scrollTop / max : 0})`
    const y = root.scrollTop + 120
    let current = sections[0]
    for (const section of sections) {
      if (section.offsetTop <= y) current = section
    }
    for (const link of links) {
      if (current && link.getAttribute('href') === `#${current.id}`) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    }
  }
  document.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

function init() {
  if (!Match) {
    const theater = document.getElementById('theater')
    if (theater) theater.textContent = 'The rule checker did not load.'
    return
  }
  render()
  initLab()
  initPeople()
  initCopy()
  initChrome()
}

init()
