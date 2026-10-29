import { canonicalize } from './text'

/*
 * Greenhouse renders yes/no and choice questions with react-select. Its menu ignores synthetic key and
 * mouse events, so a content script cannot pick an option the way it sets a text value. A small script in
 * the page's main world can reach the component and call its own selectOption, which is the path a click
 * takes. The content script and that script share only the DOM: a request is an attribute plus an event on
 * the input, and the answer comes back as another attribute before dispatchEvent returns.
 */

const SELECT_EVENT = 'localauto:choice-select'
const OPTIONS_EVENT = 'localauto:choice-options'
const ANSWER_ATTR = 'data-localauto-answer'
const RESULT_ATTR = 'data-localauto-result'
const OPTIONS_ATTR = 'data-localauto-options'
const MAX_DEPTH = 60
const OPTION_CAP = 200

type ChoiceProps = {
  options?: unknown
  isMulti?: boolean
  isDisabled?: boolean
  getOptionLabel?: (option: unknown) => string
  getOptionValue?: (option: unknown) => string
  isOptionDisabled?: (option: unknown, selected: unknown) => boolean
}

type ChoiceInstance = {
  props: ChoiceProps
  selectOption: (option: unknown) => void
}

/** Content-script side: ask the page bridge to select the option that reads as the answer. */
export function requestChoice(input: HTMLElement, answer: string): boolean {
  input.setAttribute(ANSWER_ATTR, answer)
  input.removeAttribute(RESULT_ATTR)
  try {
    input.dispatchEvent(new CustomEvent(SELECT_EVENT, { bubbles: true }))
    return input.getAttribute(RESULT_ATTR) === 'selected'
  } finally {
    input.removeAttribute(ANSWER_ATTR)
    input.removeAttribute(RESULT_ATTR)
  }
}

/** Content-script side: the option labels the page bridge can see, or none when no bridge answers. */
export function requestChoiceOptions(input: HTMLElement): string[] {
  input.removeAttribute(OPTIONS_ATTR)
  try {
    input.dispatchEvent(new CustomEvent(OPTIONS_EVENT, { bubbles: true }))
    const raw = input.getAttribute(OPTIONS_ATTR)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, OPTION_CAP) : []
  } catch {
    return []
  } finally {
    input.removeAttribute(OPTIONS_ATTR)
  }
}

/** Page side: answer select and options requests for react-select inputs. Returns a function that removes the listeners. */
export function installChoiceBridge(doc: Document): () => void {
  function onSelect(event: Event): void {
    const input = event.target
    if (!(input instanceof HTMLElement)) return
    const answer = input.getAttribute(ANSWER_ATTR)
    if (answer === null) return
    const instance = findInstance(input)
    if (!instance || instance.props.isDisabled || instance.props.isMulti) {
      input.setAttribute(RESULT_ATTR, 'unsupported')
      return
    }
    const wanted = canonicalize(answer)
    const option = flatOptions(instance).find((item) => {
      if (instance.props.isOptionDisabled?.(item, []) === true) return false
      return canonicalize(labelOf(instance, item)) === wanted || canonicalize(valueOf(instance, item)) === wanted
    })
    if (option === undefined) {
      input.setAttribute(RESULT_ATTR, 'missing')
      return
    }
    try {
      instance.selectOption(option)
      input.setAttribute(RESULT_ATTR, 'selected')
    } catch {
      input.setAttribute(RESULT_ATTR, 'failed')
    }
  }

  function onOptions(event: Event): void {
    const input = event.target
    if (!(input instanceof HTMLElement)) return
    const instance = findInstance(input)
    if (!instance) return
    const labels = flatOptions(instance)
      .slice(0, OPTION_CAP)
      .map((item) => labelOf(instance, item))
      .filter(Boolean)
    input.setAttribute(OPTIONS_ATTR, JSON.stringify(labels))
  }

  doc.addEventListener(SELECT_EVENT, onSelect, true)
  doc.addEventListener(OPTIONS_EVENT, onOptions, true)
  return () => {
    doc.removeEventListener(SELECT_EVENT, onSelect, true)
    doc.removeEventListener(OPTIONS_EVENT, onOptions, true)
  }
}

function findInstance(input: HTMLElement): ChoiceInstance | null {
  const key = Object.keys(input).find((name) => name.startsWith('__reactFiber$'))
  if (!key) return null
  let fiber: unknown = (input as unknown as Record<string, unknown>)[key]
  for (let depth = 0; isRecord(fiber) && depth < MAX_DEPTH; depth += 1) {
    const node = fiber.stateNode
    if (isRecord(node) && typeof node.selectOption === 'function' && isRecord(node.props)) {
      return node as unknown as ChoiceInstance
    }
    fiber = fiber.return
  }
  return null
}

function flatOptions(instance: ChoiceInstance): unknown[] {
  const options = Array.isArray(instance.props.options) ? instance.props.options : []
  return options.flatMap((item: unknown) => (isRecord(item) && Array.isArray(item.options) ? item.options : [item]))
}

function labelOf(instance: ChoiceInstance, option: unknown): string {
  try {
    const label = instance.props.getOptionLabel ? instance.props.getOptionLabel(option) : isRecord(option) ? option.label : ''
    return typeof label === 'string' ? label.trim() : ''
  } catch {
    return ''
  }
}

function valueOf(instance: ChoiceInstance, option: unknown): string {
  try {
    const value = instance.props.getOptionValue ? instance.props.getOptionValue(option) : isRecord(option) ? option.value : ''
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  } catch {
    return ''
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
