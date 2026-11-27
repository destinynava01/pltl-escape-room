import { useEffect, useState } from 'react'
import HowToPlay from './HowToPlay'
import { SLIDES as HOW_TO_SLIDES } from './howToSlides'
import { QRCodeSVG } from 'qrcode.react'
import { escGame, watchGame } from './api'
import { DEFAULT_HINT_PENALTY, DEFAULT_LOCKS, LOCK_CHOICES, MAX_TEAMS, MIN_TEAMS, SITE_NAME, TEAM_COLORS } from './config'
import { saveSession } from './session'
import { Button, Label } from './ui'

const card = 'rounded-xl border-2 border-line bg-card/90 p-6 shadow-lg backdrop-blur'
const field = 'w-full rounded-lg border-2 border-line bg-panel px-3 py-2 font-bold text-ink outline-none focus:outline-2 focus:outline-accent'
const choice = (on) =>
  `rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${
    on ? 'border-accent bg-warn-soft text-accent box-glow-accent' : 'border-line bg-panel text-ink hover:bg-hover'
  }`

// Leader lobby. Same order as the Jeopardy lobby: create game -> teams -> finalize -> subject / course /
// professor / chapters -> how many locks. Subjects and courses come from the shared question bank, filtered
// to Escape Room (chapters list how many open-response questions they have).
// Students join from their phones; the leader approves them onto teams.
// `resume` ({ session, teams, finalized }) rebuilds the lobby of a game that was already running when the
// page was refreshed; `onCloseGame` ends the game so students' phones return to the join page.
export default function Lobby({ onStart, onOpenRace, hasGame, resume, onCloseGame }) {
  const [catalog, setCatalog] = useState(null) // courses for this game, with professors and chapters
  const [catalogError, setCatalogError] = useState('')
  const [session, setSession] = useState(resume?.session ?? null) // { gameId, hostToken, joinCode }
  const [teamNames, setTeamNames] = useState(resume?.teams?.length ? resume.teams : ['Team 1', 'Team 2'])
  const [finalized, setFinalized] = useState(Boolean(resume?.finalized))
  const [subject, setSubject] = useState('')
  const [courseName, setCourseName] = useState('')
  const [professorName, setProfessorName] = useState('')
  const [pickedTopics, setPickedTopics] = useState([]) // topic ids
  const [lockCount, setLockCount] = useState(DEFAULT_LOCKS)
  const [busy, setBusy] = useState(false)
  const [guide, setGuide] = useState(false) // the how-to guide, shown when Start is pressed (before the clock starts)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [players, setPlayers] = useState([]) // students who joined from their phones

  useEffect(() => {
    escGame({ action: 'catalog' })
      .then((data) => setCatalog(data.courses))
      .catch((error) => setCatalogError(error.message))
  }, [])

  // Students joining (and being assigned) show up live; a slow check covers any missed signal
  useEffect(() => {
    if (!session) return undefined
    const load = () =>
      escGame({ action: 'list_players', game_id: session.gameId, host_token: session.hostToken })
        .then((data) => setPlayers(data.players))
        .catch(() => {})
    load()
    return watchGame(session.gameId, ['lobby'], load, 10000)
  }, [session])

  const waiting = players.filter((p) => p.approval_status === 'pending')

  // Tells the server the teams (so students can be put on them), then unlocks setup
  async function finalizeTeams() {
    setBusy(true)
    setErrorMessage('')
    try {
      await escGame({
        action: 'set_teams', game_id: session.gameId, host_token: session.hostToken,
        team_names: teamNames.map((_, i) => teamLabel(i)),
      })
      setFinalized(true)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  // Approve, remove or randomly assign students, then refresh the list
  async function studentAction(payload) {
    setBusy(true)
    setErrorMessage('')
    try {
      await escGame({ ...payload, game_id: session.gameId, host_token: session.hostToken })
      const data = await escGame({ action: 'list_players', game_id: session.gameId, host_token: session.hostToken })
      setPlayers(data.players)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  const assignRandomly = () => studentAction({ action: 'assign_random' })

  // Only courses that have playable questions can be chosen
  const playable = (catalog ?? []).filter((c) => c.professors.length > 0)
  const subjects = [...new Set(playable.map((c) => c.subject_name))]
  const courses = playable.filter((c) => c.subject_name === subject)
  const course = courses.find((c) => c.course_name === courseName)
  // Shared-curriculum courses (every professor teaches the same course) have one question set: no professor step
  const professors = course?.professors ?? []
  const showProfessorStep = Boolean(course) && !course.shared_curriculum && professors.length > 1
  const professor = course ? (showProfessorStep ? professors.find((p) => p.professor_name === professorName) : professors[0]) : null
  const topics = professor?.topics ?? []
  const teamLabel = (i) => teamNames[i].trim() || `Team ${i + 1}`

  const renameTeam = (i, name) => setTeamNames(teamNames.map((n, k) => (k === i ? name : n)))
  const addTeam = () => setTeamNames([...teamNames, `Team ${teamNames.length + 1}`])
  const removeTeam = (i) => setTeamNames(teamNames.filter((_, k) => k !== i))

  function chooseSubject(name) {
    setSubject(name)
    setCourseName('')
    setProfessorName('')
    setPickedTopics([])
  }
  function chooseCourse(name) {
    setCourseName(name)
    setProfessorName('')
    setPickedTopics([])
  }
  function chooseProfessor(name) {
    setProfessorName(name)
    setPickedTopics([])
  }
  const toggleTopic = (id) => setPickedTopics((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function createGame() {
    setBusy(true)
    setErrorMessage('')
    try {
      const data = await escGame({ action: 'create_game' })
      const created = { gameId: data.game.id, hostToken: data.host_token, joinCode: data.game.join_code }
      saveSession(created) // so a refresh brings this game back instead of orphaning its students
      setSession(created)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function start() {
    setBusy(true)
    setErrorMessage('')
    setMessage('')
    try {
      await escGame({
        action: 'start_game',
        game_id: session.gameId,
        host_token: session.hostToken,
        course_name: course.course_name,
        professor_name: course.shared_curriculum ? '' : professor.professor_name,
        topic_ids: pickedTopics,
        team_names: teamNames.map((_, i) => teamLabel(i)),
        lock_count: lockCount,
        hint_penalty_seconds: DEFAULT_HINT_PENALTY,
      })
      onStart(session)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const questionEstimate = topics.filter((t) => pickedTopics.includes(t.id)).reduce((n, t) => n + t.question_count, 0)
  const joinUrl = session ? `${window.location.origin}/join?code=${session.joinCode}` : ''

  return (
    <main className="vault-bg min-h-dvh p-4 text-ink sm:p-8">
      {/* Start shows the how-to guide first; the game (and its clock) starts when it closes */}
      {guide && <HowToPlay site="escape" gameId={session?.gameId ?? 'lobby'} name="Escape Room" accent="#ffb020" slides={HOW_TO_SLIDES} open onClose={() => { setGuide(false); start() }} />}
      {hasGame && (
        <button
          onClick={onOpenRace}
          className="fixed right-4 top-4 z-20 rounded-lg border-2 border-line bg-panel px-4 py-2 font-bold hover:bg-hover"
        >
          Back to the race
        </button>
      )}

      <header className="mx-auto mb-8 max-w-5xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-info">{SITE_NAME}</p>
        <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-widest text-accent glow-accent">Leader Lobby</h1>
        <p className="mt-3 text-muted">Manage students and prepare your teams before the escape begins.</p>
        <p className="mt-2 text-sm font-bold">
          <a href="https://pltl-game-hub.vercel.app" className="text-info hover:brightness-125">← All games</a>
          <span className="mx-2 text-muted">·</span>
          <a href="/submit" className="text-info hover:brightness-125">Submit questions</a>
          <span className="mx-2 text-muted">·</span>
          <a href="/review" className="text-info hover:brightness-125">Review queue</a>
        </p>

        <div className="mt-6">
          {session ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-bold text-ok">Game Ready!</p>
              <Button
                variant="outline"
                className="!px-4 !py-2 text-sm"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Close this game? Every student will be sent back to the join page.')) onCloseGame()
                }}
              >
                Close game and start fresh
              </Button>
            </div>
          ) : (
            <Button onClick={createGame} disabled={busy}>{busy ? 'Creating Game…' : 'Create New Game'}</Button>
          )}
          {message && <p className="mt-3 text-ok">{message}</p>}
          {errorMessage && <p className="mt-3 text-bad">{errorMessage}</p>}
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {/* Game information */}
        <div className={card}>
          <h2 className="font-display text-lg font-black uppercase tracking-widest text-accent">Game Information</h2>
          <p className="mt-4">
            Join Code:{' '}
            {session
              ? <span className="text-3xl font-black tracking-widest text-accent">{session.joinCode}</span>
              : <span className="text-muted">Not created yet</span>}
          </p>
          {session && (
            <div className="mt-6 flex flex-col items-center">
              <div className="rounded-xl border-2 border-accent bg-white p-4 box-glow-accent">
                <QRCodeSVG value={joinUrl} size={200} title={`Join code ${session.joinCode}`} />
              </div>
              <p className="mt-3 text-center text-sm text-muted">Students scan this with their phone camera to join.</p>
              <Button variant="accent" className="mt-3" onClick={() => { window.location.href = `/join?code=${session.joinCode}` }}>
                Open student join page
              </Button>
            </div>
          )}
        </div>

        {/* Teams, then game setup once finalized */}
        <div className={card}>
          <h2 className="font-display text-lg font-black uppercase tracking-widest text-accent">Teams</h2>
          <div className="mt-4 space-y-3">
            {teamNames.map((name, i) => (
              // A team is a vault keycard: color stripe, padlock badge, team number, name, and a barcode
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-line bg-black/40 py-3 pl-6 pr-3 shadow-lg"
                style={{ boxShadow: `inset 0 0 0 1px ${TEAM_COLORS[i]}33, 0 0 18px ${TEAM_COLORS[i]}22` }}
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5" style={{ background: TEAM_COLORS[i] }} />
                <span
                  aria-hidden="true"
                  className="barcode pointer-events-none absolute inset-y-3 right-3 w-10 opacity-25"
                />
                <div className="relative flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 bg-black/60 text-xl"
                    style={{ borderColor: TEAM_COLORS[i], boxShadow: `0 0 12px ${TEAM_COLORS[i]}88` }}
                  >
                    {finalized ? '🔒' : '🔓'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xs font-bold uppercase tracking-[0.35em]" style={{ color: TEAM_COLORS[i] }}>
                      Team {String(i + 1).padStart(2, '0')}{finalized && ' · sealed'}
                    </p>
                    <input
                      className="mt-1 w-full rounded-md border border-line bg-black/50 px-3 py-1.5 font-mono text-lg font-bold text-ink outline-none focus:border-accent focus:outline-2 focus:outline-accent disabled:border-transparent disabled:bg-transparent disabled:px-0"
                      value={name}
                      maxLength={40}
                      disabled={finalized}
                      aria-label={`Name for Team ${i + 1}`}
                      onChange={(e) => renameTeam(i, e.target.value)}
                    />
                  </div>
                  {!finalized && teamNames.length > MIN_TEAMS && (
                    <button
                      type="button"
                      onClick={() => removeTeam(i)}
                      aria-label={`Remove team ${i + 1}`}
                      className="relative rounded-lg border border-line bg-black/60 px-3 py-2 font-bold text-muted hover:border-bad hover:text-bad"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!finalized && teamNames.length < MAX_TEAMS && (
            <Button variant="outline" className="mt-3 w-full" onClick={addTeam}>+ Add team ({teamNames.length}/{MAX_TEAMS})</Button>
          )}

          <Button className="mt-4 w-full" disabled={!session || finalized || busy} onClick={finalizeTeams}>
            {finalized ? 'Teams Finalized' : 'Finalize Teams'}
          </Button>
          {finalized && (
            <button type="button" className="mt-2 text-sm font-bold text-info hover:brightness-125" onClick={() => setFinalized(false)}>
              Edit teams
            </button>
          )}

          {finalized && (
            <div className="mt-6 border-t-2 border-line pt-4">
              {catalogError && <p className="text-bad">{catalogError}</p>}
              {!catalog && !catalogError && <p className="text-muted">Loading subjects…</p>}
              {catalog && subjects.length === 0 && (
                <p className="text-muted">
                  No subjects have approved open-response questions for Escape Room yet. Submit some, or ask the creator to share a subject with Escape Room.
                </p>
              )}

              {subjects.length > 0 && (
                <>
                  <Label>1. Subject</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {subjects.map((name) => (
                      <button key={name} type="button" aria-pressed={subject === name}
                        onClick={() => chooseSubject(name)} className={choice(subject === name)}>
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {subject && (
                <>
                  <p className="mt-4"><Label>2. Course</Label></p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {courses.map((c) => (
                      <button key={c.course_name} type="button" aria-pressed={courseName === c.course_name}
                        onClick={() => chooseCourse(c.course_name)} className={choice(courseName === c.course_name)}>
                        {c.course_name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {showProfessorStep && (
                <>
                  <p className="mt-4"><Label>3. Professor</Label></p>
                  <select className={`${field} mt-2`} value={professorName} onChange={(e) => chooseProfessor(e.target.value)}>
                    <option value="" disabled>Choose a professor</option>
                    {professors.map((p) => <option key={p.professor_name} value={p.professor_name}>{p.professor_name}</option>)}
                  </select>
                </>
              )}

              {professor && (
                <>
                  <div className="mt-4 flex items-baseline justify-between">
                    <Label>{showProfessorStep ? '4' : '3'}. Chapters</Label>
                    <span className="text-xs text-muted">{pickedTopics.length} selected</span>
                  </div>
                  <div className="mt-1 flex gap-3 text-xs font-bold">
                    <button type="button" className="text-info hover:brightness-125" onClick={() => setPickedTopics(topics.map((t) => t.id))}>Select all</button>
                    <button type="button" className="text-info hover:brightness-125" onClick={() => setPickedTopics([])}>Clear</button>
                  </div>
                  <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                    {topics.map((t) => {
                      const on = pickedTopics.includes(t.id)
                      return (
                        <li key={t.id}>
                          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 text-sm transition hover:bg-hover ${on ? 'border-accent bg-warn-soft' : 'border-line bg-panel'}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleTopic(t.id)} className="h-4 w-4 accent-amber-400" />
                            <span className="flex-1 font-bold">{t.topic_name}</span>
                            <span className="text-xs text-muted">{t.question_count} question{t.question_count === 1 ? '' : 's'}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  {pickedTopics.length > 0 && (
                    <p className={`mt-2 text-xs font-bold ${questionEstimate < lockCount ? 'text-bad' : 'text-muted'}`}>
                      {questionEstimate < lockCount
                        ? `These chapters have ${questionEstimate} open-response question${questionEstimate === 1 ? '' : 's'}. ${lockCount} locks need ${lockCount}: pick more chapters or fewer locks.`
                        : `${lockCount} locks, picked at random from these ${questionEstimate} questions. Each team draws its own random locks.`}
                    </p>
                  )}
                </>
              )}

              {professor && (
                <>
                  <p className="mt-4"><Label>Locks per team</Label></p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {LOCK_CHOICES.map((n) => (
                      <button key={n} type="button" aria-pressed={lockCount === n}
                        onClick={() => setLockCount(n)} className={choice(lockCount === n)}>
                        🔒 {n}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted">A hint adds {DEFAULT_HINT_PENALTY} seconds to that team&apos;s time.</p>

                  <Button className="mt-4 w-full text-lg" disabled={busy || pickedTopics.length === 0 || questionEstimate < lockCount} onClick={() => (howToSkipped('escape') ? start() : setGuide(true))}>
                    {busy ? 'Starting…' : 'Start the Escape'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Students: they join from their phones; the leader checks them in the room and picks their team */}
        <div className={`${card} md:col-span-2`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black uppercase tracking-widest text-accent">Students Waiting for Approval</h2>
            <Button
              variant="outline"
              className="!px-4 !py-2"
              disabled={!finalized || waiting.length === 0 || busy}
              title="Approves every waiting student and splits them evenly between the teams"
              onClick={assignRandomly}
            >
              🎲 Randomly Assign Teams ({waiting.length})
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted">Random assignment only includes students you&apos;ve checked are in the room.</p>

          {!session && <p className="mt-4 text-muted">Create the game first, then students can join with the code.</p>}
          {session && !finalized && <p className="mt-4 text-muted">Finalize the teams so you can put students on them.</p>}
          {session && players.length === 0 && <p className="mt-4 text-muted">No students have joined yet.</p>}

          {waiting.length > 0 && (
            <ul className="mt-4 space-y-2">
              {waiting.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-line bg-panel px-3 py-2">
                  <span className="font-bold">{p.display_name}</span>
                  <span className="flex flex-wrap gap-2">
                    {teamNames.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={!finalized || busy}
                        onClick={() => studentAction({ action: 'approve_player', player_id: p.id, team_index: i })}
                        className="rounded-lg border-2 border-line px-3 py-1 text-sm font-bold text-white disabled:opacity-40"
                        style={{ background: TEAM_COLORS[i] }}
                      >
                        {teamLabel(i)}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => studentAction({ action: 'remove_player', player_id: p.id })}
                      className="rounded-lg border-2 border-line px-3 py-1 text-sm font-bold hover:bg-hover"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {players.some((p) => p.approval_status === 'approved') && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teamNames.map((_, i) => {
                const members = players.filter((p) => p.approval_status === 'approved' && p.team_index === i)
                return (
                  <div key={i} className="relative overflow-hidden rounded-lg border border-line bg-black/40 py-3 pl-5 pr-3">
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: TEAM_COLORS[i] }} />
                    <p className="font-display text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAM_COLORS[i] }}>
                      Team {String(i + 1).padStart(2, '0')} · {members.length} inside
                    </p>
                    <p className="font-mono font-black">🔒 {teamLabel(i)}</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {members.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>{p.display_name}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${p.display_name}`}
                            disabled={busy}
                            onClick={() => studentAction({ action: 'remove_player', player_id: p.id })}
                            className="text-xs font-bold text-bad hover:brightness-125"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

// The leader turned the how-to guide off on this computer ("Don't show this again")
function howToSkipped(site) {
  try {
    return Boolean(localStorage.getItem(`pltlHowToSkip:${site}`))
  } catch {
    return false
  }
}
