import { useEffect, useRef } from 'react'

// A team's locks in one row that scrolls sideways (big games have up to 30). The row slides by itself to
// keep the lock being worked on in view, so nobody has to scroll during a game.
//   count    how many locks      open   how many are open      current  the lock being worked on (or null)
//   hinted   locks a hint was used on       size  'lg' (projector) or 'sm' (phones)
export default function LockStrip({ count, open, current = null, hinted = [], size = 'lg' }) {
  const row = useRef(null)
  const focus = current ?? Math.min(open, count - 1)

  useEffect(() => {
    const strip = row.current
    const tile = strip?.children[focus]
    if (!strip || !tile) return
    strip.scrollTo({ left: tile.offsetLeft - strip.clientWidth / 2 + tile.offsetWidth / 2, behavior: 'smooth' })
  }, [focus, count])

  const tileSize = size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-9 w-9 text-lg'

  return (
    <div
      ref={row}
      className="lock-strip flex flex-nowrap gap-2 overflow-x-auto scroll-smooth py-1"
      aria-label={`${open} of ${count} locks open`}
    >
      {Array.from({ length: count }, (_, k) => {
        const isOpen = k < open
        const isCurrent = current !== null && k === current
        return (
          <span
            key={k}
            className={`relative flex shrink-0 items-center justify-center rounded-lg border-2 ${tileSize} ${
              isOpen ? 'unlock-pop border-ok bg-ok-soft box-glow-ok'
                : isCurrent ? 'animate-pulse border-accent bg-warn-soft box-glow-accent'
                : 'border-line bg-panel opacity-50 grayscale'
            }`}
            title={`Lock ${k + 1}${isOpen ? ': open' : isCurrent ? ': working on it' : ''}${hinted.includes(k) ? ' (hint used)' : ''}`}
          >
            {isOpen ? '🔓' : '🔒'}
            {size === 'lg' && <span className="absolute bottom-0.5 right-1 font-mono text-xs font-bold text-muted">{k + 1}</span>}
          </span>
        )
      })}
    </div>
  )
}
