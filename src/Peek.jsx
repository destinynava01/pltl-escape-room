import { useEffect, useState } from 'react'
import { escGame } from './api'
import MathText from './MathText'
import QuestionImage from './questions/QuestionImage'
import { Button, Label } from './ui'

// The leader's peek at one team: the lock it's on (exactly as its phones show it), who holds the key, the hint if
// they took one, and every guess on this lock. The answer key stays behind a button, since the race is often on the
// projector. Refreshes whenever the race does (`stamp` changes).
export default function Peek({ session, team, stamp, onClose }) {
  const { gameId, hostToken } = session
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [shownFor, setShownFor] = useState(null) // the lock the key was shown for (a new lock hides it again)

  useEffect(() => {
    escGame({ action: 'peek', game_id: gameId, host_token: hostToken, team_index: team.index })
      .then((d) => { setData(d); setError('') })
      .catch((e) => setError(e.message))
  }, [gameId, hostToken, team.index, stamp])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const lock = data?.lock
  const showKey = lock && shownFor === lock.lock_no
  const minutes = data?.on_lock_since ? Math.max(0, Math.round((Date.parse(data.server_now) - Date.parse(data.on_lock_since)) / 60000)) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={`Peek at ${team.name}`}>
      <section className="my-auto w-full max-w-2xl rounded-xl border-2 border-line bg-card p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label>👀 Peeking at {team.name}</Label>
            {lock && (
              <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-widest text-accent">
                Lock {lock.lock_no + 1} of {data.lock_count}
              </h2>
            )}
            {lock && minutes !== null && <p className="text-sm text-muted">on this lock {minutes === 0 ? 'for under a minute' : `for ${minutes} min`}</p>}
            {data?.escaped && <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-widest text-ok">Escaped 🎉</h2>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md border-2 border-line px-3 py-1 font-bold hover:bg-hover" aria-label="Close">✕</button>
        </div>

        {error && <p className="mt-3 font-bold text-bad">{error}</p>}
        {!data && !error && <p className="mt-4 text-muted">Loading…</p>}

        {lock && (
          <>
            <div className="mt-4 rounded-lg border-2 border-line bg-panel p-3">
              <Label>What their phones show</Label>
              <p className="mt-1 text-lg font-bold leading-snug"><MathText text={lock.question_text} /></p>
              {lock.image_path && <div className="mt-2"><QuestionImage path={lock.image_path} className="max-h-48" /></div>}
              {lock.hint && <p className="mt-2 font-mono text-lg font-black tracking-wider">💡 {lock.hint}</p>}
            </div>

            <p className="mt-3 text-sm">
              🔑 Key-holder: <b>{lock.key_holder ?? 'nobody on this team'}</b> ·{' '}
              {lock.guesses_left < 3
                ? <span className="font-bold text-bad">{lock.guesses_left} guess{lock.guesses_left === 1 ? '' : 'es'} left</span>
                : 'no wrong guesses on this lock yet'}
              {lock.hinted && ' · 💡 took the hint'}
            </p>

            <div className="mt-3">
              <Label>Their guesses on this lock</Label>
              {lock.tries.length === 0 ? <p className="mt-1 text-sm text-muted">Nothing typed yet.</p> : (
                <ol className="mt-1 space-y-1">
                  {lock.tries.map((t, i) => (
                    <li key={i} className={`flex items-start gap-2 rounded-md px-2 py-1 text-sm ${t.correct ? 'bg-ok-soft text-ok' : t.close ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad'}`}>
                      <span>{t.correct ? '✓' : t.close ? '≈' : '✗'}</span>
                      <span className="min-w-0 break-words"><b>{t.by}:</b> &ldquo;{t.answer}&rdquo;{t.close && !t.correct ? ' (close call)' : ''}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" className="!px-3 !py-1.5 text-sm" onClick={() => setShownFor(showKey ? null : lock.lock_no)}>
                {showKey ? 'Hide' : 'Show'} the answer key
              </Button>
              <span className="text-xs text-muted">(hidden by default in case this is on the projector)</span>
            </div>
            {showKey && (
              <p className="mt-2 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
                <b><MathText text={lock.answer_key} /></b>
                {lock.also.length > 0 && ` (also accepted: ${lock.also.join(', ')})`}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
