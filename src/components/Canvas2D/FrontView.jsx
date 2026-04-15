import { Rect } from 'react-konva'
import { ProfileShape, RailShape, DimLine, C } from './shapes.jsx'
import { expandVal, calcDrawerInnerW, calcFacePanelSize, calcRailBeamCenterY } from '../../utils/bom.js'

export default function FrontView({ state }) {
  const {
    cabinetW, cabinetH, profileW, profileH,
    drawerProfileW, drawerProfileH,
    drawerCount, currentDrawer,
    railType, railH, railThick, railGap,
  } = state
  const dpW = drawerProfileW ?? profileW
  const dpH = drawerProfileH ?? profileH

  const els = []

  // Cabinet frame
  els.push(<ProfileShape key="cl" x={0}                 y={0} w={profileW}                h={cabinetH} />)
  els.push(<ProfileShape key="cr" x={cabinetW - profileW} y={0} w={profileW}                h={cabinetH} />)
  els.push(<ProfileShape key="ct" x={profileW}           y={0} w={cabinetW - 2 * profileW} h={profileH} />)
  els.push(<ProfileShape key="cb" x={profileW}           y={cabinetH - profileH} w={cabinetW - 2 * profileW} h={profileH} />)

  let y = profileH
  for (let i = 0; i < drawerCount; i++) {
    const d = state.drawers[i]
    const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
    const fp = calcFacePanelSize(state, i)
    const exp = d.expand
    const fpX = profileW + d.gapLeft - expandVal(exp.left, profileW)
    const fpY = y + d.gapTop - expandVal(exp.top, profileH)
    const isActive = i === currentDrawer
    const innerW = calcDrawerInnerW(state, i)

    // Gap band above drawer
    if (d.gapTop > 0) {
      els.push(<Rect key={`g${i}`} x={profileW} y={y} width={cabinetW - 2 * profileW} height={d.gapTop}
        fill="rgba(148,163,184,0.15)" listening={false} />)
    }

    if (isAluminum) {
      const railOffset = railType === 'side' ? railThick + railGap : 0
      const fx = profileW + d.gapLeft + railOffset
      const fy = y + d.gapTop
      els.push(<ProfileShape key={`dll${i}`} x={fx}                  y={fy} w={dpW}            h={d.h - dpH} />)
      els.push(<ProfileShape key={`dlr${i}`} x={fx + innerW - dpW}   y={fy} w={dpW}            h={d.h - dpH} />)
      els.push(<ProfileShape key={`dlb${i}`} x={fx}                  y={fy + d.h - dpH} w={innerW} h={dpH} />)
      els.push(<Rect key={`di${i}`} x={fx + dpW} y={fy} width={innerW - 2 * dpW} height={d.h - dpH}
        fill={isActive ? 'rgba(191,219,254,0.20)' : 'rgba(220,233,247,0.15)'} listening={false} />)
    }

    // Face panel
    els.push(<Rect key={`fp${i}`} x={fpX} y={fpY} width={fp.w} height={fp.h}
      fill={isActive ? C.faceHighFill : C.faceFill}
      stroke={isActive ? C.highlight : '#6366f1'}
      strokeWidth={isActive ? 2 : 1}
      listening={false} />)

    // Handle
    const hW = Math.min(60, fp.w * 0.3), hH = 5
    els.push(<Rect key={`fh${i}`} x={fpX + fp.w / 2 - hW / 2} y={fpY + fp.h / 2 - hH / 2}
      width={hW} height={hH} fill="#94a3b8" cornerRadius={1.5} listening={false} />)

    // Side rails
    if (railType === 'side') {
      const railCY = isAluminum ? calcRailBeamCenterY(state, i) : y + d.gapTop + d.h / 2
      const rY = railCY - railH / 2
      const lx = profileW + d.gapLeft
      const rx = lx + railThick + railGap + innerW + railGap
      els.push(<RailShape key={`rl${i}`} x={lx} y={rY} w={railThick} h={railH} />)
      els.push(<RailShape key={`rr${i}`} x={rx} y={rY} w={railThick} h={railH} />)
    }

    // Face panel height dim
    els.push(<DimLine key={`dh${i}`} x1={cabinetW + 8} y1={fpY} x2={cabinetW + 8} y2={fpY + fp.h} text={`${fp.h}`} />)

    y += d.gapTop + d.h
  }

  // Overall dims
  els.push(<DimLine key="dw" x1={0}   y1={cabinetH + 10} x2={cabinetW} y2={cabinetH + 10} text={`W ${cabinetW}`} />)
  els.push(<DimLine key="dh" x1={-10} y1={0}             x2={-10}      y2={cabinetH}       text={`H ${cabinetH}`} />)

  return <>{els}</>
}
