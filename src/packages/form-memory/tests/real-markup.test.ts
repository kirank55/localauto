import { describe, expect, test } from 'vitest'
import { acceptSuggestion, collectSaveCandidates, fillDocument } from '../index'
import { installChoiceBridge } from '../page-bridge'
import { ada, loadDemo, memory, mount, radioValue, saved, textField } from './fixtures'

function boxes(doc: Document, name: string): HTMLInputElement[] {
  return [...doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].filter((input) => input.name === name)
}

function checked(doc: Document, name: string): string[] {
  return boxes(doc, name)
    .filter((input) => input.checked)
    .map((input) => input.value)
}

function check(doc: Document, name: string, value: string): void {
  const box = boxes(doc, name).find((input) => input.value === value)
  if (!box) throw new Error(`missing ${name}=${value}`)
  box.checked = true
}

/** A react-select combobox as Greenhouse renders it, with the component reachable the way React exposes it. */
function mountChoice(question: string, options: string[]): { doc: Document; picked: string[] } {
  const doc = mount(`
    <div class="select__container">
      <label id="relocate-label" for="relocate">${question} <span aria-hidden="true">*</span></label>
      <div class="select__control">
        <div class="select__value-container">
          <div class="select__placeholder">Select...</div>
          <div class="select__input-container" data-value="">
            <input id="relocate" class="select__input" role="combobox" aria-autocomplete="list" aria-labelledby="relocate-label" />
          </div>
        </div>
      </div>
      <input required tabindex="-1" aria-hidden="true" value="" />
    </div>
  `)
  const input = doc.getElementById('relocate')
  if (!input) throw new Error('missing combobox')
  const picked: string[] = []
  const instance = {
    props: {
      options: options.map((label) => ({ label, value: label.toLowerCase() })),
      getOptionLabel: (option: { label: string }) => option.label,
      getOptionValue: (option: { value: string }) => option.value,
    },
    selectOption(option: { label: string }) {
      picked.push(option.label)
      const single = doc.createElement('div')
      single.className = 'select__single-value'
      single.textContent = option.label
      doc.querySelector('.select__placeholder')?.replaceWith(single)
    },
  }
  Object.assign(input, { '__reactFiber$test': { stateNode: null, return: { stateNode: instance, return: null } } })
  return { doc, picked }
}

describe('Lever application markup', () => {
  test('reads each question once, without the required star, the help text, or the location dropdown', () => {
    const doc = loadDemo('lever.html')
    textField(doc, 'location').value = 'London'
    textField(doc, 'org').value = 'Analytical Engines'
    check(doc, 'cards[demo][field0]', 'Yes')
    check(doc, 'cards[demo][field1]', 'Support')
    check(doc, 'cards[demo][field1]', 'Tools, infrastructure, and data')
    const why = doc.querySelector('textarea')
    if (!why) throw new Error('missing textarea')
    why.value = 'Because the work is local.'

    expect(collectSaveCandidates(doc).map((item) => [item.question, item.answer])).toEqual([
      ['Current location', 'London'],
      ['Current company', 'Analytical Engines'],
      ['Are you eligible to work in the United States?', 'Yes'],
      ['Which teams interest you?', 'Support, Tools, infrastructure, and data'],
      ['Why do you want this role?', 'Because the work is local.'],
    ])
  })

  test('reports profile fills under the label the page shows', () => {
    const outcome = fillDocument(loadDemo('lever.html'), memory({ profile: ada }), 'jobs.lever.co')
    expect(outcome.status === 'filled' && outcome.report.applied.map((item) => item.label)).toEqual([
      'Full name',
      'Email',
      'Phone',
      'LinkedIn URL',
      'GitHub URL',
      'Portfolio URL',
    ])
  })

  test('a saved checkbox answer checks the boxes it names, including a choice with commas in it', () => {
    const doc = loadDemo('lever.html')
    const outcome = fillDocument(
      doc,
      memory({
        answers: [
          saved('Are you eligible to work in the United States?', 'Yes'),
          saved('Which teams interest you?', 'Support, Tools, infrastructure, and data', 2),
        ],
      }),
      'jobs.lever.co',
    )
    expect(checked(doc, 'cards[demo][field0]')).toEqual(['Yes'])
    expect(checked(doc, 'cards[demo][field1]')).toEqual(['Support', 'Tools, infrastructure, and data'])
    expect(outcome.status === 'filled' && outcome.report.applied.map((item) => item.detail)).toEqual(['Saved answer', 'Saved answer'])
  })

  test('a checkbox answer that is not one of the choices checks nothing', () => {
    const doc = loadDemo('lever.html')
    const outcome = fillDocument(doc, memory({ answers: [saved('Which teams interest you?', 'Support, Sales')] }), 'jobs.lever.co')
    expect(checked(doc, 'cards[demo][field1]')).toEqual([])
    expect(outcome.status === 'filled' && outcome.report.skipped).toContainEqual({
      label: 'Which teams interest you?',
      reason: 'unusable',
    })
  })

  test('a yes/no checkbox card is offered a paraphrase and checks it on Accept', () => {
    const doc = loadDemo('lever.html')
    const outcome = fillDocument(
      doc,
      memory({ answers: [saved('Are you legally authorised to work in the US?', 'Yes')] }),
      'jobs.lever.co',
    )
    const suggestion = outcome.status === 'filled' ? outcome.report.suggestions[0] : undefined
    expect(suggestion?.label).toBe('Are you eligible to work in the United States?')
    expect(checked(doc, 'cards[demo][field0]')).toEqual([])
    expect(suggestion && acceptSuggestion(doc, suggestion.fieldId, suggestion.value, suggestion.label)).toBe(true)
    expect(checked(doc, 'cards[demo][field0]')).toEqual(['Yes'])
  })
})

describe('react-select comboboxes', () => {
  test('an exact saved answer picks the option through the page bridge', () => {
    const { doc, picked } = mountChoice('Are you open to relocation for this role?', ['Yes', 'No'])
    const uninstall = installChoiceBridge(doc)
    try {
      const outcome = fillDocument(
        doc,
        memory({ profile: ada, answers: [saved('Are you open to relocation for this role?', 'No')] }),
        'job-boards.greenhouse.io',
      )
      expect(picked).toEqual(['No'])
      expect(outcome.status === 'filled' && outcome.report.applied.map((item) => [item.label, item.value])).toEqual([
        ['Are you open to relocation for this role?', 'No'],
      ])
      expect(textField(doc, 'relocate').value).toBe('')
    } finally {
      uninstall()
    }
  })

  test('review reads the option on show, not the empty search box', () => {
    const { doc } = mountChoice('Are you open to relocation for this role?', ['Yes', 'No'])
    const uninstall = installChoiceBridge(doc)
    try {
      fillDocument(doc, memory({ answers: [saved('Are you open to relocation for this role?', 'Yes')] }), 'localhost')
      expect(collectSaveCandidates(doc)).toEqual([
        { fieldId: 'relocate', question: 'Are you open to relocation for this role?', answer: 'Yes' },
      ])
    } finally {
      uninstall()
    }
  })

  test('a combobox the bridge cannot reach is reported as not filled, and nothing is typed into it', () => {
    const { doc, picked } = mountChoice('Are you open to relocation for this role?', ['Yes', 'No'])
    const outcome = fillDocument(doc, memory({ answers: [saved('Are you open to relocation for this role?', 'Yes')] }), 'localhost')
    expect(picked).toEqual([])
    expect(textField(doc, 'relocate').value).toBe('')
    expect(outcome.status === 'filled' && outcome.report.applied).toEqual([])
    expect(outcome.status === 'filled' && outcome.report.skipped).toContainEqual({
      label: 'Are you open to relocation for this role?',
      reason: 'unusable',
    })
  })

  test('an answer that is not one of the options is not picked', () => {
    const { doc, picked } = mountChoice('Are you open to relocation for this role?', ['Yes', 'No'])
    const uninstall = installChoiceBridge(doc)
    try {
      fillDocument(doc, memory({ answers: [saved('Are you open to relocation for this role?', 'Maybe later')] }), 'localhost')
      expect(picked).toEqual([])
    } finally {
      uninstall()
    }
  })

  test('a yes/no combobox gets a suggestion even when its label is not a question', () => {
    const { doc, picked } = mountChoice('Relocation', ['Yes', 'No'])
    const uninstall = installChoiceBridge(doc)
    try {
      const outcome = fillDocument(doc, memory({ answers: [saved('Are you willing to relocation?', 'Yes')] }), 'localhost')
      const suggestion = outcome.status === 'filled' ? outcome.report.suggestions[0] : undefined
      expect(suggestion?.value).toBe('Yes')
      expect(picked).toEqual([])
      expect(suggestion && acceptSuggestion(doc, suggestion.fieldId, suggestion.value, suggestion.label)).toBe(true)
      expect(picked).toEqual(['Yes'])
    } finally {
      uninstall()
    }
  })
})

describe('accepting a suggestion', () => {
  test('does nothing when the field with that id now asks something else', () => {
    const first = loadDemo('return-visit.html')
    const outcome = fillDocument(
      first,
      memory({ answers: [saved('How many years of Python experience do you have?', '5')] }),
      'localhost',
    )
    const suggestion = outcome.status === 'filled' ? outcome.report.suggestions[0] : undefined
    expect(suggestion?.fieldId).toBe('python')

    const next = mount('<label for="python">What is your expected salary?</label><input id="python" name="python" />')
    expect(suggestion && acceptSuggestion(next, suggestion.fieldId, suggestion.value, suggestion.label)).toBe(false)
    expect(textField(next, 'python').value).toBe('')
  })

  test('still applies on the page it was offered for', () => {
    const doc = loadDemo('return-visit.html')
    const outcome = fillDocument(
      doc,
      memory({ answers: [saved('Are you authorized to work in the United States?', 'Yes')] }),
      'localhost',
    )
    const suggestion = outcome.status === 'filled' ? outcome.report.suggestions[0] : undefined
    expect(suggestion && acceptSuggestion(doc, suggestion.fieldId, suggestion.value, suggestion.label)).toBe(true)
    expect(radioValue(doc, 'auth')).toBe('yes')
  })
})

describe('framework-controlled choices', () => {
  test('radios and checkboxes are clicked, so a page that listens for click sees the change', () => {
    const doc = mount(`
      <div class="field">
        <label>What is your current age range?</label>
        <label><input type="radio" name="age" value="under-30" /> Under 30</label>
        <label><input type="radio" name="age" value="30-39" /> 30-39</label>
      </div>
      <label><input type="checkbox" id="remote" name="remote" /> Open to remote work?</label>
    `)
    const clicks: string[] = []
    doc.addEventListener('click', (event) => {
      if (event.target instanceof HTMLInputElement) clicks.push(event.target.value === 'on' ? event.target.name : event.target.value)
    })
    fillDocument(
      doc,
      memory({ answers: [saved('What is your current age range?', '30-39'), saved('Open to remote work?', 'Yes', 2)] }),
      'jobs.ashbyhq.com',
    )
    expect(clicks).toEqual(['30-39', 'remote'])
    expect(radioValue(doc, 'age')).toBe('30-39')
    expect(doc.querySelector<HTMLInputElement>('#remote')?.checked).toBe(true)
  })
})

describe('question text', () => {
  test('drops a hidden star and an (Optional) tag, so the same question matches on another board', () => {
    const doc = mount(`
      <label for="pref">(Optional) Personal Preferences</label>
      <input id="pref" />
      <label for="start">When can you start? <span aria-hidden="true">*</span></label>
      <input id="start" />
    `)
    textField(doc, 'pref').value = 'Remote'
    textField(doc, 'start').value = 'June'
    expect(collectSaveCandidates(doc).map((item) => item.question)).toEqual(['Personal Preferences', 'When can you start?'])
  })
})
