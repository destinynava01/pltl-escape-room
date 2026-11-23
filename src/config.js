// Change these to rebrand and re-tune the game.
export const SITE_NAME = 'PLTL Escape Room'
export const SITE_TAGLINE = 'Answer to unlock. First team out wins.'

// Locks per game (the server allows 3 to 12) and the time added for each hint
export const LOCK_CHOICES = [4, 6, 8, 10]
export const DEFAULT_LOCKS = 6
export const DEFAULT_HINT_PENALTY = 60

// Teams: the lobby starts with MIN_TEAMS and lets the leader add up to MAX_TEAMS.
// (The server enforces the same limits and uses the same team colors.)
export const MIN_TEAMS = 2
export const MAX_TEAMS = 8
export const TEAM_COLORS = ['#2563eb', '#9333ea', '#0891b2', '#be185d', '#4d7c0f', '#c2410c', '#475569', '#0f766e']

// Lab questions are the same for every professor, so they're filed under this one shared "professor".
// The submit form and the review editor start with it filled in.
export const LAB_PROFESSOR = 'Laboratory'
