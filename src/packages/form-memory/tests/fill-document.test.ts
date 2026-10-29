import { describe, expect, test } from 'vitest'
import { acceptSuggestion, collectSaveCandidates, fillDocument, mergeFrameFills, rememberAnswers } from '../index'
import { addPersonality, emptyProfile, writeActiveProfile } from '../memory'
import { ada, loadDemo, memory, mount, radioValue, saved, textField } from './fixtures'

describe('profile fill', () => {
  test('fills name, email, phone, and links on a Greenhouse form after an explicit fill', () => {
    const doc = loadDemo('greenhouse.html')
    const outcome = fillDocument(doc, memory({ profile: ada }), 'job-boards.greenhouse.io')

    expect(outcome.status).toBe('filled')
    expect(textField(doc, 'first_name').value).toBe('Ada')
    expect(textField(doc, 'last_name').value).toBe('Lovelace')
    expect(textField(doc, 'email').value).toBe('ada@example.com')
    expect(textField(doc, 'phone').value).toBe('555-010-2030')
    expect(textField(doc, 'linkedin').value).toBe('https://linkedin.com/in/ada')
    expect(textField(doc, 'github').value).toBe('https://github.com/ada')
    expect(textField(doc, 'website').value).toBe('https://ada.example')
    expect(textField(doc, 'why').value).toBe('')
    expect(doc.querySelector<HTMLInputElement>('input[name="honeypot"]')?.value).toBe('')
    expect(outcome.status === 'filled' && outcome.report.applied.map((item) => item.detail)).toEqual([
      'Profile first name',
      'Profile last name',
      'Profile email',
      'Profile phone',
      'Profile LinkedIn',
      'Profile GitHub',
      'Profile website',
    ])
  })

  test('puts a single name field on Lever into the full name', () => {
    const doc = loadDemo('lever.html')
    fillDocument(doc, memory({ profile: ada }), 'jobs.lever.co')

    expect(textField(doc, 'name').value).toBe('Ada Lovelace')
    expect(textField(doc, 'portfolio').value).toBe('https://ada.example')
  })

  test('fills the personality selected above the profile', () => {
    const selected = writeActiveProfile(addPersonality(memory({ profile: ada }), 'Campus'), {
      ...emptyProfile(),
      fullName: 'Grace Hopper',
      email: 'grace@navy.example',
      phone: '555-010-9999',
      linkedin: '',
      github: '',
      website: '',
    })
    const doc = loadDemo('lever.html')
    fillDocument(doc, selected, 'jobs.lever.co')

    expect(textField(doc, 'name').value).toBe('Grace Hopper')
    expect(textField(doc, 'email').value).toBe('grace@navy.example')
    expect(textField(doc, 'phone').value).toBe('555-010-9999')
  })

  test('leaves last name empty when the profile has one name', () => {
    const doc = loadDemo('greenhouse.html')
    fillDocument(doc, memory({ profile: { ...ada, fullName: 'Ada' } }), 'boards.greenhouse.io')
    expect(textField(doc, 'first_name').value).toBe('Ada')
    expect(textField(doc, 'last_name').value).toBe('')
  })

  test('does not fill a long question just because it mentions email', () => {
    const doc = mount(`
      <label for="email">Email</label>
      <input id="email" type="email" />
      <label for="manager">What is your manager's email address?</label>
      <input id="manager" name="manager_contact" type="text" />
    `)
    fillDocument(doc, memory({ profile: ada }), 'localhost')
    expect(textField(doc, 'email').value).toBe('ada@example.com')
    expect(textField(doc, 'manager').value).toBe('')
  })
})

describe('safety', () => {
  test('skips hidden, password, and payment fields', () => {
    const doc = mount(`
      <label for="email">Email</label>
      <input id="email" type="email" />
      <label for="card">Credit card number</label>
      <input id="card" name="cc-number" autocomplete="cc-number" />
      <label for="pw">Password</label>
      <input id="pw" type="password" />
      <div style="display:none"><label for="secret">Secret</label><input id="secret" /></div>
      <div hidden><label for="buried">Buried</label><input id="buried" /></div>
      <input type="hidden" name="honeypot" value="" />
    `)
    const outcome = fillDocument(doc, memory({ profile: ada }), 'localhost')

    expect(textField(doc, 'email').value).toBe('ada@example.com')
    expect(textField(doc, 'card').value).toBe('')
    expect(textField(doc, 'pw').value).toBe('')
    expect(textField(doc, 'secret').value).toBe('')
    expect(textField(doc, 'buried').value).toBe('')
    expect(doc.querySelector<HTMLInputElement>('input[name="honeypot"]')?.value).toBe('')
    expect(outcome.status === 'filled' && outcome.report.skipped.map((item) => item.reason)).toEqual([
      'payment',
      'password',
      'hidden',
      'hidden',
      'hidden',
    ])
  })

  test('does not overwrite a value already on the page', () => {
    const doc = loadDemo('greenhouse.html')
    textField(doc, 'email').value = 'kept@example.com'
    const outcome = fillDocument(doc, memory({ profile: ada }), 'localhost')
    expect(textField(doc, 'email').value).toBe('kept@example.com')
    expect(outcome.status === 'filled' && outcome.report.skipped.some((item) => item.reason === 'already-filled')).toBe(true)
  })

  test('writes text through the native value setter and dispatches input and change', () => {
    const doc = mount('<label for="email">Email</label><input id="email" type="email" />')
    const input = textField(doc, 'email')
    const events: string[] = []
    input.addEventListener('input', () => events.push('input'))
    input.addEventListener('change', () => events.push('change'))
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    if (!descriptor?.set || !descriptor.get) throw new Error('missing value setter')
    let setterCalled = false
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
      configurable: true,
      get() {
        return descriptor.get?.call(this)
      },
      set(value: string) {
        setterCalled = true
        descriptor.set?.call(this, value)
      },
    })
    try {
      fillDocument(doc, memory({ profile: ada }), 'localhost')
      expect(setterCalled).toBe(true)
      expect(input.value).toBe('ada@example.com')
      expect(events).toEqual(['input', 'change'])
    } finally {
      Object.defineProperty(HTMLInputElement.prototype, 'value', descriptor)
    }
  })

  test('a paused application host does not change the page', () => {
    const doc = loadDemo('greenhouse.html')
    const outcome = fillDocument(doc, memory({ profile: ada, enabledHosts: { greenhouse: false } }), 'boards.greenhouse.io')
    expect(outcome).toEqual({ status: 'paused', host: 'greenhouse' })
    expect(textField(doc, 'email').value).toBe('')
  })

  test('any other website fills from the same profile', () => {
    const doc = loadDemo('greenhouse.html')
    const outcome = fillDocument(doc, memory({ profile: ada, enabledHosts: { greenhouse: false } }), 'jobs.ashbyhq.com')
    expect(outcome).toMatchObject({ status: 'filled', host: 'jobs.ashbyhq.com' })
    expect(textField(doc, 'email').value).toBe('ada@example.com')
  })

  test('a value that is not a website does not change the page', () => {
    const doc = loadDemo('greenhouse.html')
    const outcome = fillDocument(doc, memory({ profile: ada }), 'not a host')
    expect(outcome).toEqual({ status: 'unsupported' })
    expect(textField(doc, 'email').value).toBe('')
  })
})

describe('exact reuse', () => {
  test('fills a saved answer when the question differs only by case and punctuation', () => {
    const doc = loadDemo('greenhouse.html')
    const outcome = fillDocument(
      doc,
      memory({ answers: [saved('Why do you want this role???', 'Because the work is local.')] }),
      'localhost',
    )
    expect(textField(doc, 'why').value).toBe('Because the work is local.')
    expect(outcome.status === 'filled' && outcome.report.applied[0]?.via).toBe('exact')
  })

  test('selects the matching option for an exact yes/no question', () => {
    const doc = loadDemo('greenhouse.html')
    fillDocument(
      doc,
      memory({ answers: [saved('Will you now or in the future require sponsorship?', 'No')] }),
      'localhost',
    )
    expect(doc.querySelector<HTMLSelectElement>('#sponsor')?.value).toBe('no')
  })

  test('a confirmed answer fills the same question on the next form', () => {
    const first = loadDemo('lever.html')
    const why = first.querySelector('textarea')
    if (!(why instanceof HTMLTextAreaElement)) throw new Error('missing question')
    why.value = 'Because the work is local.'
    const candidates = collectSaveCandidates(first)
    expect(candidates.map((item) => item.question)).toEqual(['Why do you want this role?'])
    const answers = rememberAnswers([], candidates, { now: 10, host: 'jobs.lever.co', newId: () => 'answer-1' })

    const second = loadDemo('greenhouse.html')
    fillDocument(second, memory({ answers }), 'boards.greenhouse.io')
    expect(textField(second, 'why').value).toBe('Because the work is local.')
  })

  test('does not save profile fields as answers', () => {
    const doc = loadDemo('greenhouse.html')
    textField(doc, 'email').value = 'ada@example.com'
    textField(doc, 'why').value = 'Because the work is local.'
    expect(collectSaveCandidates(doc).map((item) => item.question)).toEqual(['Why do you want this role?'])
  })
})

describe('suggestions', () => {
  test('offers a US paraphrase and does not apply it until accepted', () => {
    const doc = loadDemo('return-visit.html')
    const outcome = fillDocument(
      doc,
      memory({
        answers: [saved('Are you authorized to work in the United States?', 'Yes')],
      }),
      'localhost',
    )
    expect(radioValue(doc, 'auth')).toBe('')
    expect(radioValue(doc, 'uk')).toBe('')
    expect(outcome.status === 'filled' && outcome.report.suggestions.map((item) => item.label)).toEqual([
      'Are you legally authorised to work in the US?',
    ])
    const suggestion = outcome.status === 'filled' ? outcome.report.suggestions[0] : undefined
    expect(suggestion?.value).toBe('Yes')
    expect(suggestion?.sourceQuestion).toBe('Are you authorized to work in the United States?')
    expect(suggestion && acceptSuggestion(doc, suggestion.fieldId, suggestion.value, suggestion.label)).toBe(true)
    expect(radioValue(doc, 'auth')).toBe('yes')
    expect(radioValue(doc, 'uk')).toBe('')
  })

  test('does not suggest a country conflict or an unrelated yes/no question', () => {
    const doc = loadDemo('return-visit.html')
    const outcome = fillDocument(
      doc,
      memory({
        answers: [
          saved('Are you authorized to work in the United States?', 'Yes'),
          saved('Are you willing to relocate?', 'Yes', 2, 'relocate'),
        ],
      }),
      'localhost',
    )
    const labels = outcome.status === 'filled' ? outcome.report.suggestions.map((item) => item.label) : []
    expect(labels).not.toContain('Are you authorized to work in the UK?')
    expect(labels).not.toContain('Are you a veteran?')
  })

  test('suggests a number-free paraphrase and refuses a number conflict', () => {
    const years = fillDocument(
      loadDemo('return-visit.html'),
      memory({ answers: [saved('How many years of Python experience do you have?', '5')] }),
      'localhost',
    )
    expect(years.status === 'filled' && years.report.suggestions.map((item) => [item.label, item.value])).toEqual([
      ['Years of Python experience', '5'],
    ])

    const conflict = mount(`
      <label for="years">Do you have 10 years of Python experience?</label>
      <input id="years" type="text" />
    `)
    const outcome = fillDocument(
      conflict,
      memory({ answers: [saved('Do you have 5 years of Python experience?', 'Yes')] }),
      'localhost',
    )
    expect(textField(conflict, 'years').value).toBe('')
    expect(outcome.status === 'filled' && outcome.report.suggestions).toEqual([])
  })

  test('does not treat the word us in "tell us" as the United States', () => {
    const doc = mount(`
      <label for="project">Tell us about your work in the United States</label>
      <textarea id="project"></textarea>
      <label for="plain">Tell us about yourself</label>
      <textarea id="plain"></textarea>
    `)
    const mistaken = fillDocument(doc, memory({ answers: [saved('Tell us about yourself', 'I like small tools.')] }), 'localhost')
    expect(textField(doc, 'project').value).toBe('')
    expect(mistaken.status === 'filled' && mistaken.report.suggestions).toEqual([])

    const docAgain = mount(`
      <label for="project">Tell us about your work in the United States</label>
      <textarea id="project"></textarea>
    `)
    const outcome = fillDocument(
      docAgain,
      memory({ answers: [saved('Tell us about your work in the US', 'I like small tools.')] }),
      'localhost',
    )
    expect(textField(docAgain, 'project').value).toBe('')
    expect(outcome.status === 'filled' && outcome.report.suggestions.map((item) => item.value)).toEqual(['I like small tools.'])
  })

  test('does not suggest across fields that share only a word like "current"', () => {
    const doc = mount(`
      <label for="location">Current location</label>
      <input id="location" />
      <label for="salary">Desired salary</label>
      <input id="salary" />
    `)
    const outcome = fillDocument(
      doc,
      memory({ answers: [saved('Current company', 'Analytical Engines'), saved('Expected salary', '120000', 2)] }),
      'localhost',
    )
    expect(outcome.status === 'filled' && outcome.report.suggestions.map((item) => [item.label, item.sourceQuestion])).toEqual([
      ['Desired salary', 'Expected salary'],
    ])
  })

  test('suggests a sponsorship paraphrase without selecting it', () => {
    const doc = loadDemo('return-visit.html')
    const outcome = fillDocument(
      doc,
      memory({ answers: [saved('Will you now or in the future require sponsorship?', 'No')] }),
      'localhost',
    )
    expect(doc.querySelector<HTMLSelectElement>('#visa')?.value).toBe('')
    const suggestion = outcome.status === 'filled' ? outcome.report.suggestions.find((item) => item.label.includes('visa')) : undefined
    expect(suggestion?.value).toBe('No')
  })

  test('suggests when the new control is yes/no even if the legend does not start with a question word', () => {
    const doc = mount(`
      <div class="field">
        <label>Work authorization in the United States</label>
        <label><input type="radio" name="auth" value="yes" /> Yes</label>
        <label><input type="radio" name="auth" value="no" /> No</label>
      </div>
    `)
    const outcome = fillDocument(
      doc,
      memory({ answers: [saved('Are you authorized to work in the United States?', 'Yes')] }),
      'localhost',
    )
    expect(radioValue(doc, 'auth')).toBe('')
    expect(outcome.status === 'filled' && outcome.report.suggestions).toHaveLength(1)
  })
})

describe('frames', () => {
  test('merges fills from more than one frame and keeps the frame on each suggestion', () => {
    const top = fillDocument(loadDemo('lever.html'), memory({ profile: ada }), 'jobs.lever.co')
    const frame = fillDocument(
      loadDemo('return-visit.html'),
      memory({ answers: [saved('Are you authorized to work in the United States?', 'Yes')] }),
      'jobs.lever.co',
    )
    const merged = mergeFrameFills([
      { frameId: 0, outcome: top },
      { frameId: 7, outcome: frame },
    ])
    expect(merged.status).toBe('filled')
    expect(merged.applied.some((item) => item.value === 'ada@example.com')).toBe(true)
    expect(merged.suggestions.every((item) => item.frameId === 7)).toBe(true)
    expect(mergeFrameFills([])).toEqual({ status: 'unsupported', host: null, applied: [], suggestions: [], skipped: [] })
    expect(mergeFrameFills([{ frameId: 0, outcome: { status: 'paused', host: 'lever' } }]).status).toBe('paused')
  })
})
