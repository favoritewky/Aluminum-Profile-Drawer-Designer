import { SectionTitle, Field, NumInput, Row2, SelectInput, InfoBox } from './ui.jsx'

const RAIL_PRESETS = {
  side: [
    { label: '3节 12.7mm', thick: 12.7, h: 45 },
    { label: '2节 17mm', thick: 17, h: 50 },
    { label: 'Blum 标准', thick: 12.7, h: 45 },
  ],
  bottom: [
    { label: '底装 35mm', thick: 35, h: 18 },
    { label: '底装 45mm', thick: 45, h: 22 },
  ],
  undermount: [
    { label: 'Blum Tandem', thick: 50, h: 10 },
    { label: 'Grass Nova', thick: 46, h: 10 },
  ],
  none: [],
}

const RAIL_TYPE_OPTIONS = [
  { value: 'side', label: '侧装滑轨 (Side Mount)' },
  { value: 'bottom', label: '底装滑轨 (Bottom Mount)' },
  { value: 'undermount', label: '隐藏式底装 (Undermount)' },
  { value: 'none', label: '无滑轨' },
]

const RAIL_INFO = {
  side: (rt, rh) => `侧装：每侧各一条，抽屉内宽 = 柜宽 − 2×型材 − 2×(轨厚 ${rt}mm + 间隙)`,
  bottom: (rt, rh) => `底装：安装于底部，抽屉内宽更大，需预留底部高度 ${rh}mm`,
  undermount: (rt, rh) => `隐藏底装：完全隐藏在底板下方，抽屉底板需开槽`,
  none: () => '无滑轨：直接滑动或自行选配',
}

export default function RailSection({ state, set, setMany }) {
  const presets = RAIL_PRESETS[state.railType] || []
  const hasRail = state.railType !== 'none'

  function applyPreset(p) {
    setMany({ railThick: p.thick, railH: p.h })
  }

  return (
    <div className="border-b border-slate-100 p-4">
      <SectionTitle>抽屉滑轨</SectionTitle>

      <Field label="滑轨类型">
        <SelectInput value={state.railType} onChange={v => set('railType', v)} options={RAIL_TYPE_OPTIONS} />
      </Field>

      {presets.length > 0 && (
        <Field label="常用规格预设">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => applyPreset(p)}
                className="px-2 py-1 text-[11px] rounded border border-slate-300 bg-slate-50 hover:bg-green-50 hover:border-green-400 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
      )}

      {hasRail && (
        <>
          <Row2>
            <Field label="轨道厚度 (mm)">
              <NumInput value={state.railThick} onChange={v => set('railThick', v)} min={0} max={80} step={0.1} />
            </Field>
            <Field label="轨道高度 (mm)">
              <NumInput value={state.railH} onChange={v => set('railH', v)} min={5} max={200} />
            </Field>
          </Row2>
          <Row2>
            <Field label="轨道长度 (mm)">
              <NumInput value={state.railLen} onChange={v => set('railLen', v)} min={100} max={2000} step={10} />
            </Field>
            <Field label="安装间隙 (mm)">
              <NumInput value={state.railGap} onChange={v => set('railGap', v)} min={-5} max={20} step={0.5} />
            </Field>
          </Row2>
        </>
      )}

      <InfoBox>
        {(RAIL_INFO[state.railType] || (() => ''))(state.railThick, state.railH)}
      </InfoBox>
    </div>
  )
}
