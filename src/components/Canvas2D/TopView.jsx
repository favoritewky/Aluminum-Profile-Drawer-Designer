import { Rect, Shape } from 'react-konva'
import { ProfileShape, RailShape, PanelShape, DimLine, C } from './shapes.jsx'
import { calcDrawerInnerW, calcDrawerInnerD } from '../../utils/bom.js'

export default function TopView({ state }) {
  const {
    cabinetW, cabinetD, profileW, profileH,
    drawerProfileW, drawerProfileH,
    railType, railThick, railGap, currentDrawer,
  } = state
  const dpW = drawerProfileW ?? profileW
  const dpH = drawerProfileH ?? profileH

  const els = []

  // Cabinet perimeter (top view)
  els.push(<ProfileShape key="ct" x={0}               y={0}             w={cabinetW}             h={profileH} />)
  els.push(<ProfileShape key="cb" x={0}               y={cabinetD - profileH} w={cabinetW}       h={profileH} />)
  els.push(<ProfileShape key="cl" x={0}               y={profileH}      w={profileW}             h={cabinetD - 2 * profileH} />)
  els.push(<ProfileShape key="cr" x={cabinetW - profileW} y={profileH}  w={profileW}             h={cabinetD - 2 * profileH} />)

  // Current drawer box
  const i = currentDrawer
  const d = state.drawers[i]
  const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
  const innerW = calcDrawerInnerW(state, i)
  const innerD = calcDrawerInnerD(state)
  const railOffset = railType === 'side' ? railThick + railGap : 0
  const dX = profileW + d.gapLeft + railOffset
  const dY = profileH

  // Interior floor
  els.push(<Rect key="floor" x={dX} y={dY} width={innerW} height={innerD}
    fill={C.faceHighFill} stroke={C.highlight} strokeWidth={1.5} listening={false} />)

  if (isAluminum) {
    // Front/back beams (visible from top)
    els.push(<ProfileShape key="fb" x={dX}             y={dY}            w={innerW} h={dpH} />)
    els.push(<ProfileShape key="bb" x={dX}             y={dY + innerD - dpH} w={innerW} h={dpH} />)
    // Left/right posts
    els.push(<ProfileShape key="lp" x={dX}             y={dY + dpH}      w={dpW}    h={innerD - 2 * dpH} />)
    els.push(<ProfileShape key="rp" x={dX + innerW - dpW} y={dY + dpH}   w={dpW}    h={innerD - 2 * dpH} />)
  } else {
    const t = d.facePanelThick
    // Four walls
    els.push(<PanelShape key="wt" x={dX}               y={dY}            w={innerW} h={t} />)
    els.push(<PanelShape key="wb" x={dX}               y={dY + innerD - t} w={innerW} h={t} />)
    els.push(<PanelShape key="wl" x={dX}               y={dY + t}        w={t}      h={innerD - 2 * t} />)
    els.push(<PanelShape key="wr" x={dX + innerW - t}  y={dY + t}        w={t}      h={innerD - 2 * t} />)
  }

  // Side rails
  if (railType === 'side') {
    els.push(<RailShape key="rl" x={dX - railOffset}       y={dY} w={railThick} h={innerD} />)
    els.push(<RailShape key="rr" x={dX + innerW + railGap} y={dY} w={railThick} h={innerD} />)
    els.push(
      <Shape key="rlbl" listening={false} sceneFunc={(ctx) => {
        ctx.fillStyle = C.railStroke
        ctx.font = '8px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('轨', dX - railOffset + railThick / 2, dY + innerD / 2)
        ctx.fillText('轨', dX + innerW + railGap + railThick / 2, dY + innerD / 2)
      }} />
    )
  }

  // Dims
  els.push(<DimLine key="dw"  x1={0}  y1={cabinetD + 10} x2={cabinetW}  y2={cabinetD + 10} text={`W ${cabinetW}`} />)
  els.push(<DimLine key="dd"  x1={-10} y1={0}  x2={-10}  y2={cabinetD}  text={`D ${cabinetD}`} />)
  els.push(<DimLine key="diw" x1={dX}  y1={-8} x2={dX + innerW} y2={-8} text={`内宽 ${Math.round(innerW)}`} />)
  els.push(<DimLine key="did" x1={cabinetW + 8} y1={dY} x2={cabinetW + 8} y2={dY + innerD} text={`内深 ${Math.round(innerD)}`} />)

  return <>{els}</>
}
