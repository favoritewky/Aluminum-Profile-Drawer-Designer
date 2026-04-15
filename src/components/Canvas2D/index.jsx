import { useRef, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import FrontView from './FrontView.jsx'
import SideView from './SideView.jsx'
import TopView from './TopView.jsx'
import { fitZoom } from '../../utils/draw.js'

export default function Canvas2D({ state }) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 500 })
  const [scale, setScale] = useState(1)

  // Track container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.max(width, 10), h: Math.max(height, 10) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-fit when view or container size changes
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || size.w < 10) return
    const fit = fitZoom(size.w, size.h, state)
    stage.scale({ x: fit.zoom, y: fit.zoom })
    stage.position({ x: fit.panX, y: fit.panY })
    setScale(fit.zoom)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, size.w, size.h])

  function handleWheel(e) {
    e.evt.preventDefault()
    const stage = stageRef.current
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    const factor = e.evt.deltaY < 0 ? 1.1 : 0.9
    const newScale = Math.max(0.05, Math.min(10, oldScale * factor))
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    stage.scale({ x: newScale, y: newScale })
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
    setScale(newScale)
  }

  function doFit() {
    const stage = stageRef.current
    if (!stage) return
    const fit = fitZoom(size.w, size.h, state)
    stage.scale({ x: fit.zoom, y: fit.zoom })
    stage.position({ x: fit.panX, y: fit.panY })
    setScale(fit.zoom)
  }

  function zoomIn() {
    const stage = stageRef.current
    if (!stage) return
    const s = Math.min(10, stage.scaleX() * 1.2)
    stage.scale({ x: s, y: s })
    setScale(s)
  }

  function zoomOut() {
    const stage = stageRef.current
    if (!stage) return
    const s = Math.max(0.05, stage.scaleX() / 1.2)
    stage.scale({ x: s, y: s })
    setScale(s)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none"
      style={{ background: '#f7f8fa', cursor: 'grab' }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        draggable
        onWheel={handleWheel}
      >
        <Layer listening={false}>
          {state.view === 'front' && <FrontView state={state} />}
          {state.view === 'side'  && <SideView  state={state} />}
          {state.view === 'top'   && <TopView   state={state} />}
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {[
          { icon: '+', fn: zoomIn,  title: '放大' },
          { icon: '⊡', fn: doFit,  title: '适应窗口' },
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
        {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
