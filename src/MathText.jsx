/* eslint-disable react-refresh/only-export-components -- MathText and its small hasMath helper live together */
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Text with math in it: anything between dollar signs is typeset (KaTeX), e.g. "Find $\frac{d}{dx} e^{3x}$".
// Money stays money: like Pandoc, math needs no space right inside the dollar signs and no digit right after the
// closing one, so "$5 and $10" or "$5-$10" are plain text. \$ is always a literal dollar sign. The same file is in
// every "Any subject" game site.
const MATH = /(?<!\\)\$(?![\s$])((?:\\.|[^\\$])+?)(?<![\s\\])\$(?!\d)/g

export function hasMath(text) {
  MATH.lastIndex = 0
  return MATH.test(String(text ?? ''))
}

export default function MathText({ text }) {
  const value = String(text ?? '')
  if (!value.includes('$')) return value
  const parts = []
  let last = 0
  let k = 0
  for (const m of value.matchAll(MATH)) {
    if (m.index > last) parts.push(value.slice(last, m.index).replace(/\\\$/g, '$'))
    const html = katex.renderToString(m[1], { throwOnError: false, output: 'html', strict: 'ignore' })
    // A touch larger than the text around it, so fractions and exponents stay readable on the projector
    parts.push(<span key={k++} className="math-inline" style={{ fontSize: '1.1em' }} dangerouslySetInnerHTML={{ __html: html }} />)
    last = m.index + m[0].length
  }
  if (last < value.length) parts.push(value.slice(last).replace(/\\\$/g, '$'))
  return <>{parts}</>
}

// A small preview under a text box: how the math will look (only when there is some)
export function MathPreview({ text, className = '' }) {
  if (!hasMath(text)) return null
  return (
    <p className={`mt-1 rounded-md border border-dashed px-3 py-1.5 text-sm ${className}`}>
      <span className="mr-2 text-xs font-bold uppercase tracking-wider opacity-60">Preview</span>
      <MathText text={text} />
    </p>
  )
}
