import { useEffect, useState } from 'react'
import PictureZoom from './PictureZoom'
import QuestionImage from './QuestionImage'

// "Preview in game": the question as a lock on a student's phone (the projector doesn't show questions
// in Escape Room). `question` is { question_text, image_path, answer_text, accepted_answers }.
export default function GamePreviewButton({ question, lockNumber = 1, className = '' }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-info px-3 py-1.5 text-xs font-bold text-info hover:bg-hover ${className}`}
      >
        👁 Preview in game
      </button>
      {open && <PreviewDialog question={question} lockNumber={lockNumber} onClose={() => setOpen(false)} />}
    </>
  )
}

function PreviewDialog({ question, lockNumber, onClose }) {
  const [revealed, setRevealed] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (zoomed) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, zoomed])

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="mx-auto flex max-w-md flex-col gap-4 py-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-widest text-white">Student phone</p>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-panel px-3 py-1.5 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={revealed}
                onChange={(event) => setRevealed(event.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              Show answer
            </label>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-bold text-on-accent hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>

        <PhoneView question={question} lockNumber={lockNumber} revealed={revealed} onZoom={() => setZoomed(true)} />

        {zoomed && question.image_path && (
          <PictureZoom
            path={question.image_path}
            title="Question picture"
            onClose={() => setZoomed(false)}
            panel={<ZoomPanel question={question} lockNumber={lockNumber} onBack={() => setZoomed(false)} />}
          />
        )}

        <p className="text-center text-xs text-neutral-300">
          Preview only. Nothing is saved or sent to a game.
        </p>
      </div>
    </div>
  )
}

const alternativesOf = (question) => (question.accepted_answers ?? []).map((a) => a.trim()).filter(Boolean)

// One lock as a student sees it, inside a phone-sized frame
function PhoneView({ question, lockNumber, revealed, onZoom }) {
  const alternatives = alternativesOf(question)

  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border-4 border-line bg-panel p-4 text-ink shadow-2xl">
      <div className="rounded-2xl bg-card p-5 shadow-xl">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-info">
          🔒 Lock {lockNumber}
        </p>
        <h1 className="mt-3 text-center text-xl font-bold">
          {question.question_text || <span className="italic text-muted">(no question text yet)</span>}
        </h1>

        <ZoomablePicture path={question.image_path} className="mt-3 max-h-56" onZoom={onZoom} />

        <div className="mt-4 space-y-2">
          <input
            disabled
            placeholder="Type your answer"
            aria-label="Answer (disabled in the preview)"
            className="w-full rounded-lg border-2 border-line bg-panel px-3 py-3 text-ink placeholder-muted"
          />
          <div className="rounded-lg bg-accent px-4 py-3 text-center font-bold text-on-accent opacity-60">Unlock</div>
        </div>

        {revealed ? (
          <div className="mt-4 rounded-lg border-2 border-ok bg-ok-soft p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-ok">Answer</p>
            <p className="mt-1 font-bold text-ink">{question.answer_text?.trim() || '(no answer yet)'}</p>
            {alternatives.length > 0 && (
              <p className="mt-1 text-sm text-muted">Also accepted: {alternatives.join(', ')}</p>
            )}
            <p className="mt-2 text-xs text-muted">Words in parentheses are optional.</p>
          </div>
        ) : (
          <p className="mt-3 text-center text-sm text-muted">Type the answer to open this lock.</p>
        )}
      </div>
    </div>
  )
}

// The question picture with the same zoom tag the game shows
function ZoomablePicture({ path, className, onZoom }) {
  if (!path) return null

  return (
    <button type="button" onClick={onZoom} className={`group relative mx-auto block ${className.split(' ').filter((c) => c.startsWith('mt-')).join(' ')}`} aria-label="Zoom in on the picture">
      <QuestionImage path={path} className={className.split(' ').filter((c) => !c.startsWith('mt-')).join(' ')} />
      <span className="absolute bottom-2 right-2 rounded-md bg-panel px-2 py-1 text-xs font-bold text-accent group-hover:bg-warn-soft">
        🔍 Tap to zoom
      </span>
    </button>
  )
}

// What sits beside the zoomed picture
function ZoomPanel({ question, lockNumber, onBack }) {
  return (
    <div className="text-center text-ink">
      <p className="text-xs font-bold uppercase tracking-widest text-info">🔒 Lock {lockNumber}</p>
      <p className="mt-1 text-sm font-bold">{question.question_text}</p>
      <button type="button" onClick={onBack} className="mt-3 w-full rounded-lg bg-accent px-4 py-2 font-bold text-on-accent">
        Back to the lock
      </button>
    </div>
  )
}
