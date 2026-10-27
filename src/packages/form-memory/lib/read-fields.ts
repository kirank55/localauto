import type { SkipReason } from '../model'
import { cleanText, hasPhrase, canonicalize } from './text'

export type FieldKind = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'

export type FieldOption = {
  value: string
  label: string
}

export type ReadField = {
  id: string
  kind: FieldKind
  label: string
  name: string
  elementId: string
  autocomplete: string
  inputType: string
  placeholder: string
  currentValue: string
  options: FieldOption[]
  skip: SkipReason | null
  elements: HTMLElement[]
}

const CONTROL_SELECTOR = 'input, textarea, select'
const SILENT_TYPES = new Set([
  'submit',
  'button',
  'reset',
  'image',
  'file',
  'color',
  'range',
  'date',
  'datetime-local',
  'time',
  'week',
  'month',
])

export function readFields(doc: Document): ReadField[] {
  const controls = [...doc.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)]
  const seenRadioNames = new Set<string>()
  const fields: ReadField[] = []

  for (const control of controls) {
    if (control instanceof HTMLInputElement && control.type === 'radio') {
      const key = control.name || `radio-${fields.length}`
      if (control.name && seenRadioNames.has(control.name)) continue
      seenRadioNames.add(key)
      const group = control.name
        ? [...doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(control.name)}"]`)]
        : [control]
      fields.push(readRadio(group))
      continue
    }
    if (control instanceof HTMLInputElement && SILENT_TYPES.has(control.type)) continue
    fields.push(readSingle(control))
  }

  assignIds(fields)
  return fields
}

function readSingle(control: HTMLElement): ReadField {
  const kind = kindOf(control)
  const label = questionFor(control, kind)
  const name = 'name' in control && typeof control.name === 'string' ? control.name : ''
  const elementId = control.id
  const autocomplete = control.getAttribute('autocomplete') ?? ''
  const placeholder = control.getAttribute('placeholder') ?? ''
  const inputType = control instanceof HTMLInputElement ? control.type : kind
  const options = control instanceof HTMLSelectElement ? selectOptions(control) : []
  const field: ReadField = {
    id: '',
    kind,
    label,
    name,
    elementId,
    autocomplete,
    inputType,
    placeholder,
    currentValue: currentValue(control, options),
    options,
    skip: null,
    elements: [control],
  }
  field.skip = skipReason(field, control)
  return field
}

function readRadio(group: HTMLInputElement[]): ReadField {
  const first = group[0]
  if (!first) {
    return {
      id: '',
      kind: 'radio',
      label: '',
      name: '',
      elementId: '',
      autocomplete: '',
      inputType: 'radio',
      placeholder: '',
      currentValue: '',
      options: [],
      skip: 'unusable',
      elements: [],
    }
  }
  const options = group.map((input) => ({ value: input.value, label: optionLabel(input) }))
  const checked = group.find((input) => input.checked)
  const field: ReadField = {
    id: '',
    kind: 'radio',
    label: questionFor(first, 'radio'),
    name: first.name,
    elementId: first.id,
    autocomplete: first.getAttribute('autocomplete') ?? '',
    inputType: 'radio',
    placeholder: '',
    currentValue: checked ? optionLabel(checked) : '',
    options,
    skip: null,
    elements: group,
  }
  field.skip = skipReason(field, first)
  return field
}

function kindOf(control: HTMLElement): FieldKind {
  if (control instanceof HTMLTextAreaElement) return 'textarea'
  if (control instanceof HTMLSelectElement) return 'select'
  if (control instanceof HTMLInputElement && control.type === 'checkbox') return 'checkbox'
  return 'text'
}

function selectOptions(select: HTMLSelectElement): FieldOption[] {
  return [...select.options].map((option) => ({ value: option.value, label: cleanText(option.text) }))
}

function currentValue(control: HTMLElement, options: FieldOption[]): string {
  if (control instanceof HTMLSelectElement) {
    if (!control.value) return ''
    const selected = options.find((option) => option.value === control.value)
    return selected?.label || control.value
  }
  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    return control.checked ? 'Yes' : ''
  }
  if ('value' in control && typeof control.value === 'string') return control.value.trim()
  return ''
}

function skipReason(field: ReadField, control: HTMLElement): SkipReason | null {
  if (isHidden(control)) return 'hidden'
  if (isPassword(field)) return 'password'
  if (isPayment(field)) return 'payment'
  if (isLocked(control)) return 'unusable'
  return null
}

function isHidden(element: HTMLElement): boolean {
  let current: HTMLElement | null = element
  while (current) {
    if (current instanceof HTMLInputElement && current.type === 'hidden') return true
    if (current.hidden) return true
    if (current.getAttribute('aria-hidden') === 'true') return true
    if (current.style.display === 'none' || current.style.visibility === 'hidden') return true
    const style = getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden') return true
    current = current.parentElement
  }
  return false
}

function isPassword(field: ReadField): boolean {
  if (field.inputType === 'password') return true
  const auto = field.autocomplete.toLowerCase()
  if (auto.includes('password')) return true
  return hasPhrase(canonicalize(`${field.label} ${field.name} ${field.elementId}`), 'password')
}

function isPayment(field: ReadField): boolean {
  const auto = field.autocomplete.toLowerCase()
  if (auto.startsWith('cc-') || auto.startsWith('cc ')) return true
  const hay = canonicalize(`${field.label} ${field.name} ${field.elementId} ${field.autocomplete}`)
  const phrases = ['credit card', 'card number', 'cardnumber', 'creditcard', 'cvv', 'cvc', 'csc', 'iban', 'routing number', 'payment']
  return phrases.some((phrase) => hasPhrase(hay, phrase))
}

function isLocked(control: HTMLElement): boolean {
  if ('disabled' in control && control.disabled === true) return true
  if ('readOnly' in control && control.readOnly === true) return true
  return false
}

function questionFor(element: HTMLElement, kind: FieldKind): string {
  const grouped = groupLabel(element)
  if (kind === 'radio' || kind === 'checkbox') return grouped || associatedLabel(element)
  return associatedLabel(element) || grouped
}

function associatedLabel(element: HTMLElement): string {
  const doc = element.ownerDocument
  const aria = element.getAttribute('aria-label')
  if (aria && cleanText(aria)) return cleanText(aria)
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent ?? '')
      .join(' ')
    if (cleanText(text)) return cleanText(text)
  }
  if (element.id) {
    const label = doc.querySelector(`label[for="${CSS.escape(element.id)}"]`)
    if (label?.textContent && cleanText(label.textContent)) return cleanText(label.textContent)
  }
  const wrapping = element.closest('label')
  if (wrapping) {
    const text = cleanText(textWithoutControls(wrapping))
    if (text) return text
  }
  return ''
}

function groupLabel(element: HTMLElement): string {
  const container = element.closest('.field, .application-question, .application-field, fieldset, [data-question]')
  if (!container) return ''
  const legend = container.querySelector('legend')
  if (legend?.textContent && cleanText(legend.textContent)) return cleanText(legend.textContent)
  const explicit = container.querySelector('.application-label, .field-label')
  if (explicit?.textContent && cleanText(explicit.textContent)) return cleanText(explicit.textContent)
  const labels = [...container.querySelectorAll('label')]
  const group = labels.find((label) => !label.querySelector('input, textarea, select'))
  if (group?.textContent && cleanText(group.textContent)) return cleanText(group.textContent)
  return ''
}

export function optionLabel(input: HTMLInputElement): string {
  const wrapping = input.closest('label')
  if (wrapping) {
    const text = cleanText(textWithoutControls(wrapping))
    if (text) return text
  }
  if (input.id) {
    const label = input.ownerDocument.querySelector(`label[for="${CSS.escape(input.id)}"]`)
    if (label?.textContent && cleanText(label.textContent)) return cleanText(label.textContent)
  }
  return input.value
}

function textWithoutControls(element: HTMLElement): string {
  const clone = element.cloneNode(true)
  if (!(clone instanceof HTMLElement)) return element.textContent ?? ''
  clone.querySelectorAll('input, textarea, select').forEach((node) => node.remove())
  return clone.textContent ?? ''
}

function assignIds(fields: ReadField[]): void {
  const used = new Set<string>()
  fields.forEach((field, index) => {
    const base = field.name || field.elementId || `field-${index}`
    let id = base
    let suffix = 2
    while (used.has(id)) {
      id = `${base}-${suffix}`
      suffix += 1
    }
    used.add(id)
    field.id = id
    for (const element of field.elements) element.dataset.localautoField = id
  })
}
