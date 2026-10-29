import { useEffect, useState } from 'preact/hooks'
import { createChromeMemoryStore, MEMORY_STORAGE_KEY } from '../../src/packages/form-memory/chrome-memory'
import { createChromeSubmitOffer } from '../../src/packages/form-memory/chrome-submit'
import { hostLabel, type HostKey } from '../../src/packages/form-memory/hosts'
import {
  activePersonality,
  activeProfile,
  addPersonality,
  DEFAULT_PERSONALITY_ID,
  emptyMemory,
  parseMemoryState,
  PERSONALITY_LIMIT,
  removePersonality,
  selectPersonality,
  STARTER_PERSONALITIES,
  type MemoryState,
  type Profile,
} from '../../src/packages/form-memory/memory'

const HOSTS: readonly HostKey[] = ['greenhouse', 'lever', 'demo']

const PROFILE_FIELDS: readonly (readonly [keyof Profile, string])[] = [
  ['fullName', 'Full name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['linkedin', 'LinkedIn'],
  ['github', 'GitHub'],
  ['website', 'Website'],
]

export function App() {
  const [memory, setMemory] = useState<MemoryState>(emptyMemory())
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    let active = true
    void createChromeMemoryStore()
      .load()
      .then((stored) => {
        if (!active) return
        setMemory(stored)
        setReady(true)
      })
      .catch(() => {
        if (!active) return
        setError('Could not read on-device storage.')
      })

    function onStorageChanged(changes: { [key: string]: { newValue?: unknown } }, area: string): void {
      if (area !== 'local' || !(MEMORY_STORAGE_KEY in changes)) return
      setMemory(parseMemoryState(changes[MEMORY_STORAGE_KEY]?.newValue))
    }

    browser.storage.onChanged.addListener(onStorageChanged)
    return () => {
      active = false
      browser.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [])

  async function commit(next: MemoryState, message: string): Promise<boolean> {
    try {
      await createChromeMemoryStore().save(next)
      setMemory(next)
      setError('')
      setNotice(message)
      return true
    } catch {
      setError('Could not save on this device.')
      return false
    }
  }

  async function onAdd(name: string): Promise<void> {
    const current = await createChromeMemoryStore().load()
    const next = addPersonality(current, name)
    if (next === current) {
      setError(
        current.personalities.length >= PERSONALITY_LIMIT
          ? `You can keep ${PERSONALITY_LIMIT} personalities.`
          : 'Enter a personality name.',
      )
      return
    }
    const added = next.personalities.length > current.personalities.length
    const saved = await commit(next, added ? `${activePersonality(next).name} added.` : `${activePersonality(next).name} selected.`)
    if (saved) setDraft('')
  }

  async function onRemove(id: string): Promise<void> {
    const current = await createChromeMemoryStore().load()
    const name = current.personalities.find((personality) => personality.id === id)?.name ?? 'Personality'
    const next = removePersonality(current, id)
    if (next === current) return
    await commit(next, `${name} deleted.`)
  }

  async function onSelect(id: string): Promise<void> {
    const current = await createChromeMemoryStore().load()
    const next = selectPersonality(current, id)
    if (next.activePersonalityId === current.activePersonalityId) return
    await commit(next, `${activePersonality(next).name} selected.`)
  }

  async function onHost(host: HostKey): Promise<void> {
    const current = await createChromeMemoryStore().load()
    const next = {
      ...current,
      enabledHosts: { ...current.enabledHosts, [host]: !current.enabledHosts[host] },
    }
    await commit(next, `${hostLabel(host)} ${next.enabledHosts[host] ? 'on' : 'paused'}.`)
  }

  async function onListen(listenForSubmit: boolean): Promise<void> {
    const current = await createChromeMemoryStore().load()
    const next = { ...current, listenForSubmit }
    const saved = await commit(
      next,
      listenForSubmit ? 'A submit opens the side panel with profile details.' : 'Submit listening is off.',
    )
    if (saved && !listenForSubmit) await createChromeSubmitOffer().clear()
  }

  async function onForgetAnswer(id: string): Promise<void> {
    const current = await createChromeMemoryStore().load()
    const answer = current.answers.find((item) => item.id === id)
    if (!answer) return
    await commit({ ...current, answers: current.answers.filter((item) => item.id !== id) }, `Deleted the answer to "${answer.question}".`)
  }

  async function onForgetAll(): Promise<void> {
    const current = await createChromeMemoryStore().load()
    const count = current.answers.length
    const saved = await commit({ ...current, answers: [] }, `Deleted ${count} saved answer${count === 1 ? '' : 's'}.`)
    if (saved) setConfirmClear(false)
  }

  const answers = [...memory.answers].sort((a, b) => b.savedAt - a.savedAt)

  const missingPresets = STARTER_PERSONALITIES.filter(
    (preset) =>
      preset.id !== DEFAULT_PERSONALITY_ID &&
      !memory.personalities.some(
        (personality) => personality.id === preset.id || personality.name.toLowerCase() === preset.name.toLowerCase(),
      ),
  )

  return (
    <div class="app wide">
      <header>
        <h1>Settings</h1>
        <p>The profile you save, personalities, sites, and the submit listener stay on this device.</p>
      </header>

      {notice ? (
        <p class="notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p class="notice error" role="alert">
          {error}
        </p>
      ) : null}

      <section class="section">
        <h2>Personalities</h2>
        <p>Each personality keeps its own name, email, phone, and links. Saved answers stay shared. Default is selected on a new install.</p>
        <label>
          Selected
          <select
            id="personality"
            value={memory.activePersonalityId}
            disabled={!ready}
            onChange={(event) => void onSelect(event.currentTarget.value)}
          >
            {memory.personalities.map((personality) => (
              <option key={personality.id} value={personality.id}>
                {personality.name}
              </option>
            ))}
          </select>
        </label>
        <ul class="personality-list">
          {memory.personalities.map((personality) => (
            <li key={personality.id}>
              <span>{personality.name}</span>
              {personality.id === DEFAULT_PERSONALITY_ID ? (
                <span class="meta inline">Always available</span>
              ) : (
                <button
                  id={`delete-profile-${personality.id}`}
                  type="button"
                  class="secondary"
                  disabled={!ready}
                  onClick={() => void onRemove(personality.id)}
                >
                  Delete profile
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void onAdd(draft)
          }}
        >
          <label>
            New personality
            <input
              id="new-personality"
              type="text"
              value={draft}
              placeholder="Contractor"
              disabled={!ready}
              onInput={(event) => setDraft(event.currentTarget.value)}
            />
          </label>
          <button id="add-personality" type="submit" disabled={!ready || !draft.trim()}>
            Add
          </button>
        </form>
        {missingPresets.length > 0 ? (
          <div class="chips">
            {missingPresets.map((preset) => (
              <button key={preset.id} type="button" class="secondary" disabled={!ready} onClick={() => void onAdd(preset.name)}>
                {preset.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {ready ? (
        <section class="section" id="saved-profile">
          <h2>Saved profile</h2>
          <p>{activePersonality(memory).name} keeps this name, email, phone, and these links on this device.</p>
          <dl class="profile-fields">
            {PROFILE_FIELDS.map(([key, label]) => {
              const value = activeProfile(memory)[key]
              return (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd id={`saved-${key}`} class={value ? 'value' : 'meta'}>
                    {value || 'Not saved'}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ) : null}

      <section class="section" id="saved-answers">
        <h2>Saved answers</h2>
        <p>
          {answers.length === 0
            ? 'No saved answers yet. Choose Review answers on this form in the side panel to keep some.'
            : `${answers.length} answer${answers.length === 1 ? '' : 's'} on this device, newest first. Every personality uses them.`}
        </p>
        {answers.length > 0 ? (
          <ul class="answer-list">
            {answers.map((answer) => (
              <li key={answer.id}>
                <div class="answer-text">
                  <p class="q">{answer.question}</p>
                  <p class="value">{answer.answer}</p>
                  <p class="meta">{answerSource(answer.host, answer.savedAt)}</p>
                </div>
                <button
                  id={`delete-answer-${answer.id}`}
                  type="button"
                  class="secondary"
                  disabled={!ready}
                  aria-label={`Delete the answer to ${answer.question}`}
                  onClick={() => void onForgetAnswer(answer.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {answers.length > 0 && !confirmClear ? (
          <button id="clear-answers" type="button" class="secondary" disabled={!ready} onClick={() => setConfirmClear(true)}>
            Delete all saved answers
          </button>
        ) : null}
        {answers.length > 0 && confirmClear ? (
          <div class="confirm" role="group" aria-label="Confirm delete">
            <p>{`Delete all ${answers.length} saved answers? This cannot be undone.`}</p>
            <div class="confirm-actions">
              <button id="confirm-clear-answers" type="button" class="danger" disabled={!ready} onClick={() => void onForgetAll()}>
                Delete all
              </button>
              <button type="button" class="secondary" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section class="section hosts">
        <h2>Sites</h2>
        <p>Runs on any website. Pause Greenhouse, Lever, or the local demo.</p>
        {HOSTS.map((host) => (
          <label key={host}>
            <input
              id={`host-${host}`}
              type="checkbox"
              disabled={!ready}
              checked={memory.enabledHosts[host]}
              onChange={() => void onHost(host)}
            />
            {hostLabel(host)}
          </label>
        ))}
      </section>

      <section class="section">
        <h2>Submit listener</h2>
        <label class="check">
          <input
            id="listen-for-submit"
            type="checkbox"
            disabled={!ready}
            checked={memory.listenForSubmit}
            onChange={(event) => void onListen(event.currentTarget.checked)}
          />
          <span>Open the side panel when a form is submitted</span>
        </label>
        <p>
          Name, email, phone, and links from the form go into the profile. Save profile keeps them. A written answer
          still uses Review answers on this form.
        </p>
      </section>
    </div>
  )
}

function answerSource(host: string, savedAt: number): string {
  const date = new Date(savedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  return host ? `${host} · ${date}` : date
}
