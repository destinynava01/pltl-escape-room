// The leader's game, remembered in this browser tab (same approach as the Jeopardy site), so refreshing the
// page brings the game back instead of orphaning the students who joined it. It lives in sessionStorage:
// closing the tab forgets it, and a different tab or computer can't take over the game.
// { gameId, hostToken, joinCode }
const KEY = 'pltlEscapeLeader'

export function readSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return saved?.gameId && saved?.hostToken ? saved : null
  } catch {
    return null // storage blocked: the game just won't survive a refresh
  }
}

export function saveSession(session) {
  try {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session))
    else sessionStorage.removeItem(KEY)
  } catch {
    // storage blocked
  }
}
