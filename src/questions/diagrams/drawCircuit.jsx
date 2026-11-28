// Circuit schematics for the Diagram Builder (the same drawings Stadium Blackout uses), in black ink on white so they
// read well in any game and print cleanly. Labels are whatever the leader typed.
const INK = '#0f172a'
const LABEL = '#0f172a'
const L = 105, Rt = 295, T = 50, B = 180 // the circuit's left, right, top and bottom rails

function Text({ x, y, children, anchor = 'middle', color = LABEL, size = 13, weight = 700 }) {
  // "V_s = 20 V" is drawn with a real subscript
  const m = typeof children === 'string' ? children.match(/^([^_]*)_([A-Za-z0-9]+)(.*)$/) : null
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} fontFamily="Inter, system-ui, sans-serif">
      {m ? <>{m[1]}<tspan fontSize={size * 0.72} dy={size * 0.3}>{m[2]}</tspan><tspan dy={-size * 0.3}>{m[3]}</tspan></> : children}
    </text>
  )
}
const Wire = ({ pts, color = INK, dash }) => <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeDasharray={dash} />
const Dot = ({ x, y }) => <circle cx={x} cy={y} r="4" fill={INK} />

// A resistor between two points on a horizontal or vertical line, zigzag in the middle
function Res({ x1, y1, x2, y2, label, side = 1, color = INK, dash }) {
  const horiz = y1 === y2
  const len = horiz ? x2 - x1 : y2 - y1
  const mid = len / 2, half = 24, n = 6
  const zig = Array.from({ length: n + 1 }, (_, i) => {
    const t = mid - half + (2 * half * i) / n
    const o = i === 0 || i === n ? 0 : (i % 2 ? -8 : 8)
    return horiz ? [x1 + t, y1 + o] : [x1 + o, y1 + t]
  })
  const pts = horiz ? [[x1, y1], ...zig, [x2, y2]] : [[x1, y1], ...zig, [x2, y2]]
  return (
    <g>
      <Wire pts={pts} color={color} dash={dash} />
      {label && (horiz
        ? <Text x={x1 + mid} y={y1 + (side > 0 ? -16 : 26)}>{label}</Text>
        : <Text x={x1 + (side > 0 ? 16 : -16)} y={y1 + mid + 5} anchor={side > 0 ? 'start' : 'end'}>{label}</Text>)}
    </g>
  )
}

// A voltage source on a vertical line (+ on top unless plusTop is false)
function VSrc({ x, y1, y2, label, side = -1, plusTop = true }) {
  const cy = (y1 + y2) / 2
  return (
    <g>
      <Wire pts={[[x, y1], [x, cy - 18]]} />
      <Wire pts={[[x, cy + 18], [x, y2]]} />
      <circle cx={x} cy={cy} r="18" fill="#ffffff" stroke={INK} strokeWidth="2.5" />
      <Text x={x} y={cy - 4} color={INK} size={14}>{plusTop ? '+' : '−'}</Text>
      <Text x={x} y={cy + 13} color={INK} size={14}>{plusTop ? '−' : '+'}</Text>
      <Text x={x + side * 26} y={cy + 5} anchor={side > 0 ? 'start' : 'end'}>{label}</Text>
    </g>
  )
}

// A current source on a vertical line, arrow pointing up
function ISrc({ x, y1, y2, label, side = 1 }) {
  const cy = (y1 + y2) / 2
  return (
    <g>
      <Wire pts={[[x, y1], [x, cy - 18]]} />
      <Wire pts={[[x, cy + 18], [x, y2]]} />
      <circle cx={x} cy={cy} r="18" fill="#ffffff" stroke={INK} strokeWidth="2.5" />
      <path d={`M${x} ${cy + 10} L${x} ${cy - 9} M${x - 5} ${cy - 3} L${x} ${cy - 10} L${x + 5} ${cy - 3}`} stroke={INK} strokeWidth="2.5" fill="none" />
      <Text x={x + side * 26} y={cy + 5} anchor={side > 0 ? 'start' : 'end'}>{label}</Text>
    </g>
  )
}

function Ground({ x, y }) {
  return <g stroke={INK} strokeWidth="2.5"><line x1={x} y1={y} x2={x} y2={y + 10} /><line x1={x - 12} y1={y + 10} x2={x + 12} y2={y + 10} /><line x1={x - 7} y1={y + 15} x2={x + 7} y2={y + 15} /><line x1={x - 2} y1={y + 20} x2={x + 2} y2={y + 20} /></g>
}

// A clockwise mesh-current arrow
function MeshArrow({ cx, cy, label }) {
  return (
    <g>
      <path d={`M${cx - 22} ${cy + 10} A 24 24 0 1 1 ${cx + 6} ${cy + 23}`} fill="none" stroke="#1d4ed8" strokeWidth="2" />
      <path d={`M${cx + 6} ${cy + 23} l-9 -1 m9 1 l-4 -8`} stroke="#1d4ed8" strokeWidth="2" fill="none" />
      <Text x={cx} y={cy + 5} color="#1d4ed8">{label}</Text>
    </g>
  )
}

const DRAW = {
  single: ({ f }) => (
    <>
      <VSrc x={L} y1={T} y2={B} label={f.V} />
      <Wire pts={[[L, T], [Rt, T]]} />
      <Res x1={Rt} y1={T} x2={Rt} y2={B} label={f.R} />
      <Wire pts={[[L, B], [Rt, B]]} />
      <path d={`M194 ${T - 8} l12 8 l-12 8`} fill="none" stroke="#1d4ed8" strokeWidth="2" /><Text x={200} y={T - 14} color="#1d4ed8">I</Text>
    </>
  ),
  seriesParallel: ({ f }) => (
    <>
      <VSrc x={L} y1={T} y2={B} label={f.Vs} />
      <Res x1={L} y1={T} x2={200} y2={T} label={`R₁ = ${f.R1}`} />
      <Wire pts={[[200, T], [Rt, T]]} />
      <Res x1={200} y1={T} x2={200} y2={B} label={`R₂ = ${f.R2}`} side={-1} />
      <Res x1={Rt} y1={T} x2={Rt} y2={B} label={`R₃ = ${f.R3}`} />
      <Wire pts={[[L, B], [Rt, B]]} />
      <Dot x={200} y={T} /><Dot x={200} y={B} />
      {f.mark === 'Vp' && <><Text x={222} y={T + 26} color="#1d4ed8">+</Text><Text x={222} y={B - 12} color="#1d4ed8">−</Text><Text x={240} y={115} color="#1d4ed8" anchor="start">V = ?</Text></>}
    </>
  ),
  node: ({ f }) => {
    const cx = 200, cy = 115, len = 95
    const dirs = [[-1, 0], [0, -1], [1, 0], [0, 1]]
    return (
      <>
        {f.branches.map((b, i) => {
          const [dx, dy] = dirs[i % 4]
          const ex = cx + dx * len, ey = cy + dy * (len - 30)
          const mx = cx + dx * len * 0.5, my = cy + dy * (len - 30) * 0.5
          const s = b.dir === 'in' ? -1 : 1 // arrow pointing away from the node (out) or toward it (in)
          const ax = mx + dx * 7 * s, ay = my + dy * 7 * s
          const px = -dy, py = dx
          return (
            <g key={i}>
              <Wire pts={[[cx, cy], [ex, ey]]} />
              <path d={`M${ax} ${ay} L${ax - dx * 12 * s + px * 7} ${ay - dy * 12 * s + py * 7} M${ax} ${ay} L${ax - dx * 12 * s - px * 7} ${ay - dy * 12 * s - py * 7}`} stroke="#1d4ed8" strokeWidth="2.5" fill="none" />
              <Text x={ex + dx * 10 + (dy ? 14 : 0)} y={ey + dy * 14 + 5} anchor={dx < 0 ? 'end' : dx > 0 ? 'start' : 'start'}>{b.label}</Text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r="7" fill={INK} />
      </>
    )
  },
  loop: ({ f }) => (
    <>
      <VSrc x={L} y1={T} y2={B} label={f.Vs} />
      <Res x1={L} y1={T} x2={Rt} y2={T} label={f.drops[0]} />
      <Res x1={Rt} y1={T} x2={Rt} y2={B} label={f.drops[1]} />
      <Res x1={Rt} y1={B} x2={L} y2={B} label={f.drops[2]} side={-1} />
      <g><Text x={168} y={T + 22} color="#1d4ed8">+</Text><Text x={232} y={T + 22} color="#1d4ed8">−</Text>
        <Text x={Rt - 18} y={T + 40} color="#1d4ed8">+</Text><Text x={Rt - 18} y={B - 30} color="#1d4ed8">−</Text>
        <Text x={232} y={B - 12} color="#1d4ed8">+</Text><Text x={168} y={B - 12} color="#1d4ed8">−</Text></g>
    </>
  ),
  twoSource: ({ f }) => (
    <>
      <VSrc x={L} y1={T} y2={B} label={`V₁ = ${f.V1}`} />
      <Res x1={L} y1={T} x2={200} y2={T} label={`R₁ = ${f.R1}`} />
      <Res x1={200} y1={T} x2={Rt} y2={T} label={`R₂ = ${f.R2}`} />
      <VSrc x={Rt} y1={T} y2={B} label={`V₂ = ${f.V2}`} side={1} />
      <Res x1={200} y1={T} x2={200} y2={B} label={f.mesh ? null : `R₃ = ${f.R3}`} side={-1} />
      {f.mesh && <Text x={200} y={B + 22}>{`R₃ = ${f.R3}`}</Text>}
      <Wire pts={[[L, B], [Rt, B]]} />
      <Dot x={200} y={T} /><Dot x={200} y={B} />
      {f.mesh
        ? <><MeshArrow cx={152} cy={112} label="I₁" /><MeshArrow cx={248} cy={112} label="I₂" /></>
        : <><Text x={200} y={T - 26} color="#1d4ed8">a</Text><Ground x={200} y={B} /></>}
    </>
  ),
  superpos: ({ f }) => (
    <>
      {f.off === 'Vs'
        ? <><Wire pts={[[L, T], [L, B]]} color="#1d4ed8" /><Text x={L - 10} y={120} anchor="end" color="#1d4ed8">short</Text></>
        : <VSrc x={L} y1={T} y2={B} label={`V_s = ${f.Vs}`} />}
      <Res x1={L} y1={T} x2={200} y2={T} label={`R₁ = ${f.R1}`} />
      <Res x1={200} y1={T} x2={200} y2={B} label={`R₂ = ${f.R2}`} side={-1} />
      <Wire pts={[[200, T], [Rt, T]]} />
      {f.off === 'Is'
        ? <><Wire pts={[[Rt, T], [Rt, 96]]} /><Wire pts={[[Rt, 134], [Rt, B]]} /><Text x={Rt + 10} y={120} anchor="start" color="#1d4ed8">open</Text></>
        : <ISrc x={Rt} y1={T} y2={B} label={`I_s = ${f.Is}`} />}
      <Wire pts={[[L, B], [Rt, B]]} />
      <Dot x={200} y={T} /><Text x={200} y={T - 26} color="#1d4ed8">a</Text><Ground x={200} y={B} />
    </>
  ),
  thevenin: ({ f }) => (
    <>
      <VSrc x={L} y1={T} y2={B} label={f.Vs} />
      <Res x1={L} y1={T} x2={190} y2={T} label={`R₁ = ${f.R1}`} />
      <Res x1={190} y1={T} x2={190} y2={B} label={`R₂ = ${f.R2}`} side={1} />
      <Res x1={190} y1={T} x2={280} y2={T} label={`R₃ = ${f.R3}`} />
      <Wire pts={[[L, B], [280, B]]} />
      <Dot x={190} y={T} /><Dot x={190} y={B} />
      <circle cx={280} cy={T} r="5" fill="#ffffff" stroke={INK} strokeWidth="2.5" /><circle cx={280} cy={B} r="5" fill="#ffffff" stroke={INK} strokeWidth="2.5" />
      <Text x={280} y={T - 14} color="#1d4ed8">a</Text><Text x={280} y={B + 22} color="#1d4ed8">b</Text>
      {f.load && <><Wire pts={[[285, T], [325, T]]} dash="5 4" /><Wire pts={[[285, B], [325, B]]} dash="5 4" /><Res x1={325} y1={T} x2={325} y2={B} label="R_L" color="#b45309" dash="5 4" /></>}
    </>
  ),
}

// One circuit, drawn on white (no grid), sized by its container
export function CircuitDrawing({ figure, svgRef }) {
  const Draw = figure && DRAW[figure.type]
  if (!Draw) return null
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" fontFamily="Inter, Arial, Helvetica, sans-serif" className="block h-auto w-full" role="img" aria-label="Circuit diagram">
      <rect width="400" height="220" fill="#ffffff" />
      <Draw f={figure} />
    </svg>
  )
}
