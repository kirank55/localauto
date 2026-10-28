import { describe, expect, test } from 'vitest'
import { activeProfile } from '../memory'
import { mergeSubmitOffer, parseSubmitOffer, profileFromForm, readSubmittedProfileMessage } from '../submit'
import { ada, loadDemo, memory, textField } from './fixtures'

describe('submit offer', () => {
  test('the submit demo offers name and email, and leaves the written answer and password out', () => {
    const doc = loadDemo('submit.html')
    const form = doc.getElementById('application')
    if (!(form instanceof HTMLFormElement)) throw new Error('missing submit demo form')
    textField(doc, 'full-name').value = 'Ada Lovelace'
    textField(doc, 'email').value = 'ada@example.com'
    textField(doc, 'why').value = 'Because it stays here.'
    const password = doc.getElementById('password')
    if (password instanceof HTMLInputElement) password.value = 'secret'

    expect(profileFromForm(form)).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
    })
  })

  test('a first and last name become the full name', () => {
    const doc = loadDemo('greenhouse.html')
    const form = doc.getElementById('application-form')
    if (!(form instanceof HTMLFormElement)) throw new Error('missing greenhouse form')
    textField(doc, 'first_name').value = 'Ada'
    textField(doc, 'last_name').value = 'Lovelace'
    textField(doc, 'email').value = 'ada@example.com'

    expect(profileFromForm(form)).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
    })
  })

  test('merges offered keys onto the selected personality and leaves the rest', () => {
    const next = mergeSubmitOffer(memory({ profile: ada }), { email: 'grace@example.com', phone: '  ' })
    expect(activeProfile(next)).toEqual({ ...ada, email: 'grace@example.com' })
  })

  test('parses an offer and drops an empty profile', () => {
    expect(
      parseSubmitOffer({
        heardAt: 10,
        title: 'Submit listener demo',
        href: 'http://127.0.0.1:4173/submit.html',
        tabId: 4,
        windowId: 1,
        profile: { email: ' ada@example.com ', github: '', resume: 'nope' },
      }),
    ).toEqual({
      heardAt: 10,
      title: 'Submit listener demo',
      href: 'http://127.0.0.1:4173/submit.html',
      tabId: 4,
      windowId: 1,
      profile: { email: 'ada@example.com' },
    })
    expect(parseSubmitOffer({ heardAt: 10, profile: { email: '  ' } })).toBeNull()
    expect(readSubmittedProfileMessage({ type: 'localauto:submitted-profile', profile: { phone: '555' } })).toEqual({
      profile: { phone: '555' },
      title: '',
      href: '',
    })
    expect(readSubmittedProfileMessage({ type: 'localauto:fill', profile: { email: 'ada@example.com' } })).toBeNull()
  })
})
