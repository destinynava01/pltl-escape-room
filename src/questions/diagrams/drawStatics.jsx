// Statics drawings for the Diagram Builder (the same drawings Treehouse Builders uses): a beam with its supports and
// loads, a weight on two ropes, a lever, a force at a point, a composite shape. Neutral engineering colors on white.

const WOOD = '#cbd5e1', WOOD_DARK = '#334155', ROPE = '#475569', LOAD = '#dc2626', INK = '#0f172a', SOFT = '#64748b', GROUND = '#475569'

function Arrow({ x1, y1, x2, y2, color = LOAD, width = 3 }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const h = 9
  const p = (d) => `${x2 - h * Math.cos(a + d)},${y2 - h * Math.sin(a + d)}`
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - 6 * Math.cos(a)} y2={y2 - 6 * Math.sin(a)} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${p(0.45)} ${p(-0.45)}`} fill={color} />
    </g>
  )
}
const Label = ({ x, y, children, anchor = 'middle', color = INK, size = 13, weight = 700 }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} paintOrder="stroke" stroke="#ffffff" strokeWidth="3">{children}</text>
)

// One support drawn under (or beside) the point (x, y) of the plank
function SupportMark({ kind, x, y, label, left }) {
  if (kind === 'fixed') {
    return (
      <g>
        <rect x={x - 26} y={y - 46} width="24" height="92" rx="6" fill={WOOD_DARK} />
        {[0, 1, 2, 3].map((i) => <line key={i} x1={x - 24} y1={y - 36 + i * 22} x2={x - 6} y2={y - 26 + i * 22} stroke="#1e293b" strokeWidth="2" />)}
        <Label x={x - 34} y={y + 4}>{label}</Label>
      </g>
    )
  }
  if (kind === 'rope') {
    return (
      <g>
        <line x1={x} y1={y - 6} x2={x + (left ? -14 : 14)} y2={18} stroke={ROPE} strokeWidth="3" />
        <rect x={x + (left ? -40 : -10)} y={10} width="50" height="10" rx="5" fill={WOOD_DARK} />
        <Label x={x + (left ? -22 : 22)} y={y - 18}>{label}</Label>
      </g>
    )
  }
  const tri = <polygon points={`${x},${y + 6} ${x - 12},${y + 26} ${x + 12},${y + 26}`} fill="#e2e8f0" stroke={INK} strokeWidth="2" />
  return (
    <g>
      {tri}
      {kind === 'pin' && <circle cx={x} cy={y + 6} r="3.5" fill={INK} />}
      {kind === 'roller' && [x - 6, x + 6].map((cx) => <circle key={cx} cx={cx} cy={y + 31} r="4.5" fill="#fff" stroke={INK} strokeWidth="2" />)}
      <line x1={x - 20} y1={y + (kind === 'roller' ? 37 : 27)} x2={x + 20} y2={y + (kind === 'roller' ? 37 : 27)} stroke={GROUND} strokeWidth="3" />
      <Label x={x + (left ? -22 : 22)} y={y + 24}>{label}</Label>
    </g>
  )
}

function Beam({ f }) {
  const x0 = f.supports.some((s) => s.kind === 'fixed') ? 70 : 40
  const sx = (x) => x0 + (x / f.L) * (360 - x0)
  const y = 108
  const ticks = [...new Set([0, f.L, ...f.supports.map((s) => s.x), ...f.loads.map((l) => l.x), ...(f.dist ?? []).flatMap((d) => [d.x1, d.x2])])].sort((a, b) => a - b)
  return (
    <>
      {(f.dist ?? []).map((d, i) => {
        const n = Math.max(3, Math.round((sx(d.x2) - sx(d.x1)) / 22))
        return (
          <g key={i}>
            <line x1={sx(d.x1)} y1={66} x2={sx(d.x2)} y2={66} stroke={LOAD} strokeWidth="2" />
            {Array.from({ length: n + 1 }, (_, k) => sx(d.x1) + (k / n) * (sx(d.x2) - sx(d.x1))).map((x) => <Arrow key={x} x1={x} y1={66} x2={x} y2={y - 8} width={2} />)}
            <Label x={(sx(d.x1) + sx(d.x2)) / 2} y={58} color={LOAD}>{d.w}</Label>
          </g>
        )
      })}
      <rect x={x0} y={y - 8} width={360 - x0} height="14" rx="3" fill={WOOD} stroke={WOOD_DARK} strokeWidth="2" />
      {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={x0 + t * (360 - x0)} y1={y - 8} x2={x0 + t * (360 - x0)} y2={y + 6} stroke={WOOD_DARK} strokeWidth="1" opacity="0.5" />)}
      {f.supports.map((s, i) => <SupportMark key={i} kind={s.kind} x={sx(s.x)} y={y + 6} label={s.label} left={s.x === 0} />)}
      {f.loads.map((l, i) => (
        <g key={i}>
          <Arrow x1={sx(l.x)} y1={(f.dist ?? []).length ? 30 : 46} x2={sx(l.x)} y2={y - 9} />
          <Label x={sx(l.x)} y={(f.dist ?? []).length ? 24 : 40} color={LOAD}>{l.F}</Label>
        </g>
      ))}
      <line x1={x0} y1={186} x2={360} y2={186} stroke={SOFT} strokeWidth="1" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} y1={181} x2={sx(t)} y2={191} stroke={SOFT} strokeWidth="1.5" />
          <text x={sx(t)} y={178} textAnchor="middle" fontSize="11" fill={SOFT}>{Number(t.toFixed(2))} m</text>
        </g>
      ))}
    </>
  )
}

function Ropes({ f }) {
  const k = { x: 200, y: 120 }
  const end = (deg, dir) => {
    const t = (deg * Math.PI) / 180, len = (k.y - 22) / Math.sin(t)
    return { x: k.x + dir * len * Math.cos(t), y: 22 }
  }
  const L = end(f.a1, -1), R = end(f.a2, 1)
  return (
    <>
      <rect x="20" y="10" width="360" height="12" rx="6" fill={WOOD_DARK} />
      <line x1={k.x} y1={k.y} x2={L.x} y2={L.y} stroke={ROPE} strokeWidth="3" />
      <line x1={k.x} y1={k.y} x2={R.x} y2={R.y} stroke={ROPE} strokeWidth="3" />
      <line x1={k.x - 90} y1={k.y} x2={k.x + 90} y2={k.y} stroke={SOFT} strokeDasharray="4 4" />
      <path d={`M ${k.x - 40} ${k.y} A 40 40 0 0 1 ${k.x - 40 * Math.cos((f.a1 * Math.PI) / 180)} ${k.y - 40 * Math.sin((f.a1 * Math.PI) / 180)}`} fill="none" stroke={INK} />
      <path d={`M ${k.x + 40} ${k.y} A 40 40 0 0 0 ${k.x + 40 * Math.cos((f.a2 * Math.PI) / 180)} ${k.y - 40 * Math.sin((f.a2 * Math.PI) / 180)}`} fill="none" stroke={INK} />
      <Label x={k.x - 58} y={k.y - 10}>{f.a1}°</Label>
      <Label x={k.x + 58} y={k.y - 10}>{f.a2}°</Label>
      <line x1={k.x} y1={k.y} x2={k.x} y2={k.y + 20} stroke={ROPE} strokeWidth="3" />
      <path d={`M ${k.x - 22} ${k.y + 20} L ${k.x + 22} ${k.y + 20} L ${k.x + 17} ${k.y + 56} L ${k.x - 17} ${k.y + 56} Z`} fill="#94a3b8" stroke={INK} strokeWidth="2" />
      <circle cx={k.x} cy={k.y} r="5" fill={INK} />
      <Label x={k.x + 50} y={k.y + 44} color={LOAD}>{f.W}</Label>
      <Label x={L.x + 18} y={L.y + 20} size={11} color={SOFT}>left rope</Label>
      <Label x={R.x - 18} y={R.y + 20} size={11} color={SOFT}>right rope</Label>
    </>
  )
}

function Swing({ f }) {
  const t = (f.phi * Math.PI) / 180, p = { x: 220, y: 16 }, len = 140
  const s = { x: p.x + len * Math.sin(t), y: p.y + len * Math.cos(t) }
  return (
    <>
      <rect x="120" y="8" width="220" height="12" rx="6" fill={WOOD_DARK} />
      <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 150} stroke={SOFT} strokeDasharray="4 4" />
      <line x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke={ROPE} strokeWidth="3" />
      <path d={`M ${p.x} ${p.y + 50} A 50 50 0 0 0 ${p.x + 50 * Math.sin(t)} ${p.y + 50 * Math.cos(t)}`} fill="none" stroke={INK} />
      <Label x={p.x + 18} y={p.y + 72}>{f.phi}°</Label>
      <rect x={s.x - 18} y={s.y} width="36" height="8" rx="3" fill={WOOD} stroke={WOOD_DARK} />
      <circle cx={s.x} cy={s.y - 14} r="11" fill="#fbbf24" stroke={INK} strokeWidth="2" />
      <Arrow x1={s.x - 110} y1={s.y + 4} x2={s.x - 22} y2={s.y + 4} color="#2563eb" />
      <Label x={s.x - 70} y={s.y - 6} color="#2563eb">push P = ?</Label>
      <Label x={s.x} y={s.y + 32} color={LOAD}>{f.W}</Label>
    </>
  )
}

function Lever({ f }) {
  const o = { x: 110, y: 130 }, len = 190
  const e = { x: o.x + len, y: o.y }
  const t = (f.theta * Math.PI) / 180
  const tip = { x: e.x + 80 * Math.cos(t), y: e.y - 80 * Math.sin(t) }
  return (
    <>
      <circle cx={o.x} cy={o.y} r="34" fill="none" stroke={WOOD_DARK} strokeWidth="8" />
      <circle cx={o.x} cy={o.y} r="6" fill={INK} />
      <rect x={o.x} y={o.y - 5} width={len} height="10" rx="5" fill={WOOD} stroke={WOOD_DARK} strokeWidth="2" />
      <Arrow x1={e.x} y1={e.y} x2={tip.x} y2={tip.y} />
      <path d={`M ${e.x + 36} ${e.y} A 36 36 0 0 0 ${e.x + 36 * Math.cos(t)} ${e.y - 36 * Math.sin(t)}`} fill="none" stroke={INK} />
      <Label x={e.x + 50} y={e.y - 8}>{f.theta}°</Label>
      <Label x={tip.x} y={tip.y - 8} color={LOAD}>{f.F}</Label>
      <line x1={o.x} y1={o.y + 26} x2={e.x} y2={e.y + 26} stroke={SOFT} />
      <Label x={(o.x + e.x) / 2} y={o.y + 44} color={SOFT}>{f.d} m</Label>
      <Label x={o.x} y={o.y + 56} size={11} color={SOFT}>axle</Label>
    </>
  )
}

function Point({ f }) {
  const o = { x: 60, y: 176 }, s = 50
  const p = { x: o.x + f.x * s, y: o.y - f.y * s }
  const m = Math.max(Math.abs(f.Fx), Math.abs(f.Fy))
  const tip = { x: p.x + (f.Fx / m) * 60, y: p.y - (f.Fy / m) * 60 }
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => <line key={`v${i}`} x1={o.x + i * s} y1={o.y} x2={o.x + i * s} y2={20} stroke="#e2e8f0" />)}
      {[1, 2, 3].map((i) => <line key={`h${i}`} x1={o.x} y1={o.y - i * s} x2={380} y2={o.y - i * s} stroke="#e2e8f0" />)}
      <Arrow x1={o.x} y1={o.y} x2={385} y2={o.y} color={SOFT} width={2} />
      <Arrow x1={o.x} y1={o.y} x2={o.x} y2={12} color={SOFT} width={2} />
      <Label x={o.x - 12} y={o.y + 4}>O</Label>
      {[1, 2, 3, 4, 5].map((i) => <text key={i} x={o.x + i * s} y={o.y + 16} textAnchor="middle" fontSize="11" fill={SOFT}>{i}</text>)}
      {[1, 2, 3].map((i) => <text key={i} x={o.x - 10} y={o.y - i * s + 4} textAnchor="end" fontSize="11" fill={SOFT}>{i}</text>)}
      <line x1={o.x} y1={o.y} x2={p.x} y2={p.y} stroke="#2563eb" strokeDasharray="5 4" strokeWidth="2" />
      <circle cx={p.x} cy={p.y} r="5" fill={INK} />
      <Arrow x1={p.x} y1={p.y} x2={tip.x} y2={tip.y} />
      <Label x={tip.x + 10} y={Math.max(16, Math.min(190, tip.y + 4))} anchor="start" color={LOAD}>F</Label>
      <Label x={p.x + 12} y={p.y + 16} anchor="start" size={11}>({f.x}, {f.y}) m</Label>
    </>
  )
}

function Truss({ f }) {
  const xs = f.nodes.map((n) => n.x), ys = f.nodes.map((n) => n.y)
  const w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1
  const sc = Math.min(300 / w, 96 / h)
  const at = (id) => { const n = f.nodes.find((k) => k.id === id); return { x: 200 + (n.x - (Math.min(...xs) + w / 2)) * sc, y: 160 - (n.y - Math.min(...ys)) * sc } }
  const hi = (m) => f.highlight && ((m[0] === f.highlight[0] && m[1] === f.highlight[1]) || (m[0] === f.highlight[1] && m[1] === f.highlight[0]))
  return (
    <>
      {f.members.map((m, i) => {
        const a = at(m[0]), b = at(m[1])
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hi(m) ? '#ea580c' : WOOD} strokeWidth={hi(m) ? 9 : 7} strokeLinecap="round" />
            <text x={(a.x + b.x) / 2 + (a.y === b.y ? 0 : a.x < b.x === a.y > b.y ? -12 : 12)} y={(a.y + b.y) / 2 + (a.y === b.y ? 18 : 0)} textAnchor="middle" fontSize="11" fill={SOFT}>{m[0]}{m[1]}</text>
          </g>
        )
      })}
      {f.nodes.map((n) => { const p = at(n.id); return <g key={n.id}><circle cx={p.x} cy={p.y} r="6" fill="#fff" stroke={INK} strokeWidth="2" /><Label x={p.x - 12} y={p.y + (p.y > 150 ? -8 : 4)} anchor="end">{n.id}</Label></g> })}
      <SupportMark kind="pin" x={at(f.pin).x} y={at(f.pin).y} label="" />
      <SupportMark kind="roller" x={at(f.roller).x} y={at(f.roller).y} label="" />
      {f.loads.map((l) => { const p = at(l.at); return <g key={l.at}><Arrow x1={p.x} y1={p.y - 56} x2={p.x} y2={p.y - 9} /><Label x={p.x + 8} y={p.y - 48} anchor="start" color={LOAD}>{l.F}</Label></g> })}
      {f.dims && <Label x={200} y={196} size={11} color={SOFT} weight={600}>{f.dims}</Label>}
    </>
  )
}

function Shape({ f }) {
  const pts = [...f.rects.flatMap((r) => [[r.x, r.y], [r.x + r.w, r.y + r.h]]), ...(f.tri ? [[f.tri.x, f.tri.y], [f.tri.x + f.tri.w, f.tri.y + f.tri.h]] : [])]
  const W = Math.max(...pts.map((p) => p[0])), H = Math.max(...pts.map((p) => p[1]))
  const sc = Math.min(300 / W, 150 / H)
  const o = { x: 60, y: 180 }
  const X = (x) => o.x + x * sc, Y = (y) => o.y - y * sc
  return (
    <>
      {f.rects.map((r, i) => (
        <g key={i}>
          <rect x={X(r.x)} y={Y(r.y + r.h)} width={r.w * sc} height={r.h * sc} fill="#cbd5e1" stroke={WOOD_DARK} strokeWidth="2" />
          <Label x={X(r.x + r.w / 2)} y={Y(r.y) - 6} size={11} color={SOFT}>{r.w} × {r.h} m</Label>
        </g>
      ))}
      {f.tri && <polygon points={`${X(f.tri.x)},${Y(f.tri.y)} ${X(f.tri.x + f.tri.w)},${Y(f.tri.y)} ${X(f.tri.x + f.tri.w / 2)},${Y(f.tri.y + f.tri.h)}`} fill="#94a3b8" stroke={WOOD_DARK} strokeWidth="2" />}
      {f.hole && <circle cx={X(f.hole.x)} cy={Y(f.hole.y)} r={f.hole.r * sc} fill="#ffffff" stroke={WOOD_DARK} strokeWidth="2" strokeDasharray="5 3" />}
      <Arrow x1={o.x} y1={o.y} x2={o.x + W * sc + 24} y2={o.y} color={SOFT} width={1.5} />
      <Arrow x1={o.x} y1={o.y} x2={o.x} y2={Y(H) - 16} color={SOFT} width={1.5} />
      <Label x={o.x + W * sc + 30} y={o.y + 4} anchor="start" color={SOFT}>x</Label>
      <Label x={o.x - 10} y={Y(H) - 14} color={SOFT}>y</Label>
      <Label x={o.x - 10} y={o.y + 14}>O</Label>
    </>
  )
}

function SupportOnly({ f }) {
  return (
    <>
      <rect x="110" y="90" width="230" height="16" rx="3" fill={WOOD} stroke={WOOD_DARK} strokeWidth="2" />
      <SupportMark kind={f.kind} x={f.kind === 'fixed' ? 110 : 130} y={104} label="?" left />
    </>
  )
}

const DRAW = { beam: Beam, ropes: Ropes, swing: Swing, lever: Lever, point: Point, truss: Truss, shape: Shape, support: SupportOnly }

// One statics drawing, on white, sized by its container
export function StaticsDrawing({ figure, svgRef }) {
  const Draw = figure && DRAW[figure.type]
  if (!Draw) return null
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" fontFamily="Inter, Arial, Helvetica, sans-serif" className="block h-auto w-full" role="img" aria-label="Statics diagram">
      <rect width="400" height="200" fill="#ffffff" />
      <Draw f={figure} />
    </svg>
  )
}
