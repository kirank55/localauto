import type { ReadField } from './read-fields'
import { optionLabel } from './read-fields'
import { canonicalize, yesNoValue } from './text'

export function applyField(field: ReadField, value: string): boolean {
  const answer = value.trim()
  if (!answer) return false
  const element = field.elements[0]
  if (!element) return false

  if (field.kind === 'radio') return applyRadio(field, answer)
  if (field.kind === 'checkbox') return applyCheckbox(element, answer)
  if (field.kind === 'select' && element instanceof HTMLSelectElement) return applySelect(element, answer)
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, answer)
    return true
  }
  return false
}

function applySelect(select: HTMLSelectElement, answer: string): boolean {
  const wanted = canonicalize(answer)
  const option = [...select.options].find((item) => {
    return canonicalize(item.label) === wanted || canonicalize(item.value) === wanted || canonicalize(item.text) === wanted
  })
  if (!option) return false
  setNativeValue(select, option.value)
  return true
}

function applyRadio(field: ReadField, answer: string): boolean {
  const wanted = canonicalize(answer)
  const match = field.elements.find((element): element is HTMLInputElement => {
    if (!(element instanceof HTMLInputElement)) return false
    return canonicalize(optionLabel(element)) === wanted || canonicalize(element.value) === wanted
  })
  if (!match) return false
  for (const element of field.elements) {
    if (element instanceof HTMLInputElement) setChecked(element, element === match)
  }
  dispatchValueEvents(match)
  return true
}

function applyCheckbox(element: HTMLElement, answer: string): boolean {
  if (!(element instanceof HTMLInputElement)) return false
  const checked = yesNoValue(answer)
  if (checked === null) return false
  setChecked(element, checked)
  dispatchValueEvents(element)
  return true
}

function setChecked(input: HTMLInputElement, checked: boolean): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set
  if (setter) setter.call(input, checked)
  else input.checked = checked
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) setter.call(element, value)
  else element.value = value
  dispatchValueEvents(element)
}

function dispatchValueEvents(element: HTMLElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}
