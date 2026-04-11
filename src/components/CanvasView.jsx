import { useRef, useEffect, useState, useCallback } from 'react'
import { renderView, fitZoom } from '../utils/draw.js'

const VIEWS = [
  { key: 'front', label: '正视图' },
  { key: 'side',  label: '侧视图' },
  { key: 'top',   label: '俯视图' },
  { key: '3d',    label: '3D 示意' },
]

export default function CanvasView({ state, set }) {
  const canvasRef = useRef(null)
  const areaRef = useRef(null)
  const drag = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 })

  // Resize observer
  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setCanvasSize({ w: width, h: height })
    })
    ro.observe(area)
    return () => ro.disconnect()
  }, [])

  // Auto-fit when view changes or canvas resizes
  useEffect(() => {
    const fit = fitZoom(canvasSize.w, canvasSize.h, state)
    set('zoom', fit.zoom)
    set('panX', fit.panX)
    set('panY', fit.panY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, canvasSize.w, canvasSize.h])

  // Render on every state change
  useEffect(() => {
    renderView(canvasRef.current, { ...state })
  })

  const onWheel = useCallback(e => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.max(0.05, Math.min(10, state.zoom * factor))
    set('zoom', newZoom)
  }, [state.zoom, set])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [onWheel])

  function onMouseDown(e) {
    drag.current = { startX: e.clientX - state.panX, startY: e.clientY - state.panY }
  }
  function onMouseMove(e) {
    if (!drag.current) return
    set('panX', e.clientX - drag.current.startX)
    set('panY', e.clientY - drag.current.startY)
  }
  function onMouseUp() { drag.current = null }

  function zoomIn() { set('zoom', Math.min(10, state.zoom * 1.2)) }
  function zoomOut() { set('zoom', Math.max(0.05, state.zoom / 1.2)) }
  function zoomFit() {
    const fit = fitZoom(canvasSize.w, canvasSize.h, state)
    set('zoom', fit.zoom); set('panX', fit.panX); set('panY', fit.panY)
  }

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
      <div ref={areaRef} className="relative flex-1 overflow-hidden bg-slate-50 select-none">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ display: 'block', cursor: drag.current ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          {[
            { icon: '+', fn: zoomIn, title: '放大' },
            { icon: '⊡', fn: zoomFit, title: '适应窗口' },
            { icon: '−', fn: zoomOut, title: '缩小' },
          ].map(b => (
            <button
              key={b.icon}
              onClick={b.fn}
              title={b.title}
              className="w-8 h-8 bg-white/90 border border-slate-300 rounded shadow-sm
                flex items-center justify-center text-sm hover:bg-white hover:shadow-md transition-all"
            >
              {b.icon}
            </button>
          ))}
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-3 left-3 text-[11px] text-slate-400 bg-white/70 px-2 py-0.5 rounded">
          {Math.round(state.zoom * 100)}%
        </div>
      </div>
    </div>
  )
}
