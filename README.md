# PLTL Escape Room

A study game for PLTL sessions. Teams race through a chain of **locks**. Each lock is an open-response
question that students answer by typing on their phones, and a right answer opens the next lock. First
team out wins.

Stack: React 19 + Vite + Tailwind 4 (this site). The backend is the **same Supabase project as the PLTL
Jeopardy and Monopoly sites**: Escape Room reads the same approved questions, subjects, courses and
reviewers, and plays only the **open-response** ones.

## How a game works

1. **Lobby** (`/`): create a game, show the join code / QR, name the teams, approve students onto teams,
   pick subject > course > (professor) > chapters, and choose how many locks (4, 6, 8 or 10).
2. **Start**: the server picks that many open-response questions at random from the chosen chapters. Every
   team gets the **same locks in its own order**, so shouting an answer across the room doesn't help.
3. **Phones** (`/join`): anyone on a team can type an answer for the team's current lock. Answers use the
   same typo-tolerant matching as Jeopardy (words in parentheses in the answer key are optional). A right
   answer opens the lock for the whole team; teammates see what the team already tried.
   - **Hint**: shows the first letter and length of each word, and adds 60 seconds to the team's time.
4. **Projector** (the leader's screen): a lane per team with its locks, the clock, and hint penalties. It
   never shows questions or answers. **Close calls** lists wrong answers that were almost right; the leader
   can show the answer key and **Accept** one to open that team's lock.
5. **End**: the game ends when every team has escaped, or when the leader selects End game (teams still
   inside are ranked by locks opened, then time). The results card has **Review questions** (with Flag for
   revision, name required) and **Download results (.xlsx)**: Summary, Locks, Attempts, Students.

Ranking: escaped teams first by total time (time + hint penalties), then everyone else by locks opened,
then time.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing card, the leader lobby, then the race (projector) |
| `/join` | Student phone screen |
| `/submit` | Public question form: open response only (model answer + accepted alternatives) |
| `/review` | Reviewers (one email sign-in): Review Queue, Question Bank, Subjects & Courses, Reviewers |

## Run it

```
npm install
copy .env.example .env.local    # Windows (use cp on Mac/Linux); then fill in the values, same Supabase project as Jeopardy
npm run dev
```

`.env.local` needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the public key only; never a
service-role key). Without them the site shows a "Setup needed" card.

## Questions

- Only **open-response** questions are used here, and only this site's review queue shows open-response
  submissions; Jeopardy and Monopoly never play them.
- A question is placed by chapter only (no Jeopardy category, no Monopoly color).
- A chapter needs at least as many approved open-response questions as the game has locks (6 by default);
  picking several chapters pools them.
- Subjects are tagged with the games that may use them. Biology is shared with Escape Room.

## Backend (in the separate `supabase-backend` repository)

| File | What it does |
|---|---|
| `supabase/migrations/20261125120000_escape_room.sql` | Tables `esc_games`, `esc_players`, `esc_progress`, `esc_attempts`; flags can point at an Escape Room game; Biology shared with Escape Room |
| `supabase/functions/esc-game` | Leader: catalog, create game, teams, students, start, race view, accept close calls, end, review, flags, results |
| `supabase/functions/esc-play` | Phones: join, status, answer, hint |
| `supabase/functions/_shared/escapeRoom.ts` | Shared rules: which questions can be locks, answer checking and close calls, hints, times and ranking |

Game rows are deleted 8 hours after a game is created, like the other games.

## Deploying

Vercel builds this repository (`vercel.json` rewrites every route to the app). Set the two `VITE_SUPABASE_...`
environment variables in the Vercel project, and add the site's address to Supabase's allowed redirect URLs
so reviewer sign-in links work.
