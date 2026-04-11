import { SectionTitle, Field, NumInput, Row2 } from './ui.jsx'

export default function CabinetSection({ state, set, setDrawerCount }) {
  return (
    <div className="border-b border-slate-100 p-4">
      <SectionTitle>柜体尺寸</SectionTitle>
      <Row2>
        <Field label="宽度 W">
          <NumInput value={state.cabinetW} onChange={v => set('cabinetW', v)} min={100} max={3000} unit="mm" />
        </Field>
        <Field label="深度 D">
          <NumInput value={state.cabinetD} onChange={v => set('cabinetD', v)} min={100} max={2000} unit="mm" />
        </Field>
      </Row2>
      <Row2>
        <Field label="高度 H">
          <NumInput value={state.cabinetH} onChange={v => set('cabinetH', v)} min={100} max={3000} unit="mm" />
        </Field>
        <Field label="抽屉数量">
          <div className="flex items-center rounded border border-slate-300 overflow-hidden">
            <button
              onClick={() => setDrawerCount(state.drawerCount - 1)}
              className="w-8 h-[30px] bg-slate-50 hover:bg-slate-100 text-base flex items-center justify-center border-r border-slate-300"
            >−</button>
            <span className="flex-1 text-center text-xs font-semibold">{state.drawerCount}</span>
            <button
              onClick={() => setDrawerCount(state.drawerCount + 1)}
              className="w-8 h-[30px] bg-slate-50 hover:bg-slate-100 text-base flex items-center justify-center border-l border-slate-300"
            >+</button>
          </div>
        </Field>
      </Row2>
    </div>
  )
}
