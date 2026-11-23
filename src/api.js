import { supabase } from './supabase'

// Calls that file or review questions are told this is the Escape Room site, so the server accepts and
// shows Escape Room's subjects and courses, and only open-response questions.
const GAME = 'escape_room'
const GAME_AWARE = ['submit-questions', 'review']

// Every backend call goes through here. The backend is the shared Supabase project's Edge Functions.
export async function callFunction(name, payload, fallbackMessage) {
  if (!supabase) throw new Error('Supabase is not set up yet. See the README.')

  const body = GAME_AWARE.includes(name) ? { game: GAME, ...payload } : payload
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) {
    // Non-2xx responses leave data empty; the server's message is in the response body
    let message = error.message || fallbackMessage
    try {
      const errorBody = await error.context?.json()
      if (errorBody?.error) message = errorBody.error
    } catch {
      // Not JSON (e.g. a network failure): keep the fallback
    }
    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)
  return data
}

// The Escape Room game server (leader: lobby, race, close calls, results)
export const escGame = (payload) => callFunction('esc-game', payload, 'Unable to contact the game server.')

// The student side (phones): join, status, answer, hint
export const escPlay = (payload) => callFunction('esc-play', payload, 'Unable to reach the game.')

// The shared review server
export const review = (payload, fallback = 'Something went wrong.') => callFunction('review', payload, fallback)

// Calls onChange whenever the server signals one of `events` for this game ('lobby' = a student joined or
// was assigned, 'votes' = a vote came in, 'state' = the question, scores or turn changed). It also checks
// every `fallbackMs` in case a signal is missed. Returns a cleanup function.
export function watchGame(gameId, events, onChange, fallbackMs = 15000) {
  if (!supabase) return () => {}

  let channel = supabase.channel(`esc-${gameId}`)
  for (const event of events) channel = channel.on('broadcast', { event }, () => onChange())
  channel.subscribe()

  const intervalId = setInterval(onChange, fallbackMs)

  return () => {
    clearInterval(intervalId)
    supabase.removeChannel(channel)
  }
}
