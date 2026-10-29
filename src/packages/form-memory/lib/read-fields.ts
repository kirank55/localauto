import type { SkipReason } from '../model'
import { requestChoiceOptions } from './choice-bridge'
import { cleanQuestion, cleanText, hasPhrase, canonicalize } from './text'

/**
 * `checkboxes` is a group of checkboxes that share a name and answer one question, like Lever's yes/no cards.
 * `choice` is a react-select combobox, like Greenhouse's yes/no questions. Its value is the option on show.
 */
export type FieldKind = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'checkboxes' | 'choice'

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
const GROUP_SELECTOR = '.field, .application-question, .application-field, fieldset, [data-question], [role="group"], [role="radiogroup"]'
const LABEL_SELECTOR = '.application-label, .field-label'
const LABEL_NOISE = 'input, textarea, select, button, script, style, [aria-hidden="true"], .required'
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
  const seenGroups = new Set<string>()
  const fields: ReadField[] = []

  for (const control of controls) {
    if (control instanceof HTMLInputElement && control.type === 'radio') {
      if (control.name && seenGroups.has(`radio:${control.name}`)) continue
      if (control.name) seenGroups.add(`radio:${control.name}`)
      fields.push(readGroup(namedGroup(doc, control), 'radio'))
      continue
    }
    if (control instanceof HTMLInputElement && control.type === 'checkbox' && control.name) {
      if (seenGroups.has(`checkbox:${control.name}`)) continue
      const group = namedGroup(doc, control)
      if (group.length > 1) {
        seenGroups.add(`checkbox:${control.name}`)
        fields.push(readGroup(group, 'checkboxes'))
        continue
      }
    }
    if (control instanceof HTMLInputElement && SILENT_TYPES.has(control.type)) continue
    fields.push(readSingle(control))
  }

  assignIds(fields)
  return fields
}

export function optionLabel(input: HTMLInputElement): string {
  const wrapping = input.closest('label')
  if (wrapping) {
    const alternative = wrapping.querySelector('.application-answer-alternative')
    const text = labelText(alternative ?? wrapping)
    if (text) return text
  }
  if (input.id) {
    const label = input.ownerDocument.querySelector(`label[for="${CSS.escape(input.id)}"]`)
    const text = label ? labelText(label) : ''
    if (text) return text
  }
  return input.value
}

function namedGroup(doc: Document, control: HTMLInputElement): HTMLInputElement[] {
  if (!control.name) return [control]
  const scope = control.form ?? doc
  return [...scope.querySelectorAll<HTMLInputElement>(`input[type="${control.type}"][name="${CSS.escape(control.name)}"]`)]
}

function readSingle(control: HTMLElement): ReadField {
  const kind = kindOf(control)
  const label = questionFor(control, kind, [control])
  const name = 'name' in control && typeof control.name === 'string' ? control.name : ''
  const elementId = control.id
  const autocomplete = control.getAttribute('autocomplete') ?? ''
  const placeholder = control.getAttribute('placeholder') ?? ''
  const inputType = control instanceof HTMLInputElement ? control.type : kind
  const options =
    control instanceof HTMLSelectElement
      ? selectOptions(control)
      : kind === 'choice'
        ? requestChoiceOptions(control).map((text) => ({ value: text, label: text }))
        : []
  const field: ReadField = {
    id: '',
    kind,
    label,
    name,
    elementId,
    autocomplete,
    inputType,
    placeholder,
    currentValue: currentValue(control, kind, options),
    options,
    skip: null,
    elements: [control],
  }
  field.skip = skipReason(field, control)
  return field
}

function readGroup(group: HTMLInputElement[], kind: 'radio' | 'checkboxes'): ReadField {
  const first = group[0]
  if (!first) {
    return {
      id: '',
      kind,
      label: '',
      name: '',
      elementId: '',
      autocomplete: '',
      inputType: kind === 'radio' ? 'radio' : 'checkbox',
      placeholder: '',
      currentValue: '',
      options: [],
      skip: 'unusable',
      elements: [],
    }
  }
  const options = group.map((input) => ({ value: input.value, label: optionLabel(input) }))
  const checked = group.filter((input) => input.checked).map(optionLabel)
  const field: ReadField = {
    id: '',
    kind,
    label: questionFor(first, kind, group),
    name: first.name,
    elementId: first.id,
    autocomplete: first.getAttribute('autocomplete') ?? '',
    inputType: first.type,
    placeholder: '',
    currentValue: kind === 'radio' ? (checked[0] ?? '') : checked.join(', '),
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
  if (control instanceof HTMLInputElement && choiceValueContainer(control)) return 'choice'
  return 'text'
}

/** The react-select value container around a combobox input, or null for any other input. */
function choiceValueContainer(input: HTMLInputElement): Element | null {
  if (input.getAttribute('role') !== 'combobox') return null
  return input.closest('[class*="ValueContainer"], [class*="value-container"]')
}

function selectOptions(select: HTMLSelectElement): FieldOption[] {
  return [...select.options].map((option) => ({ value: option.value, label: cleanText(option.text) }))
}

function currentValue(control: HTMLElement, kind: FieldKind, options: FieldOption[]): string {
  if (control instanceof HTMLSelectElement) {
    if (!control.value) return ''
    const selected = options.find((option) => option.value === control.value)
    return selected?.label || control.value
  }
  if (control instanceof HTMLInputElement && kind === 'choice') {
    const container = choiceValueContainer(control)
    const single = container?.querySelector('[class*="singleValue"], [class*="single-value"]')
    if (single?.textContent) return cleanText(single.textContent)
    const multi = [...(container?.querySelectorAll('[class*="multi-value__label"], [class*="MultiValueLabel"]') ?? [])]
    return multi.map((item) => cleanText(item.textContent ?? '')).filter(Boolean).join(', ')
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

function questionFor(element: HTMLElement, kind: FieldKind, members: readonly HTMLElement[]): string {
  if (kind === 'radio' || kind === 'checkbox' || kind === 'checkboxes') {
    return groupLabel(element, members) || associatedLabel(element)
  }
  return associatedLabel(element) || groupLabel(element, members)
}

function associatedLabel(element: HTMLElement): string {
  const doc = element.ownerDocument
  const aria = element.getAttribute('aria-label')
  if (aria && cleanQuestion(aria)) return cleanQuestion(aria)
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => {
        const target = doc.getElementById(id)
        return target ? labelText(target) : ''
      })
      .join(' ')
    if (cleanQuestion(text)) return cleanQuestion(text)
  }
  if (element.id) {
    const label = doc.querySelector(`label[for="${CSS.escape(element.id)}"]`)
    const text = label ? labelText(label) : ''
    if (text) return text
  }
  const wrapping = element.closest('label')
  if (wrapping) {
    const explicit = wrapping.querySelector(LABEL_SELECTOR)
    const text = labelText(explicit ? (explicit.querySelector('.text') ?? explicit) : wrapping)
    if (text) return text
  }
  return ''
}

/** The label of the nearest container that holds this field and nothing else, so a form-wide legend is not borrowed. */
function groupLabel(element: HTMLElement, members: readonly HTMLElement[]): string {
  let container = element.closest(GROUP_SELECTOR)
  while (container && container.tagName !== 'FORM') {
    if (!holdsOnly(container, members)) return ''
    const text = containerLabel(container)
    if (text) return text
    container = container.parentElement?.closest(GROUP_SELECTOR) ?? null
  }
  return ''
}

function holdsOnly(container: Element, members: readonly HTMLElement[]): boolean {
  return [...container.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)].every((control) => {
    if (members.includes(control)) return true
    if (control instanceof HTMLInputElement && (control.type === 'hidden' || SILENT_TYPES.has(control.type))) return true
    return control.getAttribute('aria-hidden') === 'true'
  })
}

function containerLabel(container: Element): string {
  const legend = container.querySelector('legend')
  const fromLegend = legend ? labelText(legend) : ''
  if (fromLegend) return fromLegend
  const explicit = container.querySelector(LABEL_SELECTOR)
  const fromExplicit = explicit ? labelText(explicit.querySelector('.text') ?? explicit) : ''
  if (fromExplicit) return fromExplicit
  const labels = [...container.querySelectorAll('label')]
  const group = labels.find((label) => !label.querySelector(CONTROL_SELECTOR))
  return group ? labelText(group) : ''
}

/** Visible label words: no nested controls, required stars, or text hidden from assistive technology. */
function labelText(element: Element): string {
  const clone = element.cloneNode(true)
  if (!(clone instanceof Element)) return cleanQuestion(element.textContent ?? '')
  clone.querySelectorAll(LABEL_NOISE).forEach((node) => node.remove())
  return cleanQuestion(clone.textContent ?? '')
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
