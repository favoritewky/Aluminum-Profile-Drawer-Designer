import { Field, NumInput, Row2 } from './ui.jsx'

export default function CabinetSection({ state, set, setDrawerCount }) {
  const isInner = state.cabinetDimMode === 'inner'
  const { profileW, profileH } = state

  // Display values: outer → inner when in inner mode
  const dispW = isInner ? state.cabinetW - 2 * profileW : state.cabinetW
  const dispD = isInner ? state.cabinetD - 2 * profileW : state.cabinetD
  const dispH = isInner ? state.cabinetH - 2 * profileH : state.cabinetH

  // Set handlers: convert inner → outer before storing
  const setW = v => set('cabinetW', isInner ? v + 2 * profileW : v)
  const setD = v => set('cabinetD', isInner ? v + 2 * profileW : v)
  const setH = v => set('cabinetH', isInner ? v + 2 * profileH : v)

  return (
    <div className="border-b border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
          <span className="block w-0.5 h-3.5 rounded-full bg-blue-500" />
          柜体尺寸
        </div>
        <div className="flex text-[11px] border border-slate-300 rounded overflow-hidden">
          <button
            onClick={() => set('cabinetDimMode', 'outer')}
            className={`px-2 py-0.5 ${!isInner ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >外尺寸</button>
          <button
            onClick={() => set('cabinetDimMode', 'inner')}
            className={`px-2 py-0.5 border-l border-slate-300 ${isInner ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >内尺寸</button>
        </div>
      </div>
      <Row2>
        <Field label={isInner ? '内宽 W' : '宽度 W'}>
          <NumInput value={dispW} onChange={setW} min={isInner ? 10 : 100} max={3000} unit="mm" />
        </Field>
        <Field label={isInner ? '内深 D' : '深度 D'}>
          <NumInput value={dispD} onChange={setD} min={isInner ? 10 : 100} max={2000} unit="mm" />
        </Field>
      </Row2>
      <Row2>
        <Field label={isInner ? '内高 H' : '高度 H'}>
          <NumInput value={dispH} onChange={setH} min={isInner ? 10 : 100} max={3000} unit="mm" />
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
