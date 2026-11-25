import { useEffect, useState } from 'react'
import { escGame } from './api'
import { FLAG_REASONS } from './questions/flagReasons'
import PictureZoom from './questions/PictureZoom'
import QuestionImage from './questions/QuestionImage'

// Shared with the Jeopardy and Monopoly sites' key, so a leader's name is remembered across all of them
const NAME_KEY = 'pltlLeaderName'

function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Private windows can block storage; the name is just typed again next time
  }
}

// One team's result on a lock: "🔓 lock 3 · 2 tries · 💡" or "🔒 not opened"
function TeamResult({ team, name }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${
        team.opened ? 'border-ok bg-ok-soft text-ok' : 'border-line bg-panel text-muted'
      }`}
    >
      {team.opened ? '🔓' : '🔒'} {name} · lock {team.lock_no + 1}
      {team.opened ? ` · ${team.attempts} ${team.attempts === 1 ? 'try' : 'tries'}` : ' · not opened'}
      {team.hinted && ' · 💡'}
      {team.revealed && ' · answer revealed'}
      {team.accepted && ' · accepted'}
    </span>
  )
}

// After a game: every lock question with its answer, and how each team did on it.
// Leaders open one to flag it for the reviewers.
export default function EndGameReview({ gameId, hostToken, onClose }) {
  const [data, setData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  const load = () =>
    escGame({ action: 'review_rounds', game_id: gameId, host_token: hostToken })
      .then(setData)
      .catch((error) => setErrorMessage(error.message || 'Could not load the questions.'))

  // Loads when opened; reloaded after each flag so the ⚑ marks update
  useEffect(() => {
    escGame({ action: 'review_rounds', game_id: gameId, host_token: hostToken })
      .then(setData)
      .catch((error) => setErrorMessage(error.message || 'Could not load the questions.'))
  }, [gameId, hostToken])

  const teamName = (i) => data?.teams?.[i]?.name ?? `Team ${i + 1}`
  const rounds = data?.rounds ?? []
  const open = openIndex === null ? null : rounds[openIndex]

  // One column per team: that team's own locks, in the order it got them
  const columns = (data?.teams ?? []).map((team, t) => {
    const locks = rounds
      .map((round, index) => ({ round, index, mine: round.teams.find((x) => x.team_index === t) }))
      .filter((entry) => entry.mine)
      .sort((a, b) => a.mine.lock_no - b.mine.lock_no)
    return { team, t, locks, opened: locks.filter((entry) => entry.mine.opened).length }
  })

  return (
    <div className="vault-bg fixed inset-0 z-40 overflow-y-auto p-3 text-ink sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-line bg-card p-4">
          <div>
            <h2 className="font-display text-2xl font-black uppercase tracking-wider text-accent">Review this game&apos;s locks</h2>
            <p className="text-sm text-muted">
              Each team&apos;s locks, in order. Open one to see it full size and flag it for the reviewers if something&apos;s off.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border-2 border-line bg-accent px-5 py-2 font-bold text-on-accent hover:opacity-90">
            Back to results
          </button>
        </div>

        {errorMessage && <p className="rounded-lg bg-panel p-3 text-bad">{errorMessage}</p>}
        {!data && !errorMessage && <p className="rounded-lg bg-panel p-3">Loading the questions...</p>}
        {data && rounds.length === 0 && <p className="rounded-lg bg-panel p-3">This game didn&apos;t get to its locks.</p>}

        {columns.length > 0 && rounds.length > 0 && (
          <div className="grid auto-cols-[minmax(17rem,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2">
            {columns.map(({ team, t, locks, opened }) => (
              <section key={t} className="min-w-0">
                <header
                  className="sticky top-0 z-10 mb-2 overflow-hidden rounded-lg border border-line bg-card py-2 pl-5 pr-3"
                  style={{ boxShadow: `inset 0 0 0 1px ${team.color}55` }}
                >
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: team.color }} />
                  <p className="font-display text-xs font-bold uppercase tracking-[0.3em]" style={{ color: team.color }}>
                    Team {String(t + 1).padStart(2, '0')} · {opened}/{locks.length} opened
                  </p>
                  <p className="font-mono text-lg font-black">{team.name}</p>
                </header>

                <ol className="space-y-2">
                  {locks.map(({ round, index, mine }) => (
                    <li key={round.question.id}>
                      <button
                        type="button"
                        onClick={() => setOpenIndex(index)}
                        className={`w-full rounded-lg border-2 bg-card p-3 text-left hover:bg-hover ${mine.opened ? 'border-ok/60' : 'border-line'}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-display text-xs font-black uppercase tracking-widest text-accent">
                            {mine.opened ? '🔓' : '🔒'} Lock {mine.lock_no + 1}
                          </span>
                          {round.question.flags.length > 0 && (
                            <span className="rounded bg-accent px-1.5 text-xs font-bold text-on-accent">⚑ flagged</span>
                          )}
                        </span>
                        {round.question.image_path && (
                          <QuestionImage path={round.question.image_path} className="mt-2 max-h-28" />
                        )}
                        <span className="mt-2 block text-sm font-bold leading-snug">{round.question.question_text}</span>
                        <span className="mt-1 block text-sm text-ok">Answer: <span className="font-bold">{round.question.answer_text}</span></span>
                        <span className={`mt-2 inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${mine.opened ? 'border-ok bg-ok-soft text-ok' : 'border-line bg-panel text-muted'}`}>
                          {mine.opened ? `Opened · ${mine.attempts} ${mine.attempts === 1 ? 'try' : 'tries'}` : 'Not opened'}
                          {mine.hinted && ' · 💡 hint'}
                          {mine.revealed && ' · answer revealed'}
                          {mine.accepted && ' · leader accepted'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>

      {open && (
        <QuestionReview
          round={open}
          teamName={teamName}
          gameId={gameId}
          hostToken={hostToken}
          onClose={() => setOpenIndex(null)}
          onFlagged={load}
        />
      )}
    </div>
  )
}

function QuestionReview({ round, teamName, gameId, hostToken, onClose, onFlagged }) {
  const question = round.question
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [name, setName] = useState(readName)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [zoomed, setZoomed] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setErrorMessage('')

    try {
      const data = await escGame({
        action: 'flag_question',
        game_id: gameId,
        host_token: hostToken,
        question_id: question.id,
        reason,
        note,
        flagged_by: name,
      })
      saveName(name.trim())
      setMessage(data.message)
      setReason('')
      setNote('')
      await onFlagged()
    } catch (error) {
      setErrorMessage(error.message || 'Could not send that.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-lg border-2 border-line bg-panel px-3 py-2 text-ink placeholder-muted'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="my-6 w-full max-w-2xl rounded-2xl border-4 border-line bg-card p-6 text-ink shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-info">{question.topic_name || 'Lock question'}</p>
          <button type="button" onClick={onClose} className="rounded-lg border-2 border-line bg-panel px-3 py-1 text-sm font-bold hover:bg-hover">
            Close ✕
          </button>
        </div>

        <h3 className="mt-3 text-xl font-bold">{question.question_text}</h3>
        {question.image_path && (
          <button type="button" onClick={() => setZoomed(true)} className="group relative mx-auto mt-3 block" aria-label="Zoom in on the picture">
            <QuestionImage path={question.image_path} className="max-h-64" />
            <span className="absolute bottom-2 right-2 rounded-md border border-accent bg-black/80 px-2 py-1 text-xs font-bold text-accent group-hover:bg-black">
              🔍 Zoom
            </span>
          </button>
        )}
        {zoomed && (
          <PictureZoom
            path={question.image_path}
            title="Lock picture"
            onClose={() => setZoomed(false)}
            panel={
              <div className="text-center">
                <p className="text-sm font-bold text-ink">{question.question_text}</p>
                <p className="mt-2 font-bold text-ok">Answer: {question.answer_text}</p>
                <button type="button" onClick={() => setZoomed(false)} className="mt-3 w-full rounded-lg bg-accent px-4 py-2 font-bold text-on-accent">
                  Back
                </button>
              </div>
            }
          />
        )}

        <p className="mt-4 rounded-lg border-2 border-ok bg-ok p-3 font-bold text-on-accent">
          Answer: {question.answer_text}
          {question.accepted_answers.length > 0 && <span className="font-normal"> (also: {question.accepted_answers.join(', ')})</span>}
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {round.teams.map((team) => <TeamResult key={team.team_index} team={team} name={teamName(team.team_index)} />)}
        </div>

        {question.flags.length > 0 && (
          <div className="mt-3 rounded-lg border-2 border-accent bg-warn-soft p-3 text-sm">
            <p className="font-bold text-accent">Already flagged in this game:</p>
            <ul className="mt-1 list-disc pl-5">
              {question.flags.map((flag, index) => (
                <li key={index}>
                  {FLAG_REASONS.find((r) => r.value === flag.reason)?.label}: {flag.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3 rounded-xl border-2 border-line bg-warn-soft p-4">
          <p className="font-bold text-accent">⚑ Flag for revision</p>
          <p className="text-xs text-muted">
            Reviewers see this in their queue as &ldquo;Approved question needs revision&rdquo;. The question stays in
            games until they change it.
          </p>
          <select value={reason} onChange={(event) => setReason(event.target.value)} required aria-label="What's wrong" className={input}>
            <option value="" disabled>What&apos;s wrong?</option>
            {FLAG_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            required
            rows={3}
            maxLength={1000}
            placeholder="Note for the reviewer (required): what should change?"
            className={input}
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            placeholder="Your name (required)"
            className={input}
          />
          <button
            type="submit"
            disabled={busy || !reason || !note.trim() || !name.trim()}
            className="w-full rounded-lg border-2 border-line bg-accent px-5 py-2 font-bold text-on-accent hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Sending...' : 'Send to reviewers'}
          </button>
          {message && <p className="text-sm font-bold text-ok">{message}</p>}
          {errorMessage && <p className="text-sm font-bold text-bad">{errorMessage}</p>}
        </form>
      </section>
    </div>
  )
}
