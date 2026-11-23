import { parseChoice } from './choiceUtils'
import { imageUrl } from './images'

// Shows a choice's picture (if any) with its text (if any)
export function ChoiceContent({ choice, imageClassName = 'max-h-32' }) {
  const { path, text } = parseChoice(choice)
  if (!path) return <>{choice}</>

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1 align-middle">
      <img
        src={imageUrl(path)}
        alt={text || 'Answer choice picture'}
        className={`w-auto max-w-full rounded-md bg-white object-contain ${imageClassName}`}
      />
      {text && <span>{text}</span>}
    </span>
  )
}

// The answer key for an open-response question: the answer plus up to 5 alternatives.
// Students' typed answers are checked against all of them.
export function OpenAnswerField({ value, onChange, alternatives = [], onAlternativesChange, inputClassName = '' }) {
  const boxClass = `w-full rounded-lg border-2 bg-white px-3 py-2 text-ink placeholder-neutral-400 ${inputClassName}`

  return (
    <div className="space-y-2">
      <label className="block space-y-1">
        <span className="text-sm text-neutral-800">Correct answer</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. simple squamous (epithelium)"
          maxLength={150}
          required
          className={`${boxClass} border-green-600`}
        />
      </label>

      {alternatives.map((alternative, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            value={alternative}
            onChange={(event) =>
              onAlternativesChange(alternatives.map((a, i) => (i === index ? event.target.value : a)))
            }
            placeholder="Another answer that also counts"
            maxLength={150}
            aria-label={`Also accept, answer ${index + 2}`}
            className={`${boxClass} border-green-600`}
          />
          <button
            type="button"
            onClick={() => onAlternativesChange(alternatives.filter((_, i) => i !== index))}
            className="shrink-0 text-xs font-bold text-red-700 hover:text-red-500"
          >
            Remove
          </button>
        </div>
      ))}

      {onAlternativesChange && alternatives.length < 5 && (
        <button
          type="button"
          onClick={() => onAlternativesChange([...alternatives, ''])}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-600"
        >
          + Also accept another answer
        </button>
      )}

      <p className="text-xs text-neutral-600">
        Students type their answer to open the lock; it&apos;s checked against these. Put
        optional words in parentheses: &ldquo;simple squamous (epithelium)&rdquo; also accepts &ldquo;simple
        squamous&rdquo;. Use &ldquo;Also accept&rdquo; for different wording, like ATP / adenosine triphosphate.
      </p>
    </div>
  )
}
