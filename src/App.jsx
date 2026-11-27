import { useEffect, useState } from 'react'
import { escGame } from './api'
import Lobby from './Lobby'
import Race from './Race'
import ReviewDashboard from './questions/ReviewDashboard'
import SubmitQuestions from './questions/SubmitQuestions'
import StudentJoin from './StudentJoin'
import { SITE_NAME } from './config'
import { readSession, saveSession } from './session'
import { isConfigured } from './supabase'
import { Button, CenterCard } from './ui'
import { SLIDES as LANDING_SLIDES } from './howToSlides'

// Routes:
//   /          leader: landing -> lobby -> race (the projector)
//   /join      student phone: join with the code, get a team, type answers to open your team's locks
//   /submit    public question form (open response)
//   /review    reviewers (one email sign-in): review queue, question bank, subjects & courses, reviewers
//   (questions go into the same bank the Jeopardy and Monopoly sites use; each game shows its own subjects)
function App() {
  const path = window.location.pathname.replace(/\/+$/, '')

  if (!isConfigured) return <NotConfigured />
  if (path === '/join') return <StudentJoin />
  // Every page wears the game's vault look (index.css still has .theme-paper if a light page is ever wanted)
  if (path === '/submit') return <SubmitQuestions />
  if (path === '/review') return <ReviewDashboard />
  return <LeaderApp />
}

// Flow: landing card -> leader lobby (join info, teams, chapters) -> race.
// The leader's game is remembered in this tab, so a refresh restores it (see session.js).
function LeaderApp() {
  const [saved] = useState(readSession) // a game this tab was running before the page loaded
  const [screen, setScreen] = useState(saved ? 'restoring' : 'landing') // restoring | landing | lobby | race
  const [session, setSession] = useState(null) // { gameId, hostToken, joinCode } once the race has started
  const [resume, setResume] = useState(null) // { session, teams, finalized } to rebuild the lobby
  const [lobbyNumber, setLobbyNumber] = useState(0) // new number = fresh lobby

  // After a refresh: ask the server for the game and put the leader back where they were
  useEffect(() => {
    if (!saved) return
    escGame({ action: 'get_state', game_id: saved.gameId, host_token: saved.hostToken })
      .then((data) => {
        const names = (data.teams ?? []).map((t) => t.name)
        const restored = { ...saved, joinCode: data.game.join_code }
        setResume({ session: restored, teams: names, finalized: names.length > 0 })
        if (data.game.status !== 'setup') {
          setSession(restored)
          setScreen('race')
        } else {
          setScreen('lobby')
        }
      })
      .catch(() => {
        // The game is gone (closed, or older than 8 hours): forget it and start fresh
        saveSession(null)
        setScreen('landing')
      })
  }, [saved])

  // Close the game: students' phones go back to the join page, and the leader starts fresh
  async function closeGame() {
    const current = session ?? resume?.session ?? readSession()
    if (current) {
      try {
        await escGame({ action: 'close_game', game_id: current.gameId, host_token: current.hostToken })
      } catch {
        // Already gone; carry on
      }
    }
    saveSession(null)
    setSession(null)
    setResume(null)
    setLobbyNumber((n) => n + 1)
    setScreen('lobby')
  }

  if (screen === 'restoring') {
    return <CenterCard title={SITE_NAME}><p className="mt-4 text-muted">Restoring your game…</p></CenterCard>
  }

  if (screen === 'landing') {
    return (
      <CenterCard title={SITE_NAME}>
        <div className="mt-6 flex justify-center text-left [&>*]:max-w-full">{LANDING_SLIDES[0].art}</div>
        <p className="mt-4 text-muted">Teams race to crack a chain of locks. One wrong answer at a time.</p>
        <Button className="mt-6" onClick={() => setScreen('lobby')}>🔓 Open Leader Lobby</Button>
        <a href="https://pltl-game-hub.vercel.app" className="mt-4 block text-sm font-bold text-info hover:brightness-125">← All games</a>
      </CenterCard>
    )
  }

  // The lobby stays mounted (just hidden) so going back and forth keeps its state
  return (
    <>
      <div hidden={screen !== 'lobby'}>
        <Lobby
          key={lobbyNumber}
          resume={resume}
          hasGame={!!session}
          onOpenRace={() => setScreen('race')}
          onCloseGame={closeGame}
          onStart={(started) => { setSession(started); setScreen('race') }}
        />
      </div>
      {session && screen === 'race' && (
        <Race session={session} onLobby={() => setScreen('lobby')} onNewGame={closeGame} />
      )}
    </>
  )
}

function NotConfigured() {
  return (
    <CenterCard title="Setup needed">
      <p className="mt-4 text-muted">
        Add your Supabase address and public key to <code>.env.local</code> (see <code>.env.example</code>), then restart.
      </p>
    </CenterCard>
  )
}

export default App
