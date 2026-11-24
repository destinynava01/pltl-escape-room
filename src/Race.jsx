import { useCallback, useEffect, useRef, useState } from 'react'
import { escGame, watchGame } from './api'
import { SITE_NAME } from './config'
import EndGameReview from './EndGameReview'
import { downloadResults } from './gameResults'
import { clock } from './time'
import { Button, HazardTape, Label, Page } from './ui'


// The projector during a game: every team's locks, the clock, and (for the leader) close calls to accept.
// It never shows a question or an answer, so the room can see it.
export default function Race({ session, onLobby, onNewGame }) {
  const { gameId, hostToken, joinCode } = session
  const [race, setRace] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [shownKeys, setShownKeys] = useState([]) // close calls whose answer key the leader chose to see
  const [reviewing, setReviewing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const autoEnded = useRef(false)

  const load = useCallback(() =>
    escGame({ action: 'race', game_id: gameId, host_token: hostToken })
      .then((data) => {
        // offset: server clock minus this computer's clock; fetchedAt: so running times keep counting
        const fetchedAt = Date.now()
        setRace({ ...data, offset: Date.parse(data.server_now) - fetchedAt, fetchedAt })
        setError('')
      })
      .catch((e) => setError(e.message)),
  [gameId, hostToken])

  // Live: unlocks ('state'), wrong answers ('attempt'), late joiners ('lobby'); a slow check covers misses
  useEffect(() => {
    load()
    return watchGame(gameId, ['state', 'attempt', 'lobby'], load, 8000)
  }, [gameId, load])

  // The clock ticks every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const game = race?.game
  const running = game?.status === 'playing'
  const finished = game?.status === 'finished'
  const standings = race?.standings ?? []
  const allOut = standings.length > 0 && standings.every((s) => s.escaped)

  // Every team escaped: stop the clock (once)
  useEffect(() => {
    if (running && allOut && !autoEnded.current) {
      autoEnded.current = true
      escGame({ action: 'end_game', game_id: gameId, host_token: hostToken }).then(load).catch(() => {})
    }
  }, [running, allOut, gameId, hostToken, load])

  async function act(payload) {
    setBusy(true)
    setError('')
    try {
      await escGame({ ...payload, game_id: gameId, host_token: hostToken })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Seconds since the last fetch, so running times keep counting between updates
  const drift = running ? Math.max(0, now - race.fetchedAt) / 1000 : 0
  const elapsed = game?.started_at
    ? ((finished && game.ended_at ? Date.parse(game.ended_at) : now + race.offset) - Date.parse(game.started_at)) / 1000
    : 0
  const timeOf = (row) => row.total_seconds + (row.escaped ? 0 : drift)
  const teamName = (i) => standings.find((s) => s.team_index === i)?.name ?? `Team ${i + 1}`
  const winners = standings.filter((s) => s.place === 1)

  async function download() {
    setDownloading(true)
    setError('')
    try {
      await downloadResults({ gameId, hostToken })
    } catch (e) {
      setError(e.message || 'Could not download the results.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Page>
      <HazardTape className="-mx-4 -mt-4 mb-4 h-3 sm:-mx-6 sm:-mt-6" />
      <header className="mx-auto mb-5 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-bad">
            {finished ? '■ Lockdown lifted' : running ? '● Escape in progress' : 'Standing by'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-widest text-accent glow-accent sm:text-5xl">
            {SITE_NAME}
          </h1>
          <p className="mt-2 text-sm font-bold text-muted">
            Late? Join at <span className="font-mono text-ink">{window.location.host}/join</span> with code{' '}
            <span className="font-mono text-xl font-black tracking-widest text-accent">{joinCode}</span>
          </p>
        </div>
        <div className={`rounded-xl border-2 border-bad bg-black/60 px-6 py-2 text-center ${running ? 'alarm' : ''}`}>
          <Label>{finished ? 'Final time' : 'Time'}</Label>
          <p className="font-mono text-6xl font-black tabular-nums text-bad glow-bad">{clock(elapsed)}</p>
        </div>
      </header>

      {error && <p className="mx-auto mb-3 max-w-6xl rounded-lg bg-panel p-2 font-bold text-bad">{error}</p>}
      {!race && !error && <p className="mx-auto max-w-6xl">Loading the race…</p>}

      {race && (
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1fr_20rem]">
          {/* One lane per team, best first */}
          <section className="space-y-3">
            {standings.map((row) => (
              <div
                key={row.team_index}
                className={`relative overflow-hidden rounded-xl border-2 p-4 pl-6 shadow-lg ${row.escaped ? 'border-ok bg-ok-soft box-glow-ok' : 'border-line bg-card'}`}
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2" style={{ background: row.color }} />
                {row.escaped && (
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -rotate-12 rounded border-4 border-ok px-3 font-display text-3xl font-black uppercase tracking-widest text-ok opacity-25 sm:text-5xl">
                    Escaped
                  </span>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-3 text-2xl font-black">
                    <span className="w-10 text-center font-display text-accent">#{row.place}</span>
                    <span aria-hidden="true" className="h-5 w-5 rounded-full border-2 border-line" style={{ background: row.color }} />
                    {row.name}
                    <span className="text-sm font-bold text-muted">({row.members} student{row.members === 1 ? '' : 's'})</span>
                  </p>
                  <p className="text-right">
                    <span className={`font-mono text-3xl font-black tabular-nums ${row.escaped ? 'text-ok glow-ok' : 'text-ink'}`}>
                      {row.escaped ? `🎉 ${clock(timeOf(row))}` : clock(timeOf(row))}
                    </span>
                    {row.hints > 0 && (
                      <span className="block text-xs font-bold text-muted">
                        💡 {row.hints} hint{row.hints === 1 ? '' : 's'} (+{clock(row.penalty_seconds)})
                      </span>
                    )}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2" aria-label={`${row.locks_open} of ${game.lock_count} locks open`}>
                  {Array.from({ length: game.lock_count }, (_, k) => {
                    const open = k < row.locks_open
                    const current = !row.escaped && k === row.current_lock
                    return (
                      <span
                        key={k}
                        className={`relative flex items-center justify-center rounded-lg border-2 ${game.lock_count > 15 ? 'h-10 w-10 text-lg' : 'h-14 w-14 text-2xl'} ${
                          open ? 'unlock-pop border-ok bg-ok-soft box-glow-ok'
                            : current ? 'animate-pulse border-accent bg-warn-soft box-glow-accent'
                            : 'border-line bg-panel opacity-50 grayscale'
                        }`}
                        title={`Lock ${k + 1}${open ? ': open' : current ? ': working on it' : ''}${row.hinted_locks.includes(k) ? ' (hint used)' : ''}`}
                      >
                        {open ? '🔓' : '🔒'}
                        <span className="absolute bottom-0.5 right-1 font-mono text-[10px] font-bold text-muted">{k + 1}</span>
                      </span>
                    )
                  })}
                  <span className="self-center font-display text-lg font-black text-muted">{row.locks_open}/{game.lock_count}</span>
                </div>

                {running && !row.escaped && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    {row.key_holder ? (
                      <span className="rounded-md border border-accent/60 bg-warn-soft px-2 py-1 font-bold text-accent">
                        🔑 {row.key_holder.name}
                        {row.key_holder.next_name && <span className="font-normal text-muted"> · next {row.key_holder.next_name}</span>}
                      </span>
                    ) : (
                      <span className="font-bold text-bad">No students on this team</span>
                    )}
                    {row.key_holder?.team_size > 1 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act({ action: 'pass_key', team_index: row.team_index })}
                        title="Give this lock to the next teammate (if the key-holder is stuck or has left)"
                        className="rounded-md border border-line px-2 py-1 text-xs font-bold text-muted hover:bg-hover disabled:opacity-40"
                      >
                        ⇢ Pass key
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Leader tools */}
          <aside className="space-y-3">
            <div className="rounded-xl border-2 border-warn bg-card p-4">
              <p className="font-display font-black uppercase tracking-widest text-warn">⚠ Close calls</p>
              <p className="text-xs text-muted">
                Wrong answers that are almost right. Accept one to open that team&apos;s lock.
              </p>
              {race.close_calls.length === 0 && <p className="mt-2 text-sm text-muted">None right now.</p>}
              <ul className="mt-2 space-y-2">
                {race.close_calls.map((c) => (
                  <li key={c.id} className="rounded-lg border-2 border-line bg-panel p-2 text-sm">
                    <p className="text-xs font-bold text-muted">{teamName(c.team_index)} · lock {c.lock_no + 1} · {c.student}</p>
                    <p className="font-bold">&ldquo;{c.answer}&rdquo;</p>
                    {shownKeys.includes(c.id) ? (
                      <p className="text-xs text-ok">
                        Key: <span className="font-bold">{c.answer_key}</span>
                        {c.also.length > 0 && ` (also: ${c.also.join(', ')})`}
                      </p>
                    ) : (
                      <button type="button" className="text-xs font-bold text-info underline" onClick={() => setShownKeys((k) => [...k, c.id])}>
                        👁 Show the answer key (the room can see it)
                      </button>
                    )}
                    <div className="mt-1">
                      <button
                        type="button"
                        disabled={busy || !running}
                        onClick={() => act({ action: 'accept_attempt', attempt_id: c.id })}
                        className="rounded-md border-2 border-line bg-ok px-3 py-1 text-xs font-bold text-on-accent hover:brightness-110 disabled:opacity-40"
                      >
                        ✓ Accept
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              {running && (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => window.confirm('End the game now? Teams still inside are ranked by locks opened, then time.') && act({ action: 'end_game' })}
                >
                  End game
                </Button>
              )}
              <Button variant="outline" onClick={onLobby}>Back to lobby</Button>
            </div>
          </aside>
        </div>
      )}

      {finished && reviewing && <EndGameReview gameId={gameId} hostToken={hostToken} onClose={() => setReviewing(false)} />}

      {/* Game over: winner, standings, question review, results download (same as the other sites) */}
      {finished && !reviewing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/80 p-4">
          <section className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border-2 border-accent bg-card text-center text-ink shadow-2xl box-glow-accent">
            <HazardTape className="h-3" />
            <div className="p-8">
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-bad">■ Lockdown lifted</p>
            <div className="mt-2 text-6xl">🏆</div>
            <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-wide text-accent glow-accent">
              {winners.length === 1 ? `${winners[0].name} wins!` : `Tie: ${winners.map((w) => w.name).join(' & ')}`}
            </h2>
            <p className="mt-1 font-bold text-muted">
              {standings.filter((s) => s.escaped).length} of {standings.length} teams escaped
            </p>

            <div className="mt-6 space-y-2">
              {standings.map((row) => (
                <p key={row.team_index} className="flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-panel px-4 py-2 font-bold">
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-accent">{row.place}.</span>
                    <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border border-line" style={{ background: row.color }} />
                    {row.name}
                  </span>
                  <span className="text-right">
                    {row.escaped ? `🎉 ${clock(row.total_seconds)}` : `${row.locks_open}/${game.lock_count} locks`}
                    {row.hints > 0 && <span className="block text-xs text-muted">💡 {row.hints} (+{clock(row.penalty_seconds)})</span>}
                  </span>
                </p>
              ))}
            </div>

            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setReviewing(true)}>📋 Review questions</Button>
              <Button variant="accent" disabled={downloading} onClick={download}>
                {downloading ? 'Preparing...' : '⬇️ Download results (.xlsx)'}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Do these before starting a new game. New game closes this one, and game data is cleared after 8 hours.
            </p>
            {error && <p className="mt-2 text-sm font-bold text-bad">{error}</p>}

            <Button className="mt-6 w-full" onClick={onNewGame}>New game</Button>
            <p className="mt-2 text-sm text-muted">Clears this game and sends students&apos; phones back to the join page.</p>
            </div>
          </section>
        </div>
      )}
    </Page>
  )
}
