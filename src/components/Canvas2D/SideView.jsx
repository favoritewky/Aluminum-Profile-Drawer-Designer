import { Rect, Shape } from 'react-konva'
import { ProfileShape, MountBeamShape, RailShape, PanelShape, DimLine, C } from './shapes.jsx'
import { calcDrawerInnerD, calcRailBeamCenterY } from '../../utils/bom.js'

export default function SideView({ state }) {
  const {
    cabinetD, cabinetH, profileW, profileH,
    drawerProfileW, drawerProfileH,
    drawerCount, currentDrawer,
    railType, railH,
  } = state
  const dpW = drawerProfileW ?? profileW
  const dpH = drawerProfileH ?? profileH
  const innerD = calcDrawerInnerD(state)

  const els = []

  // Cabinet shell
  els.push(<ProfileShape key="cs-l" x={0}             y={0} w={profileW}             h={cabinetH} />)
  els.push(<ProfileShape key="cs-r" x={cabinetD - profileW} y={0} w={profileW}       h={cabinetH} />)
  els.push(<ProfileShape key="cs-t" x={profileW}      y={0} w={cabinetD - 2 * profileW} h={profileH} />)
  els.push(<ProfileShape key="cs-b" x={profileW}      y={cabinetH - profileH} w={cabinetD - 2 * profileW} h={profileH} />)

  // Rail-mount beams (aluminum drawers with side rails)
  if (railType === 'side') {
    for (let i = 0; i < drawerCount; i++) {
      const d = state.drawers[i]
      if ((d.drawerType ?? 'aluminum') !== 'aluminum') continue
      const beamCY = calcRailBeamCenterY(state, i)
      const beamY = beamCY - profileH / 2

      els.push(<MountBeamShape key={`mb${i}`} x={profileW} y={beamY} w={cabinetD - 2 * profileW} h={profileH} />)

      // Dashed center line
      els.push(
        <Shape key={`cl${i}`} listening={false} sceneFunc={(ctx) => {
          ctx.strokeStyle = C.mountBeamStroke
          ctx.lineWidth = 0.8
          ctx.setLineDash([4, 3])
          ctx.beginPath()
          ctx.moveTo(0, beamCY)
          ctx.lineTo(cabinetD, beamCY)
          ctx.stroke()
          ctx.setLineDash([])
        }} />
      )

      // Leader + label on right
      const dist = Math.round(beamCY)
      els.push(
        <Shape key={`ll${i}`} listening={false} sceneFunc={(ctx) => {
          const lx = cabinetD + 18
          ctx.strokeStyle = C.mountBeamStroke
          ctx.lineWidth = 0.8
          ctx.setLineDash([3, 3])
          ctx.beginPath(); ctx.moveTo(cabinetD, beamCY); ctx.lineTo(lx, beamCY); ctx.stroke()
          ctx.setLineDash([])
          // Arrowhead
          ctx.beginPath()
          ctx.moveTo(cabinetD, beamCY); ctx.lineTo(cabinetD + 5, beamCY - 2.5)
          ctx.moveTo(cabinetD, beamCY); ctx.lineTo(cabinetD + 5, beamCY + 2.5)
          ctx.stroke()
          // Label
          ctx.fillStyle = C.mountDimText
          ctx.font = 'bold 10px sans-serif'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillText(`↓${dist}mm`, lx + 2, beamCY)
        }} />
      )
    }
  }

  // Drawers
  let y = profileH
  for (let i = 0; i < drawerCount; i++) {
    const d = state.drawers[i]
    const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
    const dX = profileW, dY = y + d.gapTop
    const isActive = i === currentDrawer

    if (isAluminum) {
      els.push(<ProfileShape key={`db${i}`}  x={dX}               y={dY + d.h - dpH} w={innerD}     h={dpH} />)
      els.push(<ProfileShape key={`df${i}`}  x={dX}               y={dY}             w={dpW}         h={d.h - dpH} />)
      els.push(<ProfileShape key={`dba${i}`} x={dX + innerD - dpW} y={dY}            w={dpW}         h={d.h - dpH} />)
      els.push(<Rect key={`din${i}`} x={dX + dpW} y={dY} width={innerD - 2 * dpW} height={d.h - dpH}
        fill={isActive ? 'rgba(191,219,254,0.25)' : 'rgba(220,233,247,0.25)'} listening={false} />)

      if (railType === 'side') {
        const beamCY = calcRailBeamCenterY(state, i)
        const rY = beamCY - railH / 2
        els.push(<RailShape key={`rl${i}`} x={dX} y={rY} w={innerD} h={railH} />)
        els.push(
          <Shape key={`rlt${i}`} listening={false} sceneFunc={(ctx) => {
            ctx.fillStyle = C.railStroke
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(`滑轨 H${state.railH}`, dX + innerD / 2, beamCY)
          }} />
        )
      }
    } else {
      // Wood drawer
      els.push(<Rect key={`dw${i}`} x={dX} y={dY} width={innerD} height={d.h}
        fill={isActive ? C.faceHighFill : C.faceFill}
        stroke={isActive ? C.highlight : C.profileStroke}
        strokeWidth={1} listening={false} />)
      if (railType === 'side') {
        const rY = dY + (d.h - railH) / 2
        els.push(<RailShape key={`rl${i}`} x={dX} y={rY} w={innerD} h={railH} />)
      }
    }

    // Bottom panel
    const bpY = dY + d.h - d.bottomThick
    els.push(<PanelShape key={`bp${i}`} x={dX + dpW} y={bpY} w={innerD - 2 * dpW} h={d.bottomThick} />)

    // Depth dim for active drawer
    if (i === currentDrawer) {
      els.push(<DimLine key={`dd${i}`} x1={dX} y1={dY - 6} x2={dX + innerD} y2={dY - 6} text={`D ${Math.round(innerD)}`} />)
    }

    y += d.gapTop + d.h
  }

  // Overall dims
  els.push(<DimLine key="dod" x1={0}  y1={cabinetH + 10} x2={cabinetD} y2={cabinetH + 10} text={`D ${cabinetD}`} />)
  els.push(<DimLine key="doh" x1={-10} y1={0} x2={-10} y2={cabinetH} text={`H ${cabinetH}`} />)

  // Legend
  if (railType === 'side' && state.drawers.some(d => (d.drawerType ?? 'aluminum') === 'aluminum')) {
    els.push(
      <Shape key="legend" listening={false} sceneFunc={(ctx) => {
        const lx = 2, ly = cabinetH + 22
        ctx.fillStyle = C.mountBeamFill
        ctx.fillRect(lx, ly, 10, 6)
        ctx.strokeStyle = C.mountBeamStroke
        ctx.lineWidth = 0.8
        ctx.strokeRect(lx, ly, 10, 6)
        ctx.fillStyle = C.mountDimText
        ctx.font = '8px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText('柜体侧面滑轨安装横梁（端头攻丝）', lx + 13, ly + 3)
      }} />
    )
  }

  return <>{els}</>
}
