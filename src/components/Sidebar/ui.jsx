// Shared UI primitives for Sidebar sections

export function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 mb-3">
      <span className="block w-0.5 h-3.5 rounded-full bg-blue-500" />
      {children}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div className="mb-2">
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

export function NumInput({ value, onChange, min, max, step = 1, unit }) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-400 pr-8"
      />
      {unit && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  )
}

export function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-400 bg-white"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function Row2({ children }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

export function Row3({ children }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>
}

export function InfoBox({ children }) {
  return (
    <div className="mt-2 px-2.5 py-2 bg-blue-50 border-l-2 border-blue-400 text-[11px] text-slate-600 leading-relaxed rounded-r">
      {children}
    </div>
  )
}
