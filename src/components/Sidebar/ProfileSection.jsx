import { SectionTitle, Field, NumInput, Row2 } from './ui.jsx'

const PRESETS = [15, 20, 30, 40, 45]

function PresetRow({ value, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors
            ${value === s
              ? 'bg-slate-800 border-slate-800 text-white'
              : 'bg-slate-50 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
        >
          {s}×{s}
        </button>
      ))}
    </div>
  )
}

export default function ProfileSection({ state, set, setMany }) {
  const cabinetActive = PRESETS.includes(state.profileW) && state.profileW === state.profileH
    ? state.profileW : null
  const drawerActive = PRESETS.includes(state.drawerProfileW) && state.drawerProfileW === state.drawerProfileH
    ? state.drawerProfileW : null

  return (
    <div className="border-b border-slate-100 p-4">
      <SectionTitle>型材规格</SectionTitle>

      <div className="mb-3">
        <div className="text-[11px] font-semibold text-slate-500 mb-1.5">柜体框架型材</div>
        <Field label="截面快选">
          <PresetRow value={cabinetActive} onSelect={s => setMany({ profileW: s, profileH: s })} />
        </Field>
        <Row2>
          <Field label="宽 (mm)">
            <NumInput value={state.profileW} onChange={v => set('profileW', v)} min={10} max={100} />
          </Field>
          <Field label="高 (mm)">
            <NumInput value={state.profileH} onChange={v => set('profileH', v)} min={10} max={100} />
          </Field>
        </Row2>
        <Field label="壁厚 (mm)">
          <NumInput value={state.profileThick} onChange={v => set('profileThick', v)} min={0.5} max={8} step={0.1} />
        </Field>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-slate-500 mb-1.5">抽屉框架型材</div>
        <Field label="截面快选">
          <PresetRow value={drawerActive} onSelect={s => setMany({ drawerProfileW: s, drawerProfileH: s })} />
        </Field>
        <Row2>
          <Field label="宽 (mm)">
            <NumInput value={state.drawerProfileW} onChange={v => set('drawerProfileW', v)} min={10} max={100} />
          </Field>
          <Field label="高 (mm)">
            <NumInput value={state.drawerProfileH} onChange={v => set('drawerProfileH', v)} min={10} max={100} />
          </Field>
        </Row2>
      </div>
    </div>
  )
}
