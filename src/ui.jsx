// Shared building blocks that carry the site's look (a dark vault: steel panels, hazard amber, alarm red).

export function Page({ children }) {
  return <main className="vault-bg min-h-dvh p-4 text-ink sm:p-6">{children}</main>
}

// Yellow-and-black tape across the top of a card or screen
export function HazardTape({ className = 'h-2' }) {
  return <div aria-hidden="true" className={`hazard ${className}`} />
}

export function CenterCard({ title, children }) {
  return (
    <main className="vault-bg flex min-h-dvh items-center justify-center p-4 text-ink">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-line bg-card text-center shadow-2xl">
        <HazardTape />
        <div className="p-8">
          <h1 className="font-display text-3xl font-black uppercase tracking-widest text-accent glow-accent">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}

export function Label({ children }) {
  return <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-info">{children}</p>
}

const BUTTONS = {
  primary: 'border-2 border-line bg-accent text-on-accent hover:opacity-90',
  accent: 'border-2 border-line bg-info text-on-accent hover:brightness-110',
  success: 'border-2 border-line bg-ok text-on-accent hover:brightness-110',
  danger: 'border-2 border-line bg-bad text-on-accent hover:brightness-110',
  outline: 'border-2 border-line bg-panel text-ink hover:bg-hover',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-lg px-6 py-3 font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${BUTTONS[variant]} ${className}`}
      {...props}
    />
  )
}

// One die face drawn with pips
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
export function DieFace({ n, size = 'h-16 w-16' }) {
  return (
    <div className={`grid ${size} grid-cols-3 grid-rows-3 gap-1 rounded-xl border-2 border-line bg-panel p-2 shadow-md`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`m-auto h-2.5 w-2.5 rounded-full ${PIPS[n]?.includes(i) ? 'bg-ink' : ''}`} />
      ))}
    </div>
  )
}
