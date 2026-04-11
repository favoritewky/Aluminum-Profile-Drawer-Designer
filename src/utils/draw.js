import { expandVal, calcDrawerInnerW, calcDrawerInnerD, calcFacePanelSize, calcRailBeamCenterY } from './bom.js'

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  profileStroke: '#3b6ea5',
  profileFill: '#dce9f7',
  profileHatch: '#3b6ea566',
  panelStroke: '#5c9e52',
  panelFill: '#d4edda',
  railStroke: '#c07e18',
  railFill: '#fde9b4',
  mountBeamStroke: '#9333ea',
  mountBeamFill: '#f3e8ff',
  mountBeamHatch: '#9333ea44',
  dimLine: '#94a3b8',
  dimText: '#475569',
  mountDimText: '#7e22ce',
  bg: '#f7f8fa',
  grid: '#e2e8f0',
  highlight: '#2563eb',
  highlightFill: '#bfdbfe',
  faceFill: '#e0eaff',
  faceHighFill: '#bcd4ff',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hatch(ctx, x, y, w, h, stride, color, angle = 45) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.strokeStyle = color
  ctx.lineWidth = 0.4
  const diag = Math.sqrt(w * w + h * h)
  const rad = (angle * Math.PI) / 180
  const steps = Math.ceil(diag * 2 / stride) + 2
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate(rad)
  for (let i = -steps; i <= steps; i++) {
    const ox = i * stride
    ctx.beginPath()
    ctx.moveTo(ox, -diag)
    ctx.lineTo(ox, diag)
    ctx.stroke()
  }
  ctx.restore()
}

function profileRect(ctx, x, y, w, h, label, zoom) {
  ctx.fillStyle = C.profileFill
  ctx.fillRect(x, y, w, h)
  hatch(ctx, x, y, w, h, 8 / zoom, C.profileHatch)
  ctx.strokeStyle = C.profileStroke
  ctx.lineWidth = 1.5 / zoom
  ctx.strokeRect(x, y, w, h)
  if (label && w > 20 / zoom && h > 8 / zoom) {
    ctx.fillStyle = C.profileStroke
    ctx.font = `${Math.max(8, 9 / zoom)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + w / 2, y + h / 2)
  }
}

function dim(ctx, x1, y1, x2, y2, text, zoom, offset = 14) {
  const horiz = Math.abs(y2 - y1) < 0.5
  ctx.save()
  ctx.strokeStyle = C.dimLine
  ctx.fillStyle = C.dimText
  ctx.lineWidth = 0.7 / zoom
  ctx.setLineDash([3 / zoom, 3 / zoom])

  const aw = 5 / zoom, ah = 2.5 / zoom
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  if (horiz) {
    ctx.moveTo(x1, y1); ctx.lineTo(x1 + aw, y1 - ah); ctx.moveTo(x1, y1); ctx.lineTo(x1 + aw, y1 + ah)
    ctx.moveTo(x2, y2); ctx.lineTo(x2 - aw, y2 - ah); ctx.moveTo(x2, y2); ctx.lineTo(x2 - aw, y2 + ah)
  } else {
    ctx.moveTo(x1, y1); ctx.lineTo(x1 - ah, y1 + aw); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ah, y1 + aw)
    ctx.moveTo(x2, y2); ctx.lineTo(x2 - ah, y2 - aw); ctx.moveTo(x2, y2); ctx.lineTo(x2 + ah, y2 - aw)
  }
  ctx.stroke()
  ctx.setLineDash([])

  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const fs = Math.max(8, 10 / zoom)
  ctx.font = `${fs}px sans-serif`
  const tw = ctx.measureText(text).width
  const pad = 3 / zoom
  ctx.fillStyle = 'rgba(247,248,250,0.85)'
  if (horiz) {
    ctx.fillRect(mx - tw / 2 - pad, my - fs / 2 - pad, tw + pad * 2, fs + pad * 2)
    ctx.fillStyle = C.dimText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, mx, my)
  } else {
    ctx.fillRect(mx - tw / 2 - pad, my - fs / 2 - pad, tw + pad * 2, fs + pad * 2)
    ctx.fillStyle = C.dimText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, mx, my)
  }
  ctx.restore()
}

// ─── Front view ───────────────────────────────────────────────────────────────
function drawFront(ctx, state, zoom) {
  const { cabinetW, cabinetH, profileW, profileH,
    drawerProfileW, drawerProfileH,
    drawerCount, currentDrawer,
    railType, railH, railThick, railGap } = state
  const dpW = drawerProfileW ?? profileW
  const dpH = drawerProfileH ?? profileH

  // Cabinet columns
  profileRect(ctx, 0, 0, profileW, cabinetH, '', zoom)
  profileRect(ctx, cabinetW - profileW, 0, profileW, cabinetH, '', zoom)
  // Top / bottom rail
  profileRect(ctx, profileW, 0, cabinetW - 2 * profileW, profileH, '', zoom)
  profileRect(ctx, profileW, cabinetH - profileH, cabinetW - 2 * profileW, profileH, '', zoom)

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

    // Gap band above
    if (d.gapTop > 0) {
      ctx.fillStyle = 'rgba(148,163,184,0.15)'
      ctx.fillRect(profileW, y, cabinetW - 2 * profileW, d.gapTop)
    }

    if (isAluminum) {
      const railOffset = railType === 'side' ? railThick + railGap : 0
      const frameX = profileW + d.gapLeft + railOffset
      const frameY = y + d.gapTop
      // Left post
      profileRect(ctx, frameX, frameY, dpW, d.h - dpH, '', zoom)
      // Right post
      profileRect(ctx, frameX + innerW - dpW, frameY, dpW, d.h - dpH, '', zoom)
      // Bottom beam
      profileRect(ctx, frameX, frameY + d.h - dpH, innerW, dpH, '', zoom)
      // Interior fill hint
      ctx.fillStyle = isActive ? 'rgba(191,219,254,0.20)' : 'rgba(220,233,247,0.15)'
      ctx.fillRect(frameX + dpW, frameY, innerW - 2 * dpW, d.h - dpH)
    }

    // Face panel (both types)
    ctx.fillStyle = isActive ? C.faceHighFill : C.faceFill
    ctx.strokeStyle = isActive ? C.highlight : '#6366f1'
    ctx.lineWidth = (isActive ? 2 : 1) / zoom
    ctx.fillRect(fpX, fpY, fp.w, fp.h)
    ctx.strokeRect(fpX, fpY, fp.w, fp.h)

    // Handle
    const hW = Math.min(60 / zoom, fp.w * 0.3)
    const hH = 5 / zoom
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    const hx = fpX + fp.w / 2 - hW / 2, hy = fpY + fp.h / 2 - hH / 2
    ctx.roundRect(hx, hy, hW, hH, 1.5 / zoom)
    ctx.fill()

    // Side rails — drawn after face panel so they remain visible
    // Layout: column | gapLeft | rail(railThick) | railGap | drawer(innerW) | railGap | rail | gapRight | column
    if (railType === 'side') {
      let railCY
      if (isAluminum) {
        railCY = calcRailBeamCenterY(state, i)
      } else {
        railCY = y + d.gapTop + d.h / 2
      }
      const rY = railCY - railH / 2
      const leftRailX = profileW + d.gapLeft
      const rightRailX = leftRailX + railThick + railGap + innerW + railGap

      ctx.fillStyle = C.railFill
      ctx.strokeStyle = C.railStroke
      ctx.lineWidth = 1 / zoom
      // Left rail end face
      ctx.fillRect(leftRailX, rY, railThick, railH)
      ctx.strokeRect(leftRailX, rY, railThick, railH)
      // Right rail end face
      ctx.fillRect(rightRailX, rY, railThick, railH)
      ctx.strokeRect(rightRailX, rY, railThick, railH)
    }

    // Dim: face panel height on right
    dim(ctx, cabinetW + 8 / zoom, fpY, cabinetW + 8 / zoom, fpY + fp.h, `${fp.h}`, zoom)

    y += d.gapTop + d.h
  }

  // Overall dims
  dim(ctx, 0, cabinetH + 10 / zoom, cabinetW, cabinetH + 10 / zoom, `W ${cabinetW}`, zoom)
  dim(ctx, -10 / zoom, 0, -10 / zoom, cabinetH, `H ${cabinetH}`, zoom)
}

// ─── Side view ────────────────────────────────────────────────────────────────
function drawSide(ctx, state, zoom) {
  const { cabinetD, cabinetH, profileW, profileH,
    drawerProfileW, drawerProfileH,
    drawerCount, currentDrawer,
    railType, railH, railLen, railGap, railThick } = state
  const dpW = drawerProfileW ?? profileW
  const dpH = drawerProfileH ?? profileH

  // Cabinet shell
  profileRect(ctx, 0, 0, profileW, cabinetH, '', zoom)
  profileRect(ctx, cabinetD - profileW, 0, profileW, cabinetH, '', zoom)
  profileRect(ctx, profileW, 0, cabinetD - 2 * profileW, profileH, '', zoom)
  profileRect(ctx, profileW, cabinetH - profileH, cabinetD - 2 * profileW, profileH, '', zoom)

  // ── Rail-mount beams on cabinet side (for aluminum drawers with side rails) ──
  // Draw first so drawers appear on top
  if (railType === 'side') {
    for (let i = 0; i < drawerCount; i++) {
      const d = state.drawers[i]
      if ((d.drawerType ?? 'aluminum') !== 'aluminum') continue
      const beamCY = calcRailBeamCenterY(state, i)
      const beamY = beamCY - profileH / 2
      const beamX = profileW
      const beamW = cabinetD - 2 * profileW

      // Draw the mount beam (purple, distinct from regular profiles)
      ctx.fillStyle = C.mountBeamFill
      ctx.fillRect(beamX, beamY, beamW, profileH)
      hatch(ctx, beamX, beamY, beamW, profileH, 8 / zoom, C.mountBeamHatch, -45)
      ctx.strokeStyle = C.mountBeamStroke
      ctx.lineWidth = 1.5 / zoom
      ctx.strokeRect(beamX, beamY, beamW, profileH)

      // Center-line indicator
      ctx.save()
      ctx.strokeStyle = C.mountBeamStroke
      ctx.lineWidth = 0.8 / zoom
      ctx.setLineDash([4 / zoom, 3 / zoom])
      ctx.beginPath()
      ctx.moveTo(0, beamCY)
      ctx.lineTo(cabinetD, beamCY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Dimension: distance from cabinet top to beam center (for drilling/tapping)
      const distFromTop = Math.round(beamCY)
      ctx.save()
      ctx.strokeStyle = C.mountBeamStroke
      ctx.fillStyle = C.mountDimText
      ctx.lineWidth = 0.8 / zoom
      ctx.setLineDash([3 / zoom, 3 / zoom])
      // Leader line from right edge
      const lx = cabinetD + 18 / zoom
      ctx.beginPath()
      ctx.moveTo(cabinetD, beamCY)
      ctx.lineTo(lx, beamCY)
      ctx.stroke()
      ctx.setLineDash([])
      // Arrow tip
      const aw = 5 / zoom, ah = 2.5 / zoom
      ctx.beginPath()
      ctx.moveTo(cabinetD, beamCY)
      ctx.lineTo(cabinetD + aw, beamCY - ah)
      ctx.moveTo(cabinetD, beamCY)
      ctx.lineTo(cabinetD + aw, beamCY + ah)
      ctx.stroke()
      // Label
      const fs = Math.max(8, 9 / zoom)
      ctx.font = `bold ${fs}px sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`↓${distFromTop}mm`, lx + 2 / zoom, beamCY)
      ctx.restore()
    }
  }

  // ── Drawers ──
  let y = profileH
  for (let i = 0; i < drawerCount; i++) {
    const d = state.drawers[i]
    const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
    const innerD = calcDrawerInnerD(state)
    const dX = profileW
    const dY = y + d.gapTop
    const isActive = i === currentDrawer

    if (isAluminum) {
      // Bottom beam
      profileRect(ctx, dX, dY + d.h - dpH, innerD, dpH, '', zoom)
      // Front/back posts
      profileRect(ctx, dX, dY, dpW, d.h - dpH, '', zoom)
      profileRect(ctx, dX + innerD - dpW, dY, dpW, d.h - dpH, '', zoom)
      // Interior highlight
      ctx.fillStyle = isActive ? 'rgba(191,219,254,0.25)' : 'rgba(220,233,247,0.25)'
      ctx.fillRect(dX + dpW, dY, innerD - 2 * dpW, d.h - dpH)

      // Rail: centered on bottom beam center
      if (railType === 'side') {
        const beamCY = calcRailBeamCenterY(state, i)
        const rY = beamCY - railH / 2
        ctx.fillStyle = C.railFill
        ctx.strokeStyle = C.railStroke
        ctx.lineWidth = 0.8 / zoom
        ctx.fillRect(dX, rY, innerD, railH)
        ctx.strokeRect(dX, rY, innerD, railH)
        ctx.fillStyle = C.railStroke
        ctx.font = `${Math.max(8, 9 / zoom)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`滑轨 H${railH}`, dX + innerD / 2, beamCY)
      }
    } else {
      // Wood: solid box
      ctx.fillStyle = isActive ? C.faceHighFill : C.faceFill
      ctx.strokeStyle = isActive ? C.highlight : C.profileStroke
      ctx.lineWidth = 1 / zoom
      ctx.fillRect(dX, dY, innerD, d.h)
      ctx.strokeRect(dX, dY, innerD, d.h)

      // Rail for wood drawer (centered in drawer height, original behavior)
      if (railType === 'side') {
        const rY = dY + (d.h - railH) / 2
        ctx.fillStyle = C.railFill
        ctx.strokeStyle = C.railStroke
        ctx.lineWidth = 0.8 / zoom
        ctx.fillRect(dX, rY, innerD, railH)
        ctx.strokeRect(dX, rY, innerD, railH)
        ctx.fillStyle = C.railStroke
        ctx.font = `${Math.max(8, 9 / zoom)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`滑轨 H${railH}`, dX + innerD / 2, rY + railH / 2)
      }
    }

    // Bottom panel inside drawer
    const bpY = dY + d.h - d.bottomThick
    ctx.fillStyle = C.panelFill
    ctx.strokeStyle = C.panelStroke
    ctx.lineWidth = 0.8 / zoom
    ctx.fillRect(dX + dpW, bpY, innerD - 2 * dpW, d.bottomThick)
    ctx.strokeRect(dX + dpW, bpY, innerD - 2 * dpW, d.bottomThick)

    if (i === currentDrawer) {
      dim(ctx, dX, dY - 6 / zoom, dX + innerD, dY - 6 / zoom, `D ${Math.round(innerD)}`, zoom)
    }

    y += d.gapTop + d.h
  }

  dim(ctx, 0, cabinetH + 10 / zoom, cabinetD, cabinetH + 10 / zoom, `D ${cabinetD}`, zoom)
  dim(ctx, -10 / zoom, 0, -10 / zoom, cabinetH, `H ${cabinetH}`, zoom)

  // Legend for mount beam
  if (railType === 'side') {
    const hasAluminum = state.drawers.some(d => (d.drawerType ?? 'aluminum') === 'aluminum')
    if (hasAluminum) {
      ctx.save()
      const lx = 2 / zoom, ly = cabinetH + 22 / zoom
      ctx.fillStyle = C.mountBeamFill
      ctx.strokeStyle = C.mountBeamStroke
      ctx.lineWidth = 0.8 / zoom
      ctx.fillRect(lx, ly, 10 / zoom, 6 / zoom)
      ctx.strokeRect(lx, ly, 10 / zoom, 6 / zoom)
      ctx.fillStyle = C.mountDimText
      ctx.font = `${Math.max(7, 8 / zoom)}px sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('柜体侧面滑轨安装横梁（端头攻丝）', lx + 13 / zoom, ly + 3 / zoom)
      ctx.restore()
    }
  }
}

// ─── Top view ─────────────────────────────────────────────────────────────────
function drawTop(ctx, state, zoom) {
  const { cabinetW, cabinetD, profileW, profileH,
    drawerProfileW, drawerProfileH,
    railType, railThick, railGap, currentDrawer } = state
  const dpW = drawerProfileW ?? profileW
  const dpH = drawerProfileH ?? profileH

  // Cabinet perimeter
  profileRect(ctx, 0, 0, cabinetW, profileH, '', zoom)
  profileRect(ctx, 0, cabinetD - profileH, cabinetW, profileH, '', zoom)
  profileRect(ctx, 0, profileH, profileW, cabinetD - 2 * profileH, '', zoom)
  profileRect(ctx, cabinetW - profileW, profileH, profileW, cabinetD - 2 * profileH, '', zoom)

  // Current drawer box top view
  const i = currentDrawer
  const d = state.drawers[i]
  const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
  const innerW = calcDrawerInnerW(state, i)
  const innerD = calcDrawerInnerD(state)
  const railOffset = railType === 'side' ? railThick + railGap : 0
  const dX = profileW + d.gapLeft + railOffset
  const dY = profileH

  // Interior floor
  ctx.fillStyle = C.faceHighFill
  ctx.strokeStyle = C.highlight
  ctx.lineWidth = 1.5 / zoom
  ctx.fillRect(dX, dY, innerW, innerD)
  ctx.strokeRect(dX, dY, innerW, innerD)

  if (isAluminum) {
    // Front/back beams (no top — looking down at open-top frame, see back and front beams)
    profileRect(ctx, dX, dY + innerD - dpH, innerW, dpH, '', zoom)
    profileRect(ctx, dX, dY, innerW, dpH, '', zoom)
    // Left/right posts
    profileRect(ctx, dX, dY + dpH, dpW, innerD - 2 * dpH, '', zoom)
    profileRect(ctx, dX + innerW - dpW, dY + dpH, dpW, innerD - 2 * dpH, '', zoom)
  } else {
    // Wood: solid walls on all four sides
    ctx.fillStyle = C.panelFill
    ctx.strokeStyle = C.panelStroke
    ctx.lineWidth = 0.8 / zoom
    const t = d.facePanelThick
    // Front/back walls
    ctx.fillRect(dX, dY, innerW, t); ctx.strokeRect(dX, dY, innerW, t)
    ctx.fillRect(dX, dY + innerD - t, innerW, t); ctx.strokeRect(dX, dY + innerD - t, innerW, t)
    // Left/right walls
    ctx.fillRect(dX, dY + t, t, innerD - 2 * t); ctx.strokeRect(dX, dY + t, t, innerD - 2 * t)
    ctx.fillRect(dX + innerW - t, dY + t, t, innerD - 2 * t); ctx.strokeRect(dX + innerW - t, dY + t, t, innerD - 2 * t)
  }

  // Side rails
  if (railType === 'side') {
    ctx.fillStyle = C.railFill
    ctx.strokeStyle = C.railStroke
    ctx.lineWidth = 0.8 / zoom
    // Left rail
    ctx.fillRect(dX - railOffset, dY, railThick, innerD)
    ctx.strokeRect(dX - railOffset, dY, railThick, innerD)
    // Right rail
    ctx.fillRect(dX + innerW + railGap, dY, railThick, innerD)
    ctx.strokeRect(dX + innerW + railGap, dY, railThick, innerD)
    ctx.fillStyle = C.railStroke
    ctx.font = `${Math.max(7, 8 / zoom)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('轨', dX - railOffset + railThick / 2, dY + innerD / 2)
    ctx.fillText('轨', dX + innerW + railGap + railThick / 2, dY + innerD / 2)
  }

  dim(ctx, 0, cabinetD + 10 / zoom, cabinetW, cabinetD + 10 / zoom, `W ${cabinetW}`, zoom)
  dim(ctx, -10 / zoom, 0, -10 / zoom, cabinetD, `D ${cabinetD}`, zoom)
  dim(ctx, dX, -8 / zoom, dX + innerW, -8 / zoom, `内宽 ${Math.round(innerW)}`, zoom)
  dim(ctx, cabinetW + 8 / zoom, dY, cabinetW + 8 / zoom, dY + innerD, `内深 ${Math.round(innerD)}`, zoom)
}

// ─── 3-D oblique ─────────────────────────────────────────────────────────────
function draw3D(ctx, state, zoom) {
  const { cabinetW, cabinetH, cabinetD, profileW, profileH,
    drawerProfileW, drawerProfileH, drawerCount, currentDrawer,
    railType, railH, railThick, railGap, railLen } = state
  const W = cabinetW, H = cabinetH, D = cabinetD
  const pw = profileW, ph = profileH
  const dpW = drawerProfileW ?? pw
  const dpH = drawerProfileH ?? ph

  const OX = 0.45, OY = 0.28

  function p(x, y, z) {
    return { x: x + z * OX, y: y - z * OY }
  }

  function face(pts, fill, stroke, lw = 1) {
    ctx.fillStyle = fill
    ctx.strokeStyle = stroke
    ctx.lineWidth = lw / zoom
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // Draw a box — only visible faces (front, top, right side) in back-to-front order
  function box3(x1, y1, z1, x2, y2, z2, fill, stroke) {
    // right side face (drawn first — furthest back)
    face([p(x2,y1,z1),p(x2,y2,z1),p(x2,y2,z2),p(x2,y1,z2)], fill + '88', stroke)
    // top face
    face([p(x1,y1,z1),p(x2,y1,z1),p(x2,y1,z2),p(x1,y1,z2)], fill + 'cc', stroke)
    // front face (drawn last — closest to viewer)
    face([p(x1,y1,z1),p(x2,y1,z1),p(x2,y2,z1),p(x1,y2,z1)], fill, stroke)
  }

  // ── Draw order: back shell → cabinet profiles → back drawer parts → face panels ──

  // 1. Cabinet back/side shell (transparent background)
  face([p(0,0,D),p(W,0,D),p(W,H,D),p(0,H,D)], 'rgba(200,218,239,0.35)', C.profileStroke)
  face([p(W,0,0),p(W,H,0),p(W,H,D),p(W,0,D)], 'rgba(176,200,224,0.35)', C.profileStroke)
  face([p(0,0,0),p(W,0,0),p(W,0,D),p(0,0,D)], 'rgba(200,218,239,0.25)', C.profileStroke)

  // 2. Cabinet corner posts (back two drawn first, front two last)
  const postPositions = [
    [0, 0],         // front-left
    [W - pw, 0],    // front-right
    [0, H - ph],    // bottom-front-left (not a real post position but placeholder)
  ]
  // Back posts first
  box3(0, 0, D - pw, pw, H, D, C.profileFill, C.profileStroke)
  box3(W - pw, 0, D - pw, W, H, D, C.profileFill, C.profileStroke)
  // Top beams (back)
  box3(pw, 0, D - ph, W - pw, ph, D, C.profileFill, C.profileStroke)
  box3(pw, H - ph, D - ph, W - pw, H, D, C.profileFill, C.profileStroke)
  // Side beams depth-wise (left and right, back half)
  box3(0, 0, pw, pw, ph, D - pw, C.profileFill, C.profileStroke)
  box3(0, H - ph, pw, pw, H, D - pw, C.profileFill, C.profileStroke)
  box3(W - pw, 0, pw, W, ph, D - pw, C.profileFill, C.profileStroke)
  box3(W - pw, H - ph, pw, W, H, D - pw, C.profileFill, C.profileStroke)

  // 3. Rail-mount beams (cabinet sides, behind drawers) + drawer rails
  if (state.railType === 'side') {
    const { railH, railThick, railGap, railLen } = state
    for (let i = 0; i < drawerCount; i++) {
      const d = state.drawers[i]
      const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
      const fy = state.drawers.slice(0, i).reduce((acc, dd) => acc + dd.gapTop + dd.h, ph) + d.gapTop
      const innerW = calcDrawerInnerW(state, i)
      const innerD = calcDrawerInnerD(state)

      // Rail Y center
      let railCY
      if (isAluminum) {
        railCY = state.drawers.slice(0, i).reduce((acc, dd) => acc + dd.gapTop + dd.h, ph)
          + d.gapTop + d.h - dpH / 2
      } else {
        railCY = fy + d.h / 2
      }
      const rY1 = railCY - railH / 2
      const rY2 = railCY + railH / 2

      // Cabinet side mount beams (purple, aluminum only)
      if (isAluminum) {
        const beamY1 = railCY - ph / 2
        const beamY2 = railCY + ph / 2
        // Left mount beam (on left cabinet side)
        box3(0, beamY1, pw, pw, beamY2, D - pw, C.mountBeamFill, C.mountBeamStroke)
        // Right mount beam (on right cabinet side)
        box3(W - pw, beamY1, pw, W, beamY2, D - pw, C.mountBeamFill, C.mountBeamStroke)
      }

      // Drawer slide rails (left and right)
      const railX1 = pw + d.gapLeft - railThick - railGap
      const railX2 = pw + d.gapLeft + innerW + railGap
      const railLen3D = Math.min(railLen, innerD)
      // Left rail
      box3(railX1, rY1, 0, railX1 + railThick, rY2, railLen3D, C.railFill, C.railStroke)
      // Right rail
      box3(railX2, rY1, 0, railX2 + railThick, rY2, railLen3D, C.railFill, C.railStroke)
    }
  }

  // 4. Drawer bodies (back-to-front, top-to-bottom in draw order)
  let yOff = ph
  for (let i = drawerCount - 1; i >= 0; i--) {
    const d = state.drawers[i]
    const recomputedY = state.drawers.slice(0, i).reduce((acc, dd) => acc + dd.gapTop + dd.h, ph)
    const fy = recomputedY + d.gapTop
    const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
    const isActive = i === currentDrawer
    const innerW = calcDrawerInnerW(state, i)
    const innerD = calcDrawerInnerD(state)
    const fx = pw, fw = innerW
    const fd = innerD

    if (isAluminum) {
      const fh = d.h - dpH
      // Back posts
      box3(fx, fy, fd - dpW, fx + dpW, fy + fh, fd, C.profileFill, C.profileStroke)
      box3(fx + fw - dpW, fy, fd - dpW, fx + fw, fy + fh, fd, C.profileFill, C.profileStroke)
      // Back bottom beam
      box3(fx, fy + fh, fd - dpW, fx + fw, fy + d.h, fd, C.profileFill, C.profileStroke)
      // Side bottom beams
      box3(fx, fy + fh, dpW, fx + dpW, fy + d.h, fd - dpW, C.profileFill, C.profileStroke)
      box3(fx + fw - dpW, fy + fh, dpW, fx + fw, fy + d.h, fd - dpW, C.profileFill, C.profileStroke)
      // Front posts
      box3(fx, fy, 0, fx + dpW, fy + fh, dpW, C.profileFill, C.profileStroke)
      box3(fx + fw - dpW, fy, 0, fx + fw, fy + fh, dpW, C.profileFill, C.profileStroke)
      // Front bottom beam
      box3(fx, fy + fh, 0, fx + fw, fy + d.h, dpW, C.profileFill, C.profileStroke)
    } else {
      const wt = d.facePanelThick
      // Back wall
      box3(fx, fy, fd, fx + fw, fy + d.h, fd + wt, C.panelFill, C.panelStroke)
      // Left wall
      box3(fx, fy, wt, fx + wt, fy + d.h, fd, C.panelFill, C.panelStroke)
      // Right wall
      box3(fx + fw - wt, fy, wt, fx + fw, fy + d.h, fd, C.panelFill, C.panelStroke)
      // Front wall (box front — behind face panel)
      box3(fx, fy, 0, fx + fw, fy + d.h, wt, C.panelFill, C.panelStroke)
    }
  }

  // 4. Front cabinet posts and beams (drawn after drawers so they appear in front)
  box3(0, 0, 0, pw, H, pw, C.profileFill, C.profileStroke)
  box3(W - pw, 0, 0, W, H, pw, C.profileFill, C.profileStroke)
  box3(pw, 0, 0, W - pw, ph, pw, C.profileFill, C.profileStroke)
  box3(pw, H - ph, 0, W - pw, H, pw, C.profileFill, C.profileStroke)

  // 5. Face panels (always in front)
  yOff = ph
  for (let i = 0; i < drawerCount; i++) {
    const d = state.drawers[i]
    const fp = calcFacePanelSize(state, i)
    const exp = d.expand
    const fpX = pw + d.gapLeft - expandVal(exp.left, pw)
    const fpY = yOff + d.gapTop - expandVal(exp.top, ph)
    const isActive = i === currentDrawer
    const fThick = d.facePanelThick

    box3(fpX, fpY, 0, fpX + fp.w, fpY + fp.h, fThick,
      isActive ? C.faceHighFill : C.faceFill,
      isActive ? C.highlight : '#6366f1')

    // Handle
    const hW = Math.min(60 / zoom, fp.w * 0.25)
    const hH = 5 / zoom, hD = 3 / zoom
    const hx = fpX + fp.w / 2 - hW / 2, hy = fpY + fp.h / 2 - hH / 2
    box3(hx, hy, fThick, hx + hW, hy + hH, fThick + hD, '#94a3b8', '#64748b')

    yOff += d.gapTop + d.h
  }

  // 6. Labels
  ctx.fillStyle = C.dimText
  ctx.font = `${Math.max(9, 11 / zoom)}px sans-serif`
  ctx.textAlign = 'left'
  const lp = p(W + 5 / zoom, H / 2, 0)
  ctx.fillText(`H: ${H}mm`, lp.x, lp.y)
  const bp = p(W / 2 - 20 / zoom, H + 12 / zoom, 0)
  ctx.fillText(`W: ${W}mm`, bp.x, bp.y)
  const dp = p(W + 3 / zoom, 8 / zoom, D / 2)
  ctx.fillText(`D: ${D}mm`, dp.x, dp.y)
}

// ─── Public entry ─────────────────────────────────────────────────────────────
export function renderView(canvas, state) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const { view } = state

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Grid
  ctx.strokeStyle = C.grid
  ctx.lineWidth = 0.5
  const step = 50 * state.zoom
  for (let x = state.panX % step; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
  }
  for (let y = state.panY % step; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
  }

  ctx.save()
  ctx.translate(state.panX, state.panY)
  ctx.scale(state.zoom, state.zoom)
  ctx.textBaseline = 'middle'

  if (view === 'front') drawFront(ctx, state, state.zoom)
  else if (view === 'side') drawSide(ctx, state, state.zoom)
  else if (view === 'top') drawTop(ctx, state, state.zoom)
  else if (view === '3d') draw3D(ctx, state, state.zoom)

  ctx.restore()
}

// ─── Auto-fit zoom ────────────────────────────────────────────────────────────
export function fitZoom(canvasW, canvasH, state) {
  const { cabinetW, cabinetD, cabinetH, view } = state
  const vW = view === 'top' ? cabinetD : cabinetW
  const vH = view === 'side' ? cabinetD : cabinetH
  const margin = 90
  const zoom = Math.min((canvasW - margin * 2) / vW, (canvasH - margin * 2) / vH) * 0.82
  const panX = (canvasW - vW * zoom) / 2
  const panY = (canvasH - vH * zoom) / 2 + 10
  return { zoom, panX, panY }
}
