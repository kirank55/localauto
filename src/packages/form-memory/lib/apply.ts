import { requestChoice } from './choice-bridge'
import type { ReadField } from './read-fields'
import { optionLabel } from './read-fields'
import { canonicalize, yesNoValue } from './text'

export function applyField(field: ReadField, value: string): boolean {
  const answer = value.trim()
  if (!answer) return false
  const element = field.elements[0]
  if (!element) return false

  if (field.kind === 'radio') return applyRadio(field, answer)
  if (field.kind === 'checkboxes') return applyCheckboxes(field, answer)
  if (field.kind === 'checkbox') return applyCheckbox(element, answer)
  if (field.kind === 'choice') return requestChoice(element, answer)
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
  if (!match.checked) toggle(match)
  return match.checked
}

/** The answer is the checked labels joined by commas. A label may contain a comma, so match whole labels, longest first. */
function applyCheckboxes(field: ReadField, answer: string): boolean {
  const boxes = field.elements.filter((element): element is HTMLInputElement => element instanceof HTMLInputElement)
  const names = boxes
    .flatMap((input) => [canonicalize(optionLabel(input)), canonicalize(input.value)].map((name) => ({ input, name })))
    .filter((item) => item.name)
    .sort((a, b) => b.name.length - a.name.length)
  const wanted = new Set<HTMLInputElement>()
  let rest = canonicalize(answer)
  while (rest) {
    const next = names.find((item) => rest === item.name || rest.startsWith(`${item.name} `))
    if (!next) return false
    wanted.add(next.input)
    rest = rest.slice(next.name.length).trim()
  }
  if (wanted.size === 0) return false
  for (const input of boxes) {
    if (input.checked !== wanted.has(input)) toggle(input)
  }
  return boxes.every((input) => input.checked === wanted.has(input))
}

function applyCheckbox(element: HTMLElement, answer: string): boolean {
  if (!(element instanceof HTMLInputElement)) return false
  const checked = yesNoValue(answer)
  if (checked === null) return false
  if (element.checked !== checked) toggle(element)
  return element.checked === checked
}

/**
 * Click, so the browser flips the box and fires click, input, and change. React hears radios and checkboxes
 * through click and puts a box back if only checked and change are set.
 */
function toggle(input: HTMLInputElement): void {
  input.click()
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
