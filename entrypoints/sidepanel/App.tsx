import { useEffect, useRef, useState } from 'preact/hooks'
import { createChromeMemoryStore, MEMORY_STORAGE_KEY } from '../../src/packages/form-memory/chrome-memory'
import { createChromeSubmitOffer, SUBMIT_OFFER_KEY } from '../../src/packages/form-memory/chrome-submit'
import { mergeFrameFills, rememberAnswers, type MergedFill } from '../../src/packages/form-memory'
import { hostLabel } from '../../src/packages/form-memory/hosts'
import {
  activePersonality,
  activeProfile,
  addPersonality,
  emptyMemory,
  parseMemoryState,
  PERSONALITY_LIMIT,
  replacesSavedAnswer,
  selectPersonality,
  writeActiveProfile,
  type MemoryState,
  type Profile,
} from '../../src/packages/form-memory/memory'
import type { SaveCandidate } from '../../src/packages/form-memory/model'
import { mergeSubmitOffer, parseSubmitOffer, type SubmitOffer } from '../../src/packages/form-memory/submit'
import { applicationHeading, findApplicationTab, injectContentScripts, requestFrames } from './frames'

type CandidateRow = SaveCandidate & { frameId: number; checked: boolean }
type PanelRequest = Parameters<typeof requestFrames>[1]
/** The tab and page that the results on screen came from. Accept and Keep act on it, wherever the person is now. */
type ResultPage = { tabId: number; url: string; title: string; host: string }

const PROFILE_FIELDS: readonly (readonly [keyof Profile, string, string, string])[] = [
  ['fullName', 'Full name', 'Ada Lovelace', 'text'],
  ['email', 'Email', 'ada@example.com', 'email'],
  ['phone', 'Phone', '555-010-2030', 'tel'],
  ['linkedin', 'LinkedIn', 'https://linkedin.com/in/ada', 'url'],
  ['github', 'GitHub', 'https://github.com/ada', 'url'],
  ['website', 'Website', 'https://ada.example', 'url'],
]

export function App() {
  const [memory, setMemory] = useState<MemoryState>(emptyMemory())
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pageTitle, setPageTitle] = useState('No application tab yet')
  const [pageHost, setPageHost] = useState('')
  const [result, setResult] = useState<MergedFill | null>(null)
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [ready, setReady] = useState(false)
  const [personalityOpen, setPersonalityOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileFormOpen, setProfileFormOpen] = useState(true)
  const [pageTabId, setPageTabId] = useState<number | null>(null)
  const [resultPage, setResultPage] = useState<ResultPage | null>(null)
  const resultPageRef = useRef<ResultPage | null>(null)
  const memoryRef = useRef(memory)
  const pickerRef = useRef<HTMLDivElement>(null)
  const readyRef = useRef(false)
  const pendingOffer = useRef<SubmitOffer['profile'] | null>(null)
  const tail = useRef(Promise.resolve())
  const flushTimer = useRef<number | undefined>(undefined)

  function cancelScheduledFlush(): void {
    if (flushTimer.current === undefined) return
    window.clearTimeout(flushTimer.current)
    flushTimer.current = undefined
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.current.then(task, task)
    tail.current = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  function scheduleFlush(): void {
    cancelScheduledFlush()
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = undefined
      void enqueue(() => flushNow())
    }, 300)
  }

  async function flushNow(message?: string): Promise<boolean> {
    if (!readyRef.current) return false
    const draft = memoryRef.current
    try {
      const stored = await createChromeMemoryStore().load()
      const activeGone = !stored.personalities.some((personality) => personality.id === draft.activePersonalityId)
      let next = stored
      if (!activeGone) {
        next = writeActiveProfile(selectPersonality(stored, draft.activePersonalityId), activeProfile(draft))
      }
      await createChromeMemoryStore().save(next)
      const latest = memoryRef.current
      const unchanged =
        latest.activePersonalityId === draft.activePersonalityId &&
        JSON.stringify(activeProfile(latest)) === JSON.stringify(activeProfile(draft))
      if (activeGone || unchanged) {
        memoryRef.current = next
        setMemory(next)
      } else {
        scheduleFlush()
      }
      if (message) {
        setError('')
        setNotice(message)
      }
      return true
    } catch {
      setError('Could not save on this device.')
      return false
    }
  }

  function remember(next: MemoryState): void {
    memoryRef.current = next
    setMemory(next)
  }

  function updateProfile(key: keyof Profile, value: string): void {
    remember(writeActiveProfile(memoryRef.current, { ...activeProfile(memoryRef.current), [key]: value }))
    scheduleFlush()
  }

  function onCreateProfile(name: string): void {
    const previous = memoryRef.current
    const preview = addPersonality(previous, name)
    if (preview === previous) {
      setNotice('')
      setError(
        previous.personalities.length >= PERSONALITY_LIMIT
          ? `You can keep ${PERSONALITY_LIMIT} profiles.`
          : 'Enter a profile name.',
      )
      return
    }
    cancelScheduledFlush()
    void enqueue(async () => {
      if (!readyRef.current) return
      try {
        const stored = await createChromeMemoryStore().load()
        let base = stored
        if (stored.personalities.some((personality) => personality.id === previous.activePersonalityId)) {
          base = writeActiveProfile(selectPersonality(stored, previous.activePersonalityId), activeProfile(previous))
        }
        const created = addPersonality(base, name)
        if (created === base) {
          await createChromeMemoryStore().save(base)
          setNotice('')
          setError(
            base.personalities.length >= PERSONALITY_LIMIT
              ? `You can keep ${PERSONALITY_LIMIT} profiles.`
              : 'Enter a profile name.',
          )
          return
        }
        const added = created.personalities.length > base.personalities.length
        const next = created
        await createChromeMemoryStore().save(next)
        remember(next)
        setProfileName('')
        setPersonalityOpen(false)
        setProfileFormOpen(isEmptyProfile(activeProfile(next)))
        setError('')
        setNotice(added ? `${activePersonality(next).name} created.` : `${activePersonality(next).name} selected.`)
      } catch {
        setError('Could not save on this device.')
      }
    })
  }

  function onPersonality(id: string): void {
    const previous = memoryRef.current
    const switched = selectPersonality(previous, id)
    if (switched.activePersonalityId === previous.activePersonalityId) return
    remember(switched)
    setProfileFormOpen(isEmptyProfile(activeProfile(switched)))
    cancelScheduledFlush()
    void enqueue(async () => {
      if (!readyRef.current) return
      try {
        const stored = await createChromeMemoryStore().load()
        let next = stored
        if (stored.personalities.some((personality) => personality.id === previous.activePersonalityId)) {
          next = writeActiveProfile(selectPersonality(stored, previous.activePersonalityId), activeProfile(previous))
        }
        if (!next.personalities.some((personality) => personality.id === id)) {
          remember(next)
          setError('That personality is no longer on this device.')
          return
        }
        next = selectPersonality(next, id)
        await createChromeMemoryStore().save(next)
        if (memoryRef.current.activePersonalityId === id) remember(next)
        setError('')
        setNotice(`${activePersonality(next).name} selected.`)
      } catch {
        setError('Could not save on this device.')
      }
    })
  }

  const flushRef = useRef(flushNow)
  const cancelRef = useRef(cancelScheduledFlush)
  const enqueueRef = useRef(enqueue)
  flushRef.current = flushNow
  cancelRef.current = cancelScheduledFlush
  enqueueRef.current = enqueue

  function showSubmitOffer(profile: SubmitOffer['profile']): void {
    const next = mergeSubmitOffer(memoryRef.current, profile)
    memoryRef.current = next
    setMemory(next)
    setProfileFormOpen(true)
    setNotice('Details from the form are in the profile. Save profile to keep them.')
    setError('')
    void createChromeSubmitOffer().clear()
  }

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const stored = await createChromeMemoryStore().load()
        if (!active) return
        const offer = await createChromeSubmitOffer().load()
        if (!active) return
        const profile = pendingOffer.current ?? offer?.profile ?? null
        pendingOffer.current = null
        const next = profile ? mergeSubmitOffer(stored, profile) : stored
        memoryRef.current = next
        readyRef.current = true
        setMemory(next)
        setProfileFormOpen(Boolean(profile) || isEmptyProfile(activeProfile(next)))
        setReady(true)
        if (profile) {
          setNotice('Details from the form are in the profile. Save profile to keep them.')
          await createChromeSubmitOffer().clear()
        }
      } catch {
        if (!active) return
        setError('Could not read on-device storage.')
      }
    })()

    function onStorageChanged(changes: { [key: string]: { newValue?: unknown } }, area: string): void {
      if (area === 'session' && SUBMIT_OFFER_KEY in changes) {
        const offer = parseSubmitOffer(changes[SUBMIT_OFFER_KEY]?.newValue)
        if (!offer) return
        if (!readyRef.current) {
          pendingOffer.current = offer.profile
          return
        }
        showSubmitOffer(offer.profile)
        return
      }
      if (area !== 'local') return
      if (MEMORY_STORAGE_KEY in changes) {
        const next = parseMemoryState(changes[MEMORY_STORAGE_KEY]?.newValue)
        const local = memoryRef.current
        const keepTyping =
          editingProfile() && next.personalities.some((personality) => personality.id === local.activePersonalityId)
        const merged = keepTyping
          ? writeActiveProfile(selectPersonality(next, local.activePersonalityId), activeProfile(local))
          : next
        memoryRef.current = merged
        setMemory(merged)
      }
    }

    function onBlur(): void {
      cancelRef.current()
      void enqueueRef.current(() => flushRef.current())
    }

    browser.storage.onChanged.addListener(onStorageChanged)
    window.addEventListener('blur', onBlur)
    return () => {
      active = false
      if (flushTimer.current !== undefined) window.clearTimeout(flushTimer.current)
      browser.storage.onChanged.removeListener(onStorageChanged)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    let active = true
    function refresh(): void {
      void findApplicationTab()
        .then((tab) => {
          if (!active) return
          showApplication(tab)
        })
        .catch(() => undefined)
    }
    // Results belong to the page they came from. Switching tabs keeps them. That tab leaving the page drops them.
    function onUpdated(tabId: number, change: { url?: string; title?: string; status?: string }): void {
      const owner = resultPageRef.current
      if (owner && tabId === owner.tabId && change.url !== undefined && withoutFragment(change.url) !== owner.url) {
        clearResults()
      }
      if (change.url !== undefined || change.title !== undefined || change.status === 'complete') refresh()
    }
    function onRemoved(tabId: number): void {
      if (resultPageRef.current?.tabId === tabId) clearResults()
      refresh()
    }
    refresh()
    browser.tabs?.onActivated?.addListener(refresh)
    browser.tabs?.onUpdated?.addListener(onUpdated)
    browser.tabs?.onRemoved?.addListener(onRemoved)
    return () => {
      active = false
      browser.tabs?.onActivated?.removeListener(refresh)
      browser.tabs?.onUpdated?.removeListener(onUpdated)
      browser.tabs?.onRemoved?.removeListener(onRemoved)
    }
  }, [])

  useEffect(() => {
    if (!personalityOpen) return
    function onPointerDown(event: PointerEvent): void {
      const target = event.target
      if (target instanceof Node && pickerRef.current?.contains(target)) return
      setPersonalityOpen(false)
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setPersonalityOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [personalityOpen])

  async function onFill(): Promise<void> {
    setBusy(true)
    setError('')
    setCandidates([])
    cancelScheduledFlush()
    try {
      const saved = await enqueue(() => flushNow('Profile saved on this device.'))
      if (!saved) return
      const tab = await findApplicationTab()
      if (tab?.id === undefined || !tab.url) {
        setError('Open the page you want to fill.')
        setResult(null)
        showApplication(null)
        return
      }
      showApplication(tab)
      const frames = await askFrames(tab.id, { type: 'localauto:fill' })
      ownResults(tab)
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
      const owner = resultPageRef.current
      if (!owner) {
        setResult(null)
        setError('The page changed. Fill again to see suggestions for it.')
        return
      }
      const frames = await requestFrames(owner.tabId, { type: 'localauto:accept', frameId, fieldId, value, question: label })
      const applied = frames.some((frame) => frame.kind === 'accept' && frame.applied)
      if (!applied) {
        setError('Could not apply that suggestion. The question may have changed, or the answer is not one of its choices.')
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
    cancelScheduledFlush()
    try {
      await enqueue(() => flushNow())
      const tab = await findApplicationTab()
      if (tab?.id === undefined) {
        setError('Open the page you want to fill.')
        showApplication(null)
        return
      }
      showApplication(tab)
      const frames = await askFrames(tab.id, { type: 'localauto:collect' })
      ownResults(tab)
      const rows: CandidateRow[] = []
      for (const frame of frames) {
        if (frame.kind !== 'collect') continue
        for (const candidate of frame.candidates) rows.push({ ...candidate, frameId: frame.frameId, checked: true })
      }
      setCandidates(rows)
      if (frames.length === 0) {
        setError('Localauto cannot read this page. Reload it and try again.')
        return
      }
      setNotice(rows.length === 0 ? 'No answered questions on this page yet.' : `Found ${rows.length} answered question${rows.length === 1 ? '' : 's'}.`)
    } catch {
      setError('Review failed. Reload the page and try again.')
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
    const host = resultPageRef.current?.host || 'device'
    cancelScheduledFlush()
    await enqueue(async () => {
      if (!(await flushNow())) return
      try {
        const stored = await createChromeMemoryStore().load()
        const answers = rememberAnswers(
          stored.answers,
          selected.map((candidate) => ({ question: candidate.question, answer: candidate.answer })),
          { now: Date.now(), host, newId: () => crypto.randomUUID() },
        )
        await createChromeMemoryStore().save({ ...stored, answers })
        remember({ ...memoryRef.current, answers })
        setCandidates([])
        setError('')
        setNotice(`Saved ${selected.length} answer${selected.length === 1 ? '' : 's'} on this device.`)
      } catch {
        setError('Could not save on this device.')
      }
    })
  }

  async function askFrames(tabId: number, message: PanelRequest) {
    const frames = await requestFrames(tabId, message)
    if (frames.length > 0) return frames
    if (!(await injectContentScripts(tabId))) return frames
    return requestFrames(tabId, message)
  }

  function showApplication(tab: { id?: number; title?: string; url?: string } | null | undefined): void {
    const heading = applicationHeading(tab)
    setPageTitle(heading.title)
    setPageHost(heading.host)
    setPageTabId(tab?.id ?? null)
  }

  function ownResults(tab: { id?: number; title?: string; url?: string }): void {
    if (tab.id === undefined || !tab.url) return
    let host = ''
    try {
      host = new URL(tab.url).hostname
    } catch {
      // The tab address is not a URL. The answer is kept without a host.
    }
    const owner = { tabId: tab.id, url: withoutFragment(tab.url), title: applicationHeading(tab).title, host }
    const previous = resultPageRef.current
    if (previous && (previous.tabId !== owner.tabId || previous.url !== owner.url)) {
      // A fill or review on another page replaces what is on screen. The caller sets the new results next.
      setResult(null)
      setCandidates([])
    }
    resultPageRef.current = owner
    setResultPage(owner)
  }

  function clearResults(): void {
    resultPageRef.current = null
    setResultPage(null)
    setResult(null)
    setCandidates([])
    setNotice('')
    setError('')
  }

  const profile = activeProfile(memory)
  const personalityName = activePersonality(memory).name
  const hiddenSkips = result?.skipped.filter((item) => item.reason === 'hidden').length ?? 0
  const safetySkips = result?.skipped.filter((item) => item.reason === 'password' || item.reason === 'payment') ?? []
  const leftAlone = result?.skipped.filter((item) => item.reason === 'already-filled').length ?? 0
  const kept = candidates.filter((candidate) => candidate.checked).length

  return (
    <div class="app">
      <header>
        <div class="header-row">
          <h1>Localauto</h1>
          <button
            id="open-settings"
            type="button"
            class="secondary"
            onClick={() => {
              void browser.runtime.openOptionsPage().catch(() => setError('Could not open settings.'))
            }}
          >
            Settings
          </button>
        </div>
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
        <div class="section-row">
          <h2>Profile</h2>
          <div class="picker" ref={pickerRef}>
            <button
              id="personality"
              type="button"
              class="secondary picker-trigger"
              aria-haspopup="listbox"
              aria-expanded={personalityOpen}
              aria-controls="personality-menu"
              aria-label={`Personality, ${personalityName}`}
              disabled={!ready || busy}
              onClick={() => setPersonalityOpen((open) => !open)}
            >
              <span>{personalityName}</span>
            </button>
            {personalityOpen ? (
              <div class="picker-panel">
                <ul id="personality-menu" class="picker-menu" role="listbox" aria-label="Personality">
                  {memory.personalities.map((personality) => {
                    const selected = personality.id === memory.activePersonalityId
                    return (
                      <li key={personality.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={busy}
                          onClick={() => {
                            onPersonality(personality.id)
                            setPersonalityOpen(false)
                          }}
                        >
                          {personality.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <form
                  class="picker-create"
                  onSubmit={(event) => {
                    event.preventDefault()
                    onCreateProfile(profileName)
                  }}
                >
                  <label>
                    New profile
                    <input
                      id="new-profile-name"
                      type="text"
                      value={profileName}
                      placeholder="Contractor"
                      autoComplete="off"
                      disabled={!ready || busy}
                      onInput={(event) => setProfileName(event.currentTarget.value)}
                    />
                  </label>
                  <button id="create-profile" type="submit" disabled={!ready || busy || !profileName.trim()}>
                    Create profile
                  </button>
                  <p class="meta">Delete a profile in Settings.</p>
                </form>
              </div>
            ) : null}
          </div>
        </div>
        {profileFormOpen ? (
          <>
            {PROFILE_FIELDS.map(([key, label, placeholder, type]) => (
              <label key={key}>
                {label}
                <input
                  id={`profile-${key}`}
                  type={type}
                  placeholder={placeholder}
                  value={profile[key]}
                  disabled={!ready || busy}
                  onInput={(event) => updateProfile(key, event.currentTarget.value)}
                />
              </label>
            ))}
            <button
              id="save-profile"
              type="button"
              class="secondary"
              disabled={!ready || busy}
              onClick={() => {
                cancelScheduledFlush()
                void enqueue(async () => {
                  const saved = await flushNow('Profile saved on this device.')
                  if (saved && !isEmptyProfile(activeProfile(memoryRef.current))) setProfileFormOpen(false)
                })
              }}
            >
              Save profile
            </button>
          </>
        ) : (
          <>
            <dl class="profile-summary" id="profile-summary">
              {PROFILE_FIELDS.filter(([key]) => profile[key].trim()).map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd class="value">{profile[key]}</dd>
                </div>
              ))}
            </dl>
            <button id="edit-profile" type="button" class="secondary" disabled={!ready || busy} onClick={() => setProfileFormOpen(true)}>
              Edit profile
            </button>
          </>
        )}
      </section>

      <section class="section" id="application">
        <h2>This application</h2>
        <p class="role" id="page-title">{pageTitle}</p>
        {pageHost ? (
          <p class="host" id="page-host">
            {pageHost}
          </p>
        ) : null}
        <div class="actions">
          <div class="choice">
            <button id="fill-button" type="button" disabled={!ready || busy} onClick={() => void onFill()}>
              Fill empty fields
            </button>
            <p class="meta">Writes your profile and saved answers into blank fields.</p>
          </div>
          <div class={candidates.length > 0 ? 'choice on' : 'choice'}>
            <button
              id="collect-button"
              type="button"
              class="secondary"
              aria-expanded={candidates.length > 0}
              disabled={!ready || busy}
              onClick={() => void onCollect()}
            >
              Review answers on this form
            </button>
            <p class="meta">Reads questions you already answered.</p>
          </div>
        </div>
        {resultPage && pageTabId !== resultPage.tabId && (result || candidates.length > 0) ? (
          <p class="source" id="result-source">
            Results below are from <strong>{resultPage.title}</strong>, in another tab.
          </p>
        ) : null}
        {candidates.length > 0 ? (
          <>
            <h2 class="list-title">Answers to keep</h2>
            <p class="meta">Name, email, phone, and links stay on the profile.</p>
            {candidates.map((candidate, index) => {
              const replaces = replacesSavedAnswer(memory.answers, candidate.question)
              return (
                <article class={candidate.checked ? 'item' : 'item off'} key={`${candidate.frameId}-${candidate.fieldId}`}>
                  <label class="keep">
                    <input
                      type="checkbox"
                      checked={candidate.checked}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked
                        setCandidates((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, checked } : row)))
                      }}
                    />
                    Keep
                  </label>
                  <p class="q">{candidate.question}</p>
                  <div class="answer">
                    <span class="eyebrow">You answered</span>
                    <p class="value">{candidate.answer}</p>
                    {replaces ? <p class="hint">Replaces the saved answer for this question.</p> : null}
                  </div>
                </article>
              )
            })}
            <p class="count" id="keep-count">
              <strong>{`${kept} of ${candidates.length}`}</strong> will be kept. Every personality uses them.
            </p>
            <button id="save-answers" type="button" disabled={!ready || busy || kept === 0} onClick={() => void onSaveAnswers()}>
              {`Keep ${kept} ${kept === 1 ? 'answer' : 'answers'}`}
            </button>
          </>
        ) : null}
      </section>

      {result && result.applied.length > 0 ? (
        <section class="section" id="filled">
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
        <section class="section" id="suggestions">
          <h2>Suggestions</h2>
          <p>These wordings differ. Nothing is filled until you accept.</p>
          {result.suggestions.map((item, index) => (
            <div class="card" key={`${item.frameId}-${item.fieldId}`}>
              <strong>{item.label}</strong>
              <em>From: {item.sourceQuestion}</em>
              <div class="suggest-row">
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
          {leftAlone > 0 ? (
            <p>
              {leftAlone} field{leftAlone === 1 ? '' : 's'} already had an answer.
            </p>
          ) : null}
          {hiddenSkips > 0 ? (
            <p>
              Skipped {hiddenSkips} hidden field{hiddenSkips === 1 ? '' : 's'}.
            </p>
          ) : null}
        </section>
      ) : null}

    </div>
  )
}

function editingProfile(): boolean {
  const element = document.activeElement
  return element instanceof HTMLElement && element.id.startsWith('profile-')
}

function isEmptyProfile(profile: Profile): boolean {
  return Object.values(profile).every((value) => !value.trim())
}

/** A page address without the fragment, which in-page links change. */
function withoutFragment(url: string): string {
  return url.split('#')[0] ?? url
}

