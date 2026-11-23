// Shared building blocks that carry the site's look (steel, paper, brass, black outlines).

export function Page({ children }) {
  return <main className="min-h-dvh bg-board p-4 text-ink sm:p-6">{children}</main>
}

export function CenterCard({ title, children }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-board p-4 text-ink">
      <div className="w-full max-w-md rounded-2xl border-2 border-ink bg-card p-8 text-center shadow-xl">
        <h1 className="text-3xl font-black uppercase tracking-wide text-accent">{title}</h1>
        {children}
      </div>
    </main>
  )
}

export function Label({ children }) {
  return <p className="text-sm font-bold uppercase tracking-widest text-emerald-800">{children}</p>
}

const BUTTONS = {
  primary: 'border-2 border-ink bg-accent text-white hover:opacity-90',
  accent: 'border-2 border-ink bg-emerald-700 text-white hover:bg-emerald-600',
  success: 'border-2 border-ink bg-green-600 text-white hover:bg-green-500',
  danger: 'border-2 border-ink bg-orange-600 text-white hover:bg-orange-500',
  outline: 'border-2 border-ink bg-white text-ink hover:bg-amber-100',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-lg px-6 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-40 ${BUTTONS[variant]} ${className}`}
      {...props}
    />
  )
}

// One die face drawn with pips
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
export function DieFace({ n, size = 'h-16 w-16' }) {
  return (
    <div className={`grid ${size} grid-cols-3 grid-rows-3 gap-1 rounded-xl border-2 border-ink bg-white p-2 shadow-md`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`m-auto h-2.5 w-2.5 rounded-full ${PIPS[n]?.includes(i) ? 'bg-ink' : ''}`} />
      ))}
    </div>
  )
}
