import { useEffect, useMemo, useRef, useState } from 'react'
import { CircuitDrawing } from './drawCircuit'
import { StaticsDrawing } from './drawStatics'

// The Diagram Builder: instead of uploading a photo, draw a clean circuit or statics diagram for a question. Pick a
// layout, type the values (any text: "12 V", "R₁", "?"), and it's attached to the question as a crisp picture, the same
// way an uploaded picture is. The same file is on every question-submit page (Jeopardy, Monopoly, Escape Room).
// Its colors are its own (white and slate), so it looks the same on every site.

const num = (v, d = 0) => { const n = Number(String(v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : d }

// Each layout: its fields (key, label, default, kind) and how they become a drawing
const LAYOUTS = [
  // ---- Circuits ----
  { id: 'single', group: 'Circuits', name: 'Source and one resistor', kind: 'circuit',
    fields: [['V', 'Source', '12 V'], ['R', 'Resistor', '4 Ω']],
    build: (v) => ({ type: 'single', V: v.V, R: v.R }) },
  { id: 'seriesParallel', group: 'Circuits', name: 'Series and parallel', kind: 'circuit',
    fields: [['Vs', 'Source', '24 V'], ['R1', 'R₁ (series)', '4 Ω'], ['R2', 'R₂', '6 Ω'], ['R3', 'R₃', '3 Ω'], ['mark', 'Mark the voltage across R₂ ∥ R₃', false, 'check']],
    build: (v) => ({ type: 'seriesParallel', Vs: v.Vs, R1: v.R1, R2: v.R2, R3: v.R3, mark: v.mark ? 'Vp' : undefined }) },
  { id: 'loop', group: 'Circuits', name: 'Series loop (KVL)', kind: 'circuit',
    fields: [['Vs', 'Source', '24 V'], ['d1', 'Top element', '6 V'], ['d2', 'Right element', '8 V'], ['d3', 'Bottom element', 'V₃ = ?']],
    build: (v) => ({ type: 'loop', Vs: v.Vs, drops: [v.d1, v.d2, v.d3] }) },
  { id: 'node', group: 'Circuits', name: 'Junction (KCL)', kind: 'circuit',
    fields: [['b0', 'Left wire', '3 A'], ['d0', 'Left direction', 'in', ['in', 'out']], ['b1', 'Top wire', '2 A'], ['d1', 'Top direction', 'in', ['in', 'out']],
      ['b2', 'Right wire', '4 A'], ['d2', 'Right direction', 'out', ['in', 'out']], ['b3', 'Bottom wire', 'I = ?'], ['d3', 'Bottom direction', 'out', ['in', 'out']]],
    build: (v) => ({ type: 'node', branches: [0, 1, 2, 3].map((i) => ({ label: v[`b${i}`], dir: v[`d${i}`] })) }) },
  { id: 'nodal', group: 'Circuits', name: 'Two sources, one node (nodal)', kind: 'circuit',
    fields: [['V1', 'V₁', '12 V'], ['V2', 'V₂', '6 V'], ['R1', 'R₁', '2 Ω'], ['R2', 'R₂', '3 Ω'], ['R3', 'R₃ (to ground)', '6 Ω']],
    build: (v) => ({ type: 'twoSource', V1: v.V1, V2: v.V2, R1: v.R1, R2: v.R2, R3: v.R3 }) },
  { id: 'mesh', group: 'Circuits', name: 'Two meshes', kind: 'circuit',
    fields: [['V1', 'V₁', '12 V'], ['V2', 'V₂', '6 V'], ['R1', 'R₁', '2 Ω'], ['R2', 'R₂', '3 Ω'], ['R3', 'R₃ (shared)', '4 Ω']],
    build: (v) => ({ type: 'twoSource', V1: v.V1, V2: v.V2, R1: v.R1, R2: v.R2, R3: v.R3, mesh: true }) },
  { id: 'superpos', group: 'Circuits', name: 'Voltage and current source', kind: 'circuit',
    fields: [['Vs', 'Voltage source', '12 V'], ['Is', 'Current source', '2 A'], ['R1', 'R₁', '4 Ω'], ['R2', 'R₂', '4 Ω'], ['off', 'Turned off', 'none', ['none', 'Vs', 'Is']]],
    build: (v) => ({ type: 'superpos', Vs: v.Vs, Is: v.Is, R1: v.R1, R2: v.R2, off: v.off === 'none' ? undefined : v.off }) },
  { id: 'thevenin', group: 'Circuits', name: 'Thevenin (terminals a–b)', kind: 'circuit',
    fields: [['Vs', 'Source', '24 V'], ['R1', 'R₁', '6 Ω'], ['R2', 'R₂', '3 Ω'], ['R3', 'R₃', '2 Ω'], ['load', 'Show a load R_L', false, 'check']],
    build: (v) => ({ type: 'thevenin', Vs: v.Vs, R1: v.R1, R2: v.R2, R3: v.R3, load: v.load }) },
  // ---- Statics ----
  { id: 'beam', group: 'Statics', name: 'Beam with supports and loads', kind: 'statics',
    fields: [['L', 'Length (m)', '6'], ['ka', 'Left support', 'pin', ['pin', 'roller', 'fixed']], ['xa', 'Left support at (m)', '0'],
      ['kb', 'Second support', 'roller', ['roller', 'pin', 'none']], ['xb', 'Second support at (m)', '6'],
      ['p1x', 'Load 1 at (m)', '2'], ['p1', 'Load 1', '10 kN'], ['p2x', 'Load 2 at (m)', ''], ['p2', 'Load 2', ''],
      ['wx1', 'Spread load from (m)', ''], ['wx2', 'Spread load to (m)', ''], ['w', 'Spread load', '']],
    build: (v) => {
      const L = Math.max(0.5, num(v.L, 6))
      const supports = [{ x: Math.min(L, Math.max(0, num(v.xa))), kind: v.ka, label: 'A' }]
      if (v.ka !== 'fixed' && v.kb !== 'none') supports.push({ x: Math.min(L, Math.max(0, num(v.xb, L))), kind: v.kb, label: 'B' })
      if (v.ka === 'fixed') supports[0].x = 0
      const loads = [[v.p1x, v.p1], [v.p2x, v.p2]].filter(([x, f]) => String(x).trim() !== '' && String(f).trim() !== '').map(([x, f]) => ({ x: Math.min(L, Math.max(0, num(x))), F: f }))
      const dist = String(v.w).trim() && String(v.wx1).trim() !== '' && String(v.wx2).trim() !== '' ? [{ x1: Math.max(0, num(v.wx1)), x2: Math.min(L, num(v.wx2, L)), w: v.w }] : []
      return { type: 'beam', L, supports, loads, dist }
    } },
  { id: 'ropes', group: 'Statics', name: 'Weight hanging from two ropes', kind: 'statics',
    fields: [['a1', 'Left rope angle (°)', '30'], ['a2', 'Right rope angle (°)', '45'], ['W', 'Weight', '200 N']],
    build: (v) => ({ type: 'ropes', a1: Math.min(85, Math.max(10, num(v.a1, 30))), a2: Math.min(85, Math.max(10, num(v.a2, 45))), W: v.W }) },
  { id: 'lever', group: 'Statics', name: 'Lever or crank', kind: 'statics',
    fields: [['d', 'Handle length (m)', '0.4'], ['theta', 'Pull angle (°)', '60'], ['F', 'Force', '50 N']],
    build: (v) => ({ type: 'lever', d: v.d, theta: Math.min(175, Math.max(5, num(v.theta, 60))), F: v.F }) },
  { id: 'point', group: 'Statics', name: 'Force at a point (r × F)', kind: 'statics',
    fields: [['x', 'Point x (m)', '3'], ['y', 'Point y (m)', '2'], ['Fx', 'Force x-part (direction)', '2'], ['Fy', 'Force y-part (direction)', '-1']],
    build: (v) => ({ type: 'point', x: Math.min(5, Math.max(0, num(v.x, 3))), y: Math.min(3, Math.max(0, num(v.y, 2))), Fx: num(v.Fx, 1) || 0.001, Fy: num(v.Fy, 1) }) },
  { id: 'shape', group: 'Statics', name: 'Composite shape (centroid)', kind: 'statics',
    fields: [['w1', 'Rectangle 1 width (m)', '4'], ['h1', 'Rectangle 1 height (m)', '1'], ['x2', 'Rectangle 2 left edge x (m)', '0'], ['y2', 'Rectangle 2 bottom y (m)', '1'],
      ['w2', 'Rectangle 2 width (m)', '1'], ['h2', 'Rectangle 2 height (m)', '3'], ['hr', 'Hole radius (m, blank for none)', ''], ['hx', 'Hole center x (m)', ''], ['hy', 'Hole center y (m)', '']],
    build: (v) => {
      const rects = [{ x: 0, y: 0, w: Math.max(0.2, num(v.w1, 4)), h: Math.max(0.2, num(v.h1, 1)) }]
      if (num(v.w2) > 0 && num(v.h2) > 0) rects.push({ x: num(v.x2), y: num(v.y2), w: num(v.w2), h: num(v.h2) })
      const hole = num(v.hr) > 0 ? { x: num(v.hx), y: num(v.hy), r: num(v.hr) } : undefined
      return { type: 'shape', rects, hole }
    } },
]

const defaults = (layout) => Object.fromEntries(layout.fields.map(([k, , d]) => [k, d]))

// The drawing as a PNG file, drawn from the SVG at 3x so lines and labels stay sharp
async function toPng(svg) {
  const vb = svg.viewBox.baseVal
  const scale = 3
  const clone = svg.cloneNode(true)
  clone.setAttribute('width', String(vb.width * scale))
  clone.setAttribute('height', String(vb.height * scale))
  const text = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = vb.width * scale
    canvas.height = vb.height * scale
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    return new File([blob], 'diagram.png', { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function DiagramBuilder({ onAttach, onClose }) {
  const [layoutId, setLayoutId] = useState('seriesParallel')
  const layout = LAYOUTS.find((l) => l.id === layoutId)
  const [values, setValues] = useState(() => defaults(layout))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const svgRef = useRef(null)
  const figure = useMemo(() => { try { return layout.build(values) } catch { return null } }, [layout, values])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function choose(id) {
    const next = LAYOUTS.find((l) => l.id === id)
    setLayoutId(id)
    setValues(defaults(next))
  }
  async function attach() {
    if (!svgRef.current) return
    setBusy(true)
    setError('')
    try {
      onAttach(await toPng(svgRef.current))
    } catch {
      setError('Could not make the picture. Try again, or upload a picture instead.')
      setBusy(false)
    }
  }

  const input = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-600'
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 text-left" role="dialog" aria-modal="true" aria-label="Draw a diagram">
      <section className="my-auto w-full max-w-5xl rounded-xl bg-white p-5 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold">✏️ Draw a diagram</p>
            <p className="text-sm text-slate-600">Pick a layout and type the labels (values, names, or &quot;?&quot; for what students find). It&apos;s attached as a picture.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-2.5 py-0.5 font-bold hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        <div className="mt-4 grid gap-5 md:grid-cols-[15rem_1fr]">
          <div className="space-y-3">
            {['Circuits', 'Statics'].map((g) => (
              <div key={g}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{g}</p>
                <div className="mt-1 space-y-1">
                  {LAYOUTS.filter((l) => l.group === g).map((l) => (
                    <button key={l.id} type="button" onClick={() => choose(l.id)}
                      className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-semibold ${l.id === layoutId ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{l.name}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="overflow-hidden rounded-lg border border-slate-300">
              {layout.kind === 'circuit' ? <CircuitDrawing figure={figure} svgRef={svgRef} /> : <StaticsDrawing figure={figure} svgRef={svgRef} />}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {layout.fields.map(([key, label, , options]) => (
                <label key={key} className={`block ${options === 'check' ? 'sm:col-span-2' : ''}`}>
                  {options === 'check' ? (
                    <span className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(values[key])} onChange={(e) => setValues({ ...values, [key]: e.target.checked })} className="h-4 w-4" />{label}</span>
                  ) : (
                    <>
                      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
                      {Array.isArray(options)
                        ? <select className={input} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                        : <input className={input} value={values[key]} maxLength={24} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />}
                    </>
                  )}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Tip: write a subscript with an underscore (V_s, R_L), or use ₁ ₂ ₃. Leave a load blank to leave it out.</p>
            {error && <p className="mt-2 text-sm font-bold text-red-700">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={busy || !figure} onClick={attach} className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:brightness-110 disabled:opacity-50">{busy ? 'Attaching…' : 'Attach to the question'}</button>
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-bold hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
