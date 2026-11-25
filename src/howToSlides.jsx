/* eslint-disable react-refresh/only-export-components -- static slide content with small local helpers */
// The "How to play" slides for the Escape Room (shown on the projector when the race starts)

function Phone({ children }) {
  return <div className="w-56 rounded-[1.6rem] border-4 border-slate-600 bg-[#111822] p-3 text-white shadow-xl">{children}</div>
}

export const SLIDES = [
  {
    title: 'A chain of locks',
    text: 'Every team races through its own chain of locks at the same time. Each lock is a question you answer by typing it, not by picking from choices. Small typos are forgiven.',
    art: (
      <div className="flex gap-2 text-3xl">
        <span>🔓</span><span>🔓</span><span className="rounded-lg bg-amber-400/30 px-1">🔒</span><span className="opacity-40">🔒</span><span className="opacity-40">🔒</span><span className="opacity-40">🔒</span>
      </div>
    ),
  },
  {
    title: 'The key-holder types',
    text: 'One teammate holds the key for each lock and types the answer. The key passes to the next teammate every lock, so everyone takes a turn while the team helps.',
    art: (
      <Phone>
        <p className="text-xs font-bold text-amber-400">🔑 YOU HOLD THE KEY · LOCK 3</p>
        <p className="mt-1 text-sm font-bold">Name the tissue that lines the air sacs of the lungs.</p>
        <p className="mt-2 rounded-lg border-2 border-amber-400 bg-black/40 px-3 py-2 font-mono text-sm">simple squamous</p>
        <p className="mt-2 rounded-lg bg-amber-400 py-2 text-center font-black text-black">Unlock</p>
      </Phone>
    ),
  },
  {
    title: 'Three guesses per lock',
    text: 'Each wrong guess adds time to your team\'s clock: 15, then 30, then 45 seconds. After the third miss, the answer is shown and that question comes back 3 locks later.',
    art: (
      <div className="space-y-2 text-lg font-black">
        <p className="rounded-xl bg-red-500/20 px-4 py-2 text-red-300">⛔ Miss 1 · +15 s</p>
        <p className="rounded-xl bg-red-500/20 px-4 py-2 text-red-300">⛔ Miss 2 · +30 s</p>
        <p className="rounded-xl bg-red-500/20 px-4 py-2 text-red-300">⛔ Miss 3 · +45 s, answer shown</p>
      </div>
    ),
  },
  {
    title: 'Hints cost time',
    text: 'Stuck? A hint shows the first letter and length of each word, but adds 60 seconds to your time.',
    art: <p className="rounded-xl border-2 border-dashed border-amber-400 px-5 py-4 font-mono text-2xl font-black tracking-widest text-amber-300">S _ _ _ _ _ &nbsp; S _ _ _ _ _ _ _</p>,
  },
  {
    title: 'Escape first',
    text: 'When the first team opens its last lock, everyone else gets a 5-minute countdown. The fastest time (plus penalties) wins.',
    art: <p className="rounded-xl border-2 border-red-500 bg-red-500/10 px-6 py-4 text-center font-mono text-5xl font-black text-red-400">4:59</p>,
  },
]
