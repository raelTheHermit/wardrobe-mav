export default function ContextSelector({ value, onChange }) {
  const options = ['casual', 'formal', 'warm', 'cold', 'rainy']

  return (
    <div className="settings-card space-y-3">
      <label htmlFor="context-select" className="text-lg font-semibold">Context</label>
      <p className="text-sm text-slate-600">What are you dressing for today?</p>
      <select id="context-select" className="input capitalize" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}