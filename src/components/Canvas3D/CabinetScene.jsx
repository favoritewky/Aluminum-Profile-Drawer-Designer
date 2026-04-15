import { useMemo } from 'react'
import {
  expandVal,
  calcDrawerInnerW,
  calcDrawerInnerD,
  calcFacePanelSize,
} from '../../utils/bom.js'

// ─── Colour palette (mirrors draw.js C) ───────────────────────────────────────
const C = {
  profile:    '#dce9f7',
  panel:      '#d4edda',
  rail:       '#fde9b4',
  mountBeam:  '#f3e8ff',
  face:       '#e0eaff',
  faceHigh:   '#bcd4ff',
  handle:     '#94a3b8',
}

// ─── Atom: a single box mesh ──────────────────────────────────────────────────
// x1,y1,z1 / x2,y2,z2 are in canvas-coordinate space (Y↓, Z=0 is front face).
// We flip both Y and Z so three.js (Y↑, camera at +Z) sees the cabinet correctly:
//   canvasY → threeY = cabinetH - (y1 + h/2)
//   canvasZ → threeZ = cabinetD - (z1 + d/2)   (canvas front z=0 → high three.js Z, close to camera)
function Box({ x1, y1, z1, x2, y2, z2, color, opacity = 1, cabinetH, cabinetD }) {
  const w = x2 - x1
  const h = y2 - y1
  const d = z2 - z1
  const cx = x1 + w / 2
  const cy = cabinetH - (y1 + h / 2)
  const cz = cabinetD - (z1 + d / 2)
  return (
    <mesh position={[cx, cy, cz]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  )
}

// ─── Cabinet Scene ────────────────────────────────────────────────────────────
export default function CabinetScene({ state }) {
  const {
    cabinetW: W, cabinetH: H, cabinetD: D,
    profileW: pw, profileH: ph,
    drawerCount, currentDrawer,
    railType, railH, railThick, railGap, railLen,
  } = state
  const dpW = state.drawerProfileW ?? pw
  const dpH = state.drawerProfileH ?? ph

  const boxes = useMemo(() => {
    const out = []
    let key = 0
    const B = (x1, y1, z1, x2, y2, z2, color, opacity = 1) =>
      out.push({ key: key++, x1, y1, z1, x2, y2, z2, color, opacity })

    // 1. Cabinet shell — transparent panels (back / right / top)
    B(0, 0, D - pw,  W, H, D,  '#c8daef', 0.25)  // back face
    B(W - pw, 0, 0,  W, H, D,  '#b0c8e0', 0.20)  // right face
    B(0, 0, 0,  W, ph, D,      '#c8daef', 0.15)  // top face

    // 2. Cabinet frame — back posts + beams
    B(0,     0,     D - pw, pw,     H,     D,      C.profile)        // back-left post
    B(W - pw, 0,     D - pw, W,      H,     D,      C.profile)        // back-right post
    B(pw,    0,     D - ph, W - pw, ph,    D,      C.profile)        // back top beam
    B(pw,    H - ph, D - ph, W - pw, H,     D,      C.profile)        // back bottom beam

    // Side beams (depth-wise, back half, top & bottom)
    B(0,      0,     pw, pw,     ph,    D - pw, C.profile)
    B(0,      H - ph, pw, pw,     H,     D - pw, C.profile)
    B(W - pw, 0,     pw, W,      ph,    D - pw, C.profile)
    B(W - pw, H - ph, pw, W,      H,     D - pw, C.profile)

    // 3. Rail-mount beams + drawer rails
    if (railType === 'side') {
      for (let i = 0; i < drawerCount; i++) {
        const d = state.drawers[i]
        const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
        const fy = state.drawers.slice(0, i).reduce((a, dd) => a + dd.gapTop + dd.h, ph) + d.gapTop
        const innerW = calcDrawerInnerW(state, i)
        const innerD = calcDrawerInnerD(state)

        let railCY
        if (isAluminum) {
          railCY = state.drawers.slice(0, i).reduce((a, dd) => a + dd.gapTop + dd.h, ph)
            + d.gapTop + d.h - dpH / 2
        } else {
          railCY = fy + d.h / 2
        }
        const rY1 = railCY - railH / 2
        const rY2 = railCY + railH / 2

        // Cabinet side mount beams (aluminum only)
        if (isAluminum) {
          const bY1 = railCY - ph / 2
          const bY2 = railCY + ph / 2
          B(0,     bY1, pw, pw,     bY2, D - pw, C.mountBeam)  // left
          B(W - pw, bY1, pw, W,      bY2, D - pw, C.mountBeam)  // right
        }

        // Slide rails (left & right)
        const railX1 = pw + d.gapLeft - railThick - railGap
        const railX2 = pw + d.gapLeft + innerW + railGap
        const rl = Math.min(railLen, innerD)
        B(railX1,             rY1, 0, railX1 + railThick, rY2, rl, C.rail)
        B(railX2,             rY1, 0, railX2 + railThick, rY2, rl, C.rail)
      }
    }

    // 4. Drawer bodies (all drawers)
    for (let i = drawerCount - 1; i >= 0; i--) {
      const d = state.drawers[i]
      const fy = state.drawers.slice(0, i).reduce((a, dd) => a + dd.gapTop + dd.h, ph) + d.gapTop
      const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'
      const innerW = calcDrawerInnerW(state, i)
      const innerD = calcDrawerInnerD(state)
      const fx = pw, fw = innerW, fd = innerD

      if (isAluminum) {
        const fh = d.h - dpH
        // Back posts
        B(fx,           fy,      fd - dpW, fx + dpW,     fy + fh,    fd,      C.profile)
        B(fx + fw - dpW, fy,      fd - dpW, fx + fw,      fy + fh,    fd,      C.profile)
        // Back bottom beam
        B(fx,           fy + fh, fd - dpW, fx + fw,      fy + d.h,   fd,      C.profile)
        // Side bottom beams
        B(fx,           fy + fh, dpW,      fx + dpW,     fy + d.h,   fd - dpW, C.profile)
        B(fx + fw - dpW, fy + fh, dpW,      fx + fw,      fy + d.h,   fd - dpW, C.profile)
        // Front posts
        B(fx,           fy,      0,        fx + dpW,     fy + fh,    dpW,     C.profile)
        B(fx + fw - dpW, fy,      0,        fx + fw,      fy + fh,    dpW,     C.profile)
        // Front bottom beam
        B(fx,           fy + fh, 0,        fx + fw,      fy + d.h,   dpW,     C.profile)
      } else {
        const wt = d.facePanelThick
        // Back wall
        B(fx,           fy, fd,      fx + fw,          fy + d.h, fd + wt, C.panel)
        // Left wall
        B(fx,           fy, wt,      fx + wt,           fy + d.h, fd,      C.panel)
        // Right wall
        B(fx + fw - wt,  fy, wt,      fx + fw,          fy + d.h, fd,      C.panel)
        // Front wall
        B(fx,           fy, 0,       fx + fw,           fy + d.h, wt,      C.panel)
      }
    }

    // 5. Cabinet front posts + beams (drawn over drawers)
    B(0,      0,      0, pw,     H,      pw,  C.profile)  // front-left post
    B(W - pw, 0,      0, W,      H,      pw,  C.profile)  // front-right post
    B(pw,     0,      0, W - pw, ph,     pw,  C.profile)  // top beam
    B(pw,     H - ph, 0, W - pw, H,      pw,  C.profile)  // bottom beam

    // 6. Face panels + handles
    let yOff = ph
    for (let i = 0; i < drawerCount; i++) {
      const d = state.drawers[i]
      const fp = calcFacePanelSize(state, i)
      const exp = d.expand
      const fpX = pw + d.gapLeft - expandVal(exp.left, pw)
      const fpY = yOff + d.gapTop - expandVal(exp.top, ph)
      const isActive = i === currentDrawer
      const fThick = d.facePanelThick

      B(fpX, fpY, 0, fpX + fp.w, fpY + fp.h, fThick,
        isActive ? C.faceHigh : C.face, 0.92)

      // Handle protrudes OUTWARD from the face panel (z<0 is in front of z=0 outer surface)
      const hW = Math.min(60, fp.w * 0.25)
      const hH = 5, hD = 6
      const hx = fpX + fp.w / 2 - hW / 2
      const hy = fpY + fp.h / 2 - hH / 2
      B(hx, hy, -hD, hx + hW, hy + hH, 0, C.handle)

      yOff += d.gapTop + d.h
    }

    return out
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <group>
      {boxes.map(b => (
        <Box key={b.key} {...b} cabinetH={H} cabinetD={D} />
      ))}
    </group>
  )
}
