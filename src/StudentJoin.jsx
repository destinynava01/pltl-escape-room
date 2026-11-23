import { useCallback, useEffect, useRef, useState } from 'react'
import { escPlay, watchGame } from './api'
import QuestionImage from './questions/QuestionImage'
import { clock } from './time'
import { Button, CenterCard, Label } from './ui'

const STORAGE_KEY = 'pltlEscapeStudent'
const DEVICE_KEY = 'pltlEscapeDevice'
const field = 'w-full rounded-lg border-2 border-ink bg-white px-4 py-3 text-center text-xl font-black text-ink outline-none focus:outline-2 focus:outline-accent'

// A random id this phone keeps, so one phone can't become two students
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID() // storage blocked: works until the page is reloaded
  }
}
const readSaved = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}
const writeSaved = (value) => {
  try { value ? localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) : localStorage.removeItem(STORAGE_KEY) } catch { /* storage blocked */ }
}

// The phone: join with the code, wait to be put on a team, then type answers to open your team's locks.
export default function StudentJoin() {
  const [saved, setSaved] = useState(readSaved)
  const [notice, setNotice] = useState('')

  const leave = useCallback((message = '') => {
    writeSaved(null)
    setSaved(null)
    setNotice(message)
  }, [])

  return saved
    ? <Room saved={saved} onLeave={leave} />
    : <JoinForm notice={notice} onJoined={(value) => { writeSaved(value); setSaved(value); setNotice('') }} />
}

function JoinForm({ onJoined, notice }) {
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get('code') ?? '').toUpperCase())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function join(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await escPlay({ action: 'join', join_code: code, display_name: name, device_id: deviceId() })
      onJoined({ playerId: data.player.id, gameId: data.game.id })
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <CenterCard title="Join the Escape">
      <form onSubmit={join} className="mt-4 space-y-4">
        {notice && <p className="font-bold text-neutral-700">{notice}</p>}
        <div>
          <Label>Game code</Label>
          <input className={`${field} mt-2 uppercase tracking-widest`} maxLength={6} placeholder="ABC123" value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())} required autoCapitalize="characters" autoComplete="off" />
        </div>
        <div>
          <Label>Your name</Label>
          <input className={`${field} mt-2`} maxLength={40} placeholder="Maria G." value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button type="submit" variant="accent" disabled={busy || code.length < 6 || !name.trim()} className="w-full">
          {busy ? 'Joining…' : 'Join'}
        </Button>
        {error && <p className="font-bold text-red-700">{error}</p>}
      </form>
    </CenterCard>
  )
}

function Room({ saved, onLeave }) {
  const [view, setView] = useState(null)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null) // { kind: 'wrong' | 'close' | 'right' | 'info', text }
  const [now, setNow] = useState(() => Date.now())
  const lastLock = useRef(null)

  const check = useCallback(
    () =>
      escPlay({ action: 'status', player_id: saved.playerId, device_id: deviceId() })
        .then((data) => {
          if (data.ended) return onLeave('That game has ended. Join another with a new code.')
          // A new lock (opened by anyone on the team): clear the box and the old message
          const lock = data.lock?.lock_no ?? null
          if (lock !== lastLock.current) {
            if (lastLock.current !== null && lock !== null) setFeedback({ kind: 'right', text: `🔓 Lock ${lastLock.current + 1} is open!` })
            lastLock.current = lock
            setTyped('')
          }
          // offset: server clock minus this phone's clock, so the timer matches the projector
          setView({ ...data, offset: Date.parse(data.server_now) - Date.now() })
          setError('')
        })
        .catch((e) => {
          // The student was removed, or this phone doesn't match: go back to the join form
          if (/not found|another phone/i.test(e.message)) return onLeave('You were removed from that game.')
          setError(e.message)
        }),
    [saved.playerId, onLeave],
  )

  // Live updates, with a slow fallback check in case a signal is missed
  useEffect(() => {
    check()
    return watchGame(saved.gameId, ['lobby', 'state', 'attempt'], check, 10000)
  }, [saved.gameId, check])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  async function submit(event) {
    event.preventDefault()
    const answer = typed.trim()
    if (!answer || !view?.lock) return
    setSending(true)
    setError('')
    try {
      const result = await escPlay({ action: 'answer', player_id: saved.playerId, device_id: deviceId(), answer, lock_no: view.lock.lock_no })
      if (result.moved_on) setFeedback({ kind: 'info', text: result.message })
      else if (result.escaped) setFeedback({ kind: 'right', text: '🎉 That was the last lock. You escaped!' })
      else if (result.correct) setFeedback({ kind: 'right', text: '🔓 Correct! Next lock…' })
      else if (result.close) setFeedback({ kind: 'close', text: 'So close! Check your spelling, or your leader may accept it.' })
      else setFeedback({ kind: 'wrong', text: 'Not quite. Try again!' })
      if (!result.correct) setTyped('')
      await check()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function hint() {
    if (!window.confirm(`Get a hint? It adds ${view.game.hint_penalty_seconds} seconds to your team's time.`)) return
    setSending(true)
    try {
      await escPlay({ action: 'hint', player_id: saved.playerId, device_id: deviceId() })
      await check()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  if (!view) return <CenterCard title="Joining…">{error && <p className="mt-4 font-bold text-red-700">{error}</p>}</CenterCard>

  const { game, player, teams, team, lock, offset } = view
  const myTeam = player.team_index !== null ? teams[player.team_index] : null
  const elapsed = game.started_at
    ? ((game.ended_at ? Date.parse(game.ended_at) : now + offset) - Date.parse(game.started_at)) / 1000
    : 0

  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 font-black">
        {myTeam && <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-ink" style={{ background: myTeam.color }} />}
        {myTeam?.name ?? player.display_name}
      </p>
      {game.status !== 'setup' && <p className="font-mono text-xl font-black tabular-nums">{clock(elapsed + (team?.penalty_seconds ?? 0))}</p>}
    </div>
  )

  // Waiting to be approved, or for the game to start
  if (player.approval_status !== 'approved' || game.status === 'setup') {
    return (
      <CenterCard title={player.approval_status === 'approved' ? 'You’re in!' : 'Almost in…'}>
        <p className="mt-4 text-lg font-bold">{player.display_name}</p>
        <p className="mt-2 text-neutral-700">
          {player.approval_status !== 'approved'
            ? 'Waiting for your leader to put you on a team.'
            : `You're on ${myTeam?.name}. Waiting for the escape to start.`}
        </p>
        <button type="button" onClick={() => onLeave('')} className="mt-6 text-sm font-bold text-neutral-600 underline">Leave this game</button>
      </CenterCard>
    )
  }

  const locks = (
    <div className="mb-4 flex flex-wrap justify-center gap-1.5" aria-label={`${team?.locks_open ?? 0} of ${game.lock_count} locks open`}>
      {Array.from({ length: game.lock_count }, (_, k) => (
        <span
          key={k}
          className={`flex h-9 w-9 items-center justify-center rounded-md border-2 text-lg ${
            k < (team?.locks_open ?? 0) ? 'border-green-700 bg-green-100' : k === team?.current_lock ? 'border-accent bg-amber-100' : 'border-neutral-400 bg-white opacity-60'
          }`}
        >
          {k < (team?.locks_open ?? 0) ? '🔓' : '🔒'}
        </span>
      ))}
    </div>
  )

  // Escaped, or the game is over
  if (team?.escaped || game.status === 'finished') {
    return (
      <main className="min-h-dvh bg-board p-4 text-ink">
        <div className="mx-auto max-w-md rounded-2xl border-4 border-ink bg-card p-6 text-center shadow-xl">
          {header}
          {locks}
          <div className="text-6xl">{team?.escaped ? '🎉' : '⏱️'}</div>
          <h1 className="mt-2 text-3xl font-black text-accent">{team?.escaped ? 'You escaped!' : 'Time’s up!'}</h1>
          <p className="mt-2 text-lg font-bold">
            {team?.escaped ? `Time ${clock(team.total_seconds)}` : `${team?.locks_open ?? 0} of ${game.lock_count} locks open`}
            {team?.hints > 0 && ` (incl. ${clock(team.penalty_seconds)} for hints)`}
          </p>
          <p className="mt-1 text-neutral-700">
            {game.status === 'finished' ? `Your team placed #${team?.place}.` : `Currently #${team?.place}. Waiting for the other teams…`}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-board p-4 text-ink">
      <div className="mx-auto max-w-md rounded-2xl border-4 border-ink bg-card p-5 shadow-xl">
        {header}
        {locks}

        {lock ? (
          <>
            <Label>Lock {lock.lock_no + 1} of {game.lock_count}</Label>
            <h1 className="mt-2 text-xl font-bold">{lock.question_text}</h1>
            <QuestionImage path={lock.image_path} className="mt-3 max-h-56" />

            {lock.hint && (
              <p className="mt-3 rounded-lg border-2 border-dashed border-accent bg-amber-50 p-3 text-center font-mono text-xl font-black tracking-wider">
                💡 {lock.hint}
              </p>
            )}

            <form onSubmit={submit} className="mt-4 space-y-2">
              <input
                className={field}
                value={typed}
                onChange={(e) => { setTyped(e.target.value); if (feedback?.kind !== 'right') setFeedback(null) }}
                placeholder="Type the answer"
                maxLength={150}
                autoComplete="off"
                autoCapitalize="off"
                aria-label="Your answer"
              />
              <Button type="submit" variant="accent" className="w-full text-lg" disabled={sending || !typed.trim()}>
                {sending ? 'Checking…' : '🔑 Unlock'}
              </Button>
            </form>

            {feedback && (
              <p className={`mt-3 rounded-lg p-2 text-center font-bold ${
                feedback.kind === 'right' ? 'bg-green-100 text-green-800'
                  : feedback.kind === 'close' ? 'bg-amber-100 text-amber-900'
                  : feedback.kind === 'wrong' ? 'bg-red-100 text-red-800'
                  : 'bg-white text-neutral-800'
              }`}>
                {feedback.text}
              </p>
            )}

            {!lock.hint && (
              <button type="button" disabled={sending} onClick={hint} className="mt-3 w-full text-sm font-bold text-emerald-800 underline disabled:opacity-50">
                💡 Get a hint (+{game.hint_penalty_seconds} s)
              </button>
            )}

            {lock.tried.length > 0 && (
              <div className="mt-4 border-t-2 border-ink pt-3 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-600">Your team already tried</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {lock.tried.map((t, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className={`font-bold ${t.close ? 'text-amber-800' : 'text-red-700'}`}>&ldquo;{t.answer}&rdquo;{t.close && ' (close)'}</span>
                      <span className="text-neutral-600">{t.mine ? 'you' : t.by}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-neutral-700">Loading your lock…</p>
        )}

        {error && <p className="mt-3 text-center font-bold text-red-700">{error}</p>}
      </div>
    </main>
  )
}
