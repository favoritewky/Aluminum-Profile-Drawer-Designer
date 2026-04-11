import { SectionTitle, Field, NumInput, Row2, SelectInput } from './ui.jsx'

const DRAWER_TYPE_OPTIONS = [
  { value: 'aluminum', label: '铝型材抽屉' },
  { value: 'wood', label: '木质抽屉' },
]

export default function DrawerSection({ state, set, setDrawerField, setCurrentDrawer }) {
  const d = state.drawers[state.currentDrawer] ?? {}
  const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'

  return (
    <div className="border-b border-slate-100 p-4">
      <SectionTitle>
        抽屉参数
        <span className="text-[10px] text-slate-400 font-normal ml-1 normal-case tracking-normal">（当前选中）</span>
      </SectionTitle>

      <Field label="当前编辑抽屉">
        <select
          value={state.currentDrawer}
          onChange={e => setCurrentDrawer(parseInt(e.target.value))}
          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-400 bg-white"
        >
          {state.drawers.map((_, i) => (
            <option key={i} value={i}>抽屉 {i + 1}</option>
          ))}
        </select>
      </Field>

      <Field label="抽屉类型">
        <SelectInput
          value={d.drawerType ?? 'aluminum'}
          onChange={v => setDrawerField('drawerType', v)}
          options={DRAWER_TYPE_OPTIONS}
        />
      </Field>

      <Row2>
        <Field label="抽屉高度 (mm)">
          <NumInput value={d.h ?? 120} onChange={v => setDrawerField('h', v)} min={40} max={600} />
        </Field>
        <Field label="上方间隙 (mm)">
          <NumInput value={d.gapTop ?? 5} onChange={v => setDrawerField('gapTop', v)} min={0} max={50} step={0.5} />
        </Field>
      </Row2>
      <Row2>
        <Field label="左侧间隙 (mm)">
          <NumInput value={d.gapLeft ?? 2} onChange={v => setDrawerField('gapLeft', v)} min={0} max={50} step={0.5} />
        </Field>
        <Field label="右侧间隙 (mm)">
          <NumInput value={d.gapRight ?? 2} onChange={v => setDrawerField('gapRight', v)} min={0} max={50} step={0.5} />
        </Field>
      </Row2>
      <Row2>
        <Field label="底板厚度 (mm)">
          <NumInput value={d.bottomThick ?? 6} onChange={v => setDrawerField('bottomThick', v)} min={3} max={30} />
        </Field>
        <Field label={isAluminum ? '面板厚度 (mm)' : '侧板厚度 (mm)'}>
          <NumInput value={d.facePanelThick ?? 18} onChange={v => setDrawerField('facePanelThick', v)} min={3} max={50} />
        </Field>
      </Row2>
    </div>
  )
}
