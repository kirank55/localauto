// A stand-in for the react-select comboboxes on Greenhouse job boards. It renders the same class names,
// keeps the chosen option outside the input, and exposes the component where React would: through a
// __reactFiber$ property whose ancestor has props.options and selectOption. Like React, it repaints after
// the event that changed it, not during it.
for (const shell of document.querySelectorAll('[data-demo-choice]')) {
  const input = shell.querySelector('input[role="combobox"]')
  const placeholder = shell.querySelector('.select__placeholder')
  const valueContainer = shell.querySelector('.select__value-container')
  const menu = shell.querySelector('.select__menu')
  const options = JSON.parse(shell.getAttribute('data-demo-choice') || '[]').map((label) => ({ label, value: label }))
  let selected = null

  function paint() {
    valueContainer.querySelector('.select__single-value')?.remove()
    placeholder.hidden = selected !== null
    if (selected) {
      const single = document.createElement('div')
      single.className = 'select__single-value'
      single.textContent = selected.label
      valueContainer.insertBefore(single, valueContainer.firstChild)
    }
    menu.hidden = true
    input.setAttribute('aria-expanded', 'false')
  }

  const instance = {
    props: { options, getOptionLabel: (option) => option.label, getOptionValue: (option) => option.value },
    selectOption(option) {
      selected = option
      queueMicrotask(paint)
    },
  }
  input.__reactFiber$demo = { stateNode: null, return: { stateNode: { tag: 'div' }, return: { stateNode: instance, return: null } } }

  for (const option of options) {
    const row = document.createElement('div')
    row.setAttribute('role', 'option')
    row.className = 'select__option'
    row.textContent = option.label
    row.addEventListener('click', () => instance.selectOption(option))
    menu.append(row)
  }
  shell.querySelector('.select__control').addEventListener('mousedown', (event) => {
    if (!event.isTrusted) return
    event.preventDefault()
    input.focus()
    menu.hidden = !menu.hidden
    input.setAttribute('aria-expanded', String(!menu.hidden))
  })
}
