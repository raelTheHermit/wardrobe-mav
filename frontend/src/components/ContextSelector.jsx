export default function ContextSelector({ value, onChange }) {
  const options = ['casual', 'formal', 'warm', 'cold', 'rainy']

  return (
    <div className="selector-group">
      <label>Context</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}
