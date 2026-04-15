import Canvas2D from './Canvas2D/index.jsx'
import Canvas3D from './Canvas3D/index.jsx'

const VIEWS = [
  { key: 'front', label: '正视图' },
  { key: 'side',  label: '侧视图' },
  { key: 'top',   label: '俯视图' },
  { key: '3d',    label: '3D 示意' },
]

export default function CanvasView({ state, set }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* View tabs */}
      <div className="flex bg-white border-b border-slate-200 px-4 shrink-0">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => set('view', v.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors
              ${state.view === v.key
                ? 'border-blue-500 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Canvas area */}
      <div className="flex-1 min-h-0">
        {state.view === '3d'
          ? <Canvas3D state={state} />
          : <Canvas2D state={state} />
        }
      </div>
    </div>
  )
}
