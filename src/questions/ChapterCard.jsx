import { useState } from 'react'

// A default game has 6 locks, each asking one question from the chapter
const LOCKS_PER_GAME = 6

// One chapter: how many approved questions it has toward a full game (when it carries a `questionCount`), and
// (when it carries a `questions` list) a click-to-open list of them, including ones still waiting for review.
export default function ChapterCard({ chapter, highlight = false }) {
  const [open, setOpen] = useState(false)
  const counted = typeof chapter.questionCount === 'number'
  const count = chapter.questionCount ?? 0
  const ready = count >= LOCKS_PER_GAME
  const questions = Array.isArray(chapter.questions) ? chapter.questions : []

  return (
    <article
      className={`rounded-lg border bg-white p-3 text-sm ${highlight ? 'border-accent' : 'border-neutral-400'}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold">
          {chapter.topic}
          {highlight && <span className="ml-2 text-xs font-bold text-accent">(your chapter)</span>}
        </span>
        {counted && (
          <span className={`shrink-0 text-xs font-bold ${ready ? 'text-green-700' : 'text-accent'}`}>
            {ready ? 'Enough for a game ✓' : `${count}/${LOCKS_PER_GAME}`}
          </span>
        )}
      </div>

      {counted && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card" aria-hidden="true">
          <div
            className={`h-full rounded-full ${ready ? 'bg-green-600' : 'bg-accent'}`}
            style={{ width: `${Math.min(1, count / LOCKS_PER_GAME) * 100}%` }}
          />
        </div>
      )}

      <p className="mt-2 text-xs text-neutral-600">
        {counted
          ? `${count} approved question${count === 1 ? '' : 's'} (${LOCKS_PER_GAME} needed for a ${LOCKS_PER_GAME}-lock game)`
          : `${questions.length} question${questions.length === 1 ? '' : 's'}`}
        {chapter.pendingCount > 0 && ` · ${chapter.pendingCount} waiting for review`}
      </p>

      {questions.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="mt-2 text-xs font-bold text-emerald-800 underline decoration-dotted hover:text-emerald-600"
          >
            {open ? '▾ Hide questions' : '▸ Show questions'}
          </button>

          {open && (
            <ul className="mt-2 space-y-1 rounded-md bg-card p-2 text-xs">
              {questions.map((question, index) => (
                <li key={index} className="text-ink">
                  {question.question_text}
                  {question.has_picture && <span className="ml-1 text-neutral-600">🖼️</span>}
                  {question.status === 'pending' && (
                    <span className="ml-1 text-[10px] font-bold uppercase text-accent">waiting for review</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  )
}
