import { SectionTitle, Field, NumInput, Row2, SelectInput } from './ui.jsx'

const MATERIAL_OPTIONS = [
  { value: 'plywood', label: '胶合板 (Plywood)' },
  { value: 'mdf', label: '中密度纤维板 (MDF)' },
  { value: 'particleboard', label: '颗粒板 (Particleboard)' },
  { value: 'solid', label: '实木板 (Solid Wood)' },
  { value: 'aluminum', label: '铝板 (Aluminum Sheet)' },
]

export default function MaterialSection({ state, set }) {
  return (
    <div className="border-b border-slate-100 p-4">
      <SectionTitle>板材参数</SectionTitle>
      <Field label="板材类型">
        <SelectInput value={state.panelMaterial} onChange={v => set('panelMaterial', v)} options={MATERIAL_OPTIONS} />
      </Field>
      <Row2>
        <Field label="标准板宽 (mm)">
          <NumInput value={state.sheetW} onChange={v => set('sheetW', v)} min={600} max={3000} step={10} />
        </Field>
        <Field label="标准板高 (mm)">
          <NumInput value={state.sheetH} onChange={v => set('sheetH', v)} min={600} max={6000} step={10} />
        </Field>
      </Row2>
    </div>
  )
}
