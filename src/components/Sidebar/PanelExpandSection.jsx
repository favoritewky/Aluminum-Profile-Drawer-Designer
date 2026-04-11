import { SectionTitle } from './ui.jsx'
import { EXPAND_CYCLE } from '../../hooks/useDrawerState.js'
import { expandVal } from '../../utils/bom.js'

const DIR_ARROW = { top: '↑', bottom: '↓', left: '←', right: '→' }
const DIR_LABEL = { top: '顶部', bottom: '底部', left: '左侧', right: '右侧' }

const STATE_STYLE = {
  none: 'bg-slate-50 border-slate-300 text-slate-400 hover:border-blue-400',
  half: 'bg-amber-50 border-amber-400 text-amber-700',
  full: 'bg-green-50 border-green-500 text-green-700',
}
const STATE_LABEL = { none: '不扩展', half: '½型材', full: '1型材' }

function ExpandBtn({ dir, value, onClick }) {
  return (
    <button
      onClick={() => onClick(dir)}
      title={`${DIR_LABEL[dir]}: 点击切换扩展量`}
      className={`flex flex-col items-center justify-center gap-0.5 rounded border text-[11px] font-medium transition-all
        ${STATE_STYLE[value]}`}
    >
      <span className="text-sm leading-none">{DIR_ARROW[dir]}</span>
      <span className="leading-none">{STATE_LABEL[value]}</span>
    </button>
  )
}

export default function PanelExpandSection({ state, cycleExpand }) {
  const d = state.drawers[state.currentDrawer]
  const exp = d?.expand ?? { top: 'none', bottom: 'none', left: 'none', right: 'none' }
  const { profileW, profileH } = state

  const expandDesc = (dir, size) => {
    const v = exp[dir]
    if (v === 'none') return null
    return `${DIR_LABEL[dir]} +${expandVal(v, size)}mm`
  }
  const parts = [
    expandDesc('top', profileH),
    expandDesc('bottom', profileH),
    expandDesc('left', profileW),
    expandDesc('right', profileW),
  ].filter(Boolean)

  return (
    <div className="border-b border-slate-100 p-4">
      <SectionTitle>
        面板扩展
        <span className="text-[10px] text-slate-400 font-normal ml-1 normal-case tracking-normal">点击循环切换</span>
      </SectionTitle>

      {/* 3×3 grid layout */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-48 mx-auto" style={{ height: '120px' }}>
        {/* row 1 */}
        <div />
        <ExpandBtn dir="top" value={exp.top} onClick={cycleExpand} />
        <div />
        {/* row 2 */}
        <ExpandBtn dir="left" value={exp.left} onClick={cycleExpand} />
        <div className="flex items-center justify-center rounded border border-blue-300 bg-blue-50 text-[11px] text-blue-600 font-semibold">
          面板
        </div>
        <ExpandBtn dir="right" value={exp.right} onClick={cycleExpand} />
        {/* row 3 */}
        <div />
        <ExpandBtn dir="bottom" value={exp.bottom} onClick={cycleExpand} />
        <div />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-2 text-[11px]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border border-slate-300 bg-slate-50 inline-block" />不扩展
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border border-amber-400 bg-amber-50 inline-block" />½型材
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border border-green-500 bg-green-50 inline-block" />1型材
        </span>
      </div>

      {/* Info */}
      <div className="mt-2 px-2.5 py-2 bg-blue-50 border-l-2 border-blue-400 text-[11px] text-slate-600 leading-relaxed rounded-r">
        {parts.length
          ? `扩展量: ${parts.join('、')}`
          : '面板无扩展，与框架对齐'}
      </div>
    </div>
  )
}
