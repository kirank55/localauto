import { useEffect, useRef, useState } from 'preact/hooks'
import { createChromeMemoryStore } from '../../src/packages/form-memory/chrome-memory'
import { hostLabel, type HostKey } from '../../src/packages/form-memory/hosts'
import { mergeFrameFills, rememberAnswers, type MergedFill } from '../../src/packages/form-memory'
import { emptyMemory, type MemoryState, type Profile } from '../../src/packages/form-memory/memory'
import type { SaveCandidate } from '../../src/packages/form-memory/model'
import { findApplicationTab, requestFrames } from './frames'

type CandidateRow = SaveCandidate & { frameId: number; checked: boolean }

const PROFILE_FIELDS: readonly (readonly [keyof Profile, string, string, string])[] = [
  ['fullName', 'Full name', 'Ada Lovelace', 'text'],
  ['email', 'Email', 'ada@example.com', 'email'],
  ['phone', 'Phone', '555-010-2030', 'tel'],
  ['linkedin', 'LinkedIn', 'https://linkedin.com/in/ada', 'url'],
  ['github', 'GitHub', 'https://github.com/ada', 'url'],
  ['website', 'Website', 'https://ada.example', 'url'],
]

const HOSTS: readonly HostKey[] = ['greenhouse', 'lever', 'demo']

export function App() {
  const [memory, setMemory] = useState<MemoryState>(emptyMemory())
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pageLabel, setPageLabel] = useState('No application tab yet')
  const [result, setResult] = useState<MergedFill | null>(null)
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [ready, setReady] = useState(false)
  const memoryRef = useRef(memory)
  memoryRef.current = memory

  useEffect(() => {
    let active = true
    void createChromeMemoryStore()
      .load()
      .then((stored) => {
        if (!active) return
        memoryRef.current = stored
        setMemory(stored)
        setReady(true)
      })
      .catch(() => {
        if (!active) return
        setError('Could not read on-device storage.')
        setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  async function persist(next: MemoryState, message: string): Promise<void> {
    setMemory(next)
    memoryRef.current = next
    await createChromeMemoryStore().save(next)
    setError('')
    setNotice(message)
  }

  function updateProfile(key: keyof Profile, value: string): void {
    setMemory((current) => {
      const next = { ...current, profile: { ...current.profile, [key]: value } }
      memoryRef.current = next
      return next
    })
  }

  async function onFill(): Promise<void> {
    setBusy(true)
    setError('')
    setCandidates([])
    try {
      await persist(memoryRef.current, 'Profile saved on this device.')
      const tab = await findApplicationTab()
      if (tab?.id === undefined || !tab.url) {
        setError('Open a Greenhouse or Lever application, or the local demo.')
        setResult(null)
        return
      }
      setPageLabel(tab.title || new URL(tab.url).hostname)
      const frames = await requestFrames(tab.id, { type: 'localauto:fill' })
      const outcomes = frames.filter((frame) => frame.kind === 'fill').map((frame) => ({ frameId: frame.frameId, outcome: frame.outcome }))
      if (outcomes.length === 0) {
        setResult(null)
        setError('Reload the application page, then try Fill again.')
        return
      }
      const merged = mergeFrameFills(outcomes)
      setResult(merged)
      if (merged.status === 'paused') {
        setNotice(`Localauto is paused on ${hostLabel(merged.host ?? 'demo')}.`)
      } else if (merged.status === 'filled' && merged.applied.length === 0 && merged.suggestions.length === 0) {
        setNotice('Nothing matched. Add your profile or save an answer first.')
      } else if (merged.suggestions.length > 0) {
        setNotice('Review suggestions before they are used.')
      } else {
        setNotice(`Filled ${merged.applied.length} field${merged.applied.length === 1 ? '' : 's'}.`)
      }
    } catch {
      setError('Fill failed. Reload the page and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onAccept(frameId: number, fieldId: string, value: string, label: string): Promise<void> {
    setBusy(true)
    try {
      const tab = await findApplicationTab()
      if (tab?.id === undefined) {
        setError('The application tab is gone.')
        return
      }
      const frames = await requestFrames(tab.id, { type: 'localauto:accept', frameId, fieldId, value })
      const applied = frames.some((frame) => frame.kind === 'accept' && frame.applied)
      if (!applied) {
        setError('Could not apply that suggestion.')
        return
      }
      setResult((current) => {
        if (!current) return current
        return {
          ...current,
          suggestions: current.suggestions.filter((item) => !(item.frameId === frameId && item.fieldId === fieldId)),
          applied: [...current.applied, { label, value, via: 'exact', detail: 'Accepted suggestion' }],
        }
      })
      setNotice('Suggestion applied.')
      setError('')
    } finally {
      setBusy(false)
    }
  }

  async function onCollect(): Promise<void> {
    setBusy(true)
    setError('')
    try {
      const tab = await findApplicationTab()
      if (tab?.id === undefined) {
        setError('Open a Greenhouse or Lever application, or the local demo.')
        return
      }
      setPageLabel(tab.title || 'Application')
      const frames = await requestFrames(tab.id, { type: 'localauto:collect' })
      const rows: CandidateRow[] = []
      for (const frame of frames) {
        if (frame.kind !== 'collect') continue
        for (const candidate of frame.candidates) rows.push({ ...candidate, frameId: frame.frameId, checked: true })
      }
      setCandidates(rows)
      setNotice(rows.length === 0 ? 'No answered questions on this page yet.' : `Found ${rows.length} answered question${rows.length === 1 ? '' : 's'}.`)
    } finally {
      setBusy(false)
    }
  }

  async function onSaveAnswers(): Promise<void> {
    const selected = candidates.filter((candidate) => candidate.checked)
    if (selected.length === 0) {
      setError('Choose at least one answer to keep.')
      return
    }
    const tab = await findApplicationTab()
    const host = tab?.url ? new URL(tab.url).hostname : 'device'
    const answers = rememberAnswers(
      memoryRef.current.answers,
      selected.map((candidate) => ({ question: candidate.question, answer: candidate.answer })),
      { now: Date.now(), host, newId: () => crypto.randomUUID() },
    )
    await persist({ ...memoryRef.current, answers }, `Saved ${selected.length} answer${selected.length === 1 ? '' : 's'} on this device.`)
    setCandidates([])
  }

  const hiddenSkips = result?.skipped.filter((item) => item.reason === 'hidden').length ?? 0
  const safetySkips = result?.skipped.filter((item) => item.reason === 'password' || item.reason === 'payment') ?? []
  const leftAlone = result?.skipped.filter((item) => item.reason === 'already-filled').length ?? 0

  return (
    <div class="app">
      <header>
        <h1>Localauto</h1>
        <p>Answers stay on this device. Nothing is sent to an account.</p>
      </header>

      {notice ? (
        <p class="notice" id="notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p class="notice error" id="error" role="alert">
          {error}
        </p>
      ) : null}

      <section class="section">
        <h2>Profile</h2>
        {PROFILE_FIELDS.map(([key, label, placeholder, type]) => (
          <label key={key}>
            {label}
            <input
              id={`profile-${key}`}
              type={type}
              placeholder={placeholder}
              value={memory.profile[key]}
              disabled={!ready || busy}
              onInput={(event) => updateProfile(key, event.currentTarget.value)}
            />
          </label>
        ))}
        <button type="button" class="secondary" disabled={!ready || busy} onClick={() => void persist(memoryRef.current, 'Profile saved on this device.')}>
          Save profile
        </button>
      </section>

      <section class="section">
        <h2>This page</h2>
        <p class="meta">{pageLabel}</p>
        <div class="actions">
          <button id="fill-button" type="button" disabled={!ready || busy} onClick={() => void onFill()}>
            Fill empty fields
          </button>
          <button id="collect-button" type="button" class="secondary" disabled={!ready || busy} onClick={() => void onCollect()}>
            Find answers to save
          </button>
        </div>
      </section>

      {result && result.applied.length > 0 ? (
        <section class="section">
          <h2>Filled</h2>
          {result.applied.map((item, index) => (
            <div class="card" key={`${item.label}-${index}`}>
              <strong>{item.label}</strong>
              <span class="value">{item.value}</span>
              <em>{item.detail}</em>
            </div>
          ))}
        </section>
      ) : null}

      {result && result.suggestions.length > 0 ? (
        <section class="section">
          <h2>Suggestions</h2>
          <p>These wordings differ. Nothing is filled until you accept.</p>
          {result.suggestions.map((item, index) => (
            <div class="card" key={`${item.frameId}-${item.fieldId}`}>
              <strong>{item.label}</strong>
              <em>From: {item.sourceQuestion}</em>
              <span class="value">{item.value}</span>
              <button
                type="button"
                id={`accept-${index}`}
                disabled={busy}
                onClick={() => void onAccept(item.frameId, item.fieldId, item.value, item.label)}
              >
                Accept
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {safetySkips.length > 0 || hiddenSkips > 0 || leftAlone > 0 ? (
        <section class="section">
          <h2>Left alone</h2>
          {safetySkips.map((item) => (
            <p key={`${item.reason}-${item.label}`}>
              Skipped {item.reason} field: {item.label || 'unlabeled'}
            </p>
          ))}
          {leftAlone > 0 ? <p>{leftAlone} field{leftAlone === 1 ? '' : 's'} already had an answer.</p> : null}
          {hiddenSkips > 0 ? <p>Skipped {hiddenSkips} hidden field{hiddenSkips === 1 ? '' : 's'}.</p> : null}
        </section>
      ) : null}

      {candidates.length > 0 ? (
        <section class="section">
          <h2>Save answers</h2>
          <p>Only checked questions are kept.</p>
          {candidates.map((candidate, index) => (
            <label class="check" key={`${candidate.frameId}-${candidate.fieldId}`}>
              <input
                type="checkbox"
                checked={candidate.checked}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setCandidates((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, checked } : row)))
                }}
              />
              <span>
                <strong>{candidate.question}</strong>
                <span class="value">{candidate.answer}</span>
              </span>
            </label>
          ))}
          <button id="save-answers" type="button" disabled={!ready || busy} onClick={() => void onSaveAnswers()}>
            Save selected
          </button>
        </section>
      ) : null}

      <section class="section hosts">
        <h2>Sites</h2>
        <p>Runs on Greenhouse, Lever, and the local demo. Other sites stay off.</p>
        {HOSTS.map((host) => (
          <label key={host}>
            <input
              id={`host-${host}`}
              type="checkbox"
              disabled={!ready || busy}
              checked={memory.enabledHosts[host]}
              onChange={() => {
                const next = {
                  ...memoryRef.current,
                  enabledHosts: { ...memoryRef.current.enabledHosts, [host]: !memoryRef.current.enabledHosts[host] },
                }
                void persist(next, `${hostLabel(host)} ${next.enabledHosts[host] ? 'on' : 'paused'}.`)
              }}
            />
            {hostLabel(host)}
          </label>
        ))}
      </section>
    </div>
  )
}
