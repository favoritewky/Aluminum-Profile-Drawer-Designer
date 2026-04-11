import { useDrawerState } from './hooks/useDrawerState.js'
import Sidebar from './components/Sidebar/index.jsx'
import CanvasView from './components/CanvasView.jsx'
import BomTable from './components/BomTable.jsx'

export default function App() {
  const { state, set, setMany, setDrawerCount, setDrawerField, cycleExpand, setCurrentDrawer } = useDrawerState()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-5 py-3
        bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg z-10">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <line x1="8" y1="6" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="18"/>
          <circle cx="12" cy="12" r="1.5" fill="#60a5fa"/>
        </svg>
        <span className="text-base font-semibold tracking-wide">铝型材抽屉设计器</span>
        <span className="text-xs text-slate-400 ml-1">Aluminum Profile Drawer Designer</span>
        <div className="ml-auto text-[11px] text-slate-500">
          柜体 {state.cabinetW}×{state.cabinetD}×{state.cabinetH}mm
          &nbsp;·&nbsp;柜体型材 {state.profileW}×{state.profileH}mm
          &nbsp;·&nbsp;抽屉型材 {state.drawerProfileW}×{state.drawerProfileH}mm
          &nbsp;·&nbsp;{state.drawerCount} 个抽屉
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          state={state}
          set={set}
          setMany={setMany}
          setDrawerCount={setDrawerCount}
          setDrawerField={setDrawerField}
          cycleExpand={cycleExpand}
          setCurrentDrawer={setCurrentDrawer}
        />

        {/* Right: canvas + bom */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <CanvasView state={state} set={set} />
          <BomTable state={state} />
        </div>
      </div>
    </div>
  )
}
