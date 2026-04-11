import { SectionTitle, Field, Row2, SelectInput } from './ui.jsx'

const CORNER_OPTIONS = [
  { value: 'tee', label: '三通角件' },
  { value: 'l20', label: 'L型角码 20mm' },
  { value: 'l40', label: 'L型角码 40mm' },
  { value: 'corner_slot', label: '槽用角码' },
  { value: 'tnut', label: 'T螺母 + 内六角' },
]
const SCREW_OPTIONS = [
  { value: 'M4x10', label: 'M4×10' },
  { value: 'M5x10', label: 'M5×10' },
  { value: 'M5x12', label: 'M5×12' },
  { value: 'M6x12', label: 'M6×12' },
]
const CAP_OPTIONS = [
  { value: 'plastic', label: '塑料端盖' },
  { value: 'aluminum', label: '铝制端盖' },
  { value: 'none', label: '不需要' },
]

export default function ConnectorSection({ state, set }) {
  return (
    <div className="border-b border-slate-100 p-4">
      <SectionTitle>连接件 & 紧固件</SectionTitle>
      <Field label="角连接件">
        <SelectInput value={state.cornerType} onChange={v => set('cornerType', v)} options={CORNER_OPTIONS} />
      </Field>
      <Row2>
        <Field label="螺钉规格">
          <SelectInput value={state.screwType} onChange={v => set('screwType', v)} options={SCREW_OPTIONS} />
        </Field>
        <Field label="端盖">
          <SelectInput value={state.capType} onChange={v => set('capType', v)} options={CAP_OPTIONS} />
        </Field>
      </Row2>
    </div>
  )
}
