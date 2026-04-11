// ─── Geometry helpers ─────────────────────────────────────────────────────────

export function expandVal(mode, size) {
  if (mode === 'half') return size / 2
  if (mode === 'full') return size
  return 0
}

export function calcDrawerInnerW(state, drawerIdx) {
  const d = state.drawers[drawerIdx]
  const { cabinetW, profileW, drawerProfileW, railType, railThick, railGap } = state
  const dpW = drawerProfileW ?? profileW
  // Cabinet opening minus drawer side gaps and rails
  let w = cabinetW - 2 * profileW - d.gapLeft - d.gapRight
  if (railType === 'side') w -= 2 * (railThick + railGap)
  // For aluminum drawers the inner usable space is further reduced by drawer profile walls
  // (inner width between drawer profiles, not total box width)
  return Math.max(w, 10)
}

// Returns the outer box width of the drawer (between left/right drawer profile outer faces)
export function calcDrawerBoxW(state, drawerIdx) {
  return calcDrawerInnerW(state, drawerIdx)
}

export function calcDrawerInnerD(state) {
  const { cabinetD, profileW, railLen, railType } = state
  const max = cabinetD - profileW * 2
  return railType === 'none' ? max : Math.min(railLen, max)
}

// Y coordinate from cabinet top (including top beam) to center of drawer's bottom beam.
// This is also where the cabinet side rail-mount beam must be centered.
export function calcRailBeamCenterY(state, drawerIdx) {
  const { profileH, drawerProfileH } = state
  const dpH = drawerProfileH ?? profileH
  let y = profileH
  for (let i = 0; i < drawerIdx; i++) {
    y += state.drawers[i].gapTop + state.drawers[i].h
  }
  const d = state.drawers[drawerIdx]
  return y + d.gapTop + d.h - dpH / 2
}

export function calcFacePanelSize(state, drawerIdx) {
  const d = state.drawers[drawerIdx]
  const { profileW, profileH, cabinetW } = state
  const exp = d.expand
  // Face panel base width fills the opening between the two cabinet columns, minus drawer gaps
  const baseW = cabinetW - 2 * profileW - d.gapLeft - d.gapRight
  const w = baseW + expandVal(exp.left, profileW) + expandVal(exp.right, profileW)
  const h = d.h + d.gapTop + expandVal(exp.top, profileH) + expandVal(exp.bottom, profileH)
  return { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 }
}

// ─── BOM generation ───────────────────────────────────────────────────────────

const MATERIAL_LABELS = {
  plywood: '胶合板',
  mdf: '中密度纤维板(MDF)',
  particleboard: '颗粒板',
  solid: '实木板',
  aluminum: '铝板',
}
const CORNER_LABELS = {
  tee: '三通角件',
  l20: 'L型角码20mm',
  l40: 'L型角码40mm',
  corner_slot: '槽用角码',
  tnut: 'T螺母组合',
}
const RAIL_LABELS = {
  side: '侧装滑轨',
  bottom: '底装滑轨',
  undermount: '隐藏式底装滑轨',
}
const CAP_LABELS = { plastic: '塑料端盖', aluminum: '铝制端盖' }

export function generateBOM(state) {
  const {
    cabinetW, cabinetD, cabinetH, profileW, profileH, drawerCount,
    drawerProfileW, drawerProfileH,
    railType, railThick, railLen, railGap,
    panelMaterial, sheetW, sheetH,
    cornerType, screwType, capType,
  } = state
  const dpW = drawerProfileW ?? profileW
  const dpH = drawerProfileH ?? profileH

  const items = []

  function add(type, name, spec, qty, unit, note = '', scope = 'cabinet') {
    const ex = items.find(x => x.name === name && x.spec === spec && x.scope === scope)
    if (ex) { ex.qty += qty }
    else items.push({ type, name, spec, qty, unit, note, scope })
  }

  const matLabel = MATERIAL_LABELS[panelMaterial] || panelMaterial
  const cornerLabel = CORNER_LABELS[cornerType] || cornerType
  const capLabel = CAP_LABELS[capType] || ''

  // ── Per-drawer ──
  for (let i = 0; i < drawerCount; i++) {
    const d = state.drawers[i]
    const lbl = `抽屉${i + 1}`
    const innerW = calcDrawerInnerW(state, i)
    const innerD = calcDrawerInnerD(state)
    const isAluminum = (d.drawerType ?? 'aluminum') === 'aluminum'

    if (isAluminum) {
      // Aluminum profile frame drawer (open top, connected with 三通角件 at 4 bottom corners)
      // Front/back horizontal beams
      add('profile', '抽屉横梁（前/后）',
        `${dpW}×${dpH}×${Math.round(innerW)}mm`, 2, '根', lbl, `drawer-${i}`)
      // Side horizontal beams (depth direction) — only bottom pair, no top
      add('profile', '抽屉横梁（侧向）',
        `${dpW}×${dpH}×${Math.round(innerD - 2 * dpW)}mm`, 2, '根', lbl, `drawer-${i}`)
      // Vertical posts: height = drawer height minus one beam at bottom (top is open)
      add('profile', '抽屉立柱',
        `${dpW}×${dpH}×${Math.round(d.h - dpH)}mm`, 4, '根', lbl, `drawer-${i}`)

      // Connectors: 4 bottom corners (三通角件), each needs 3 screws
      add('connector', cornerLabel, '', 4, '个', `${lbl} 底部四角`, `drawer-${i}`)
      add('screw', `内六角螺钉 ${screwType}`, screwType, 12, '颗', lbl, `drawer-${i}`)

      if (capType !== 'none') {
        // Caps only on the 4 top open ends of the vertical posts
        add('connector', capLabel, `${dpW}×${dpH}mm`, 4, '个', `${lbl} 立柱顶端`, `drawer-${i}`)
      }
      if (cornerType === 'tnut') {
        add('connector', 'T型滑块螺母', screwType.substring(0, 2) + ' 规格', 12, '个', lbl, `drawer-${i}`)
      }

      // Bottom panel sits inside the frame
      const bpW = Math.round(innerW - 2 * dpW)
      const bpD = Math.round(innerD - 2 * dpW)
      add('panel', '抽屉底板',
        `${bpW}×${bpD}mm 厚${d.bottomThick}mm`,
        1, '块', `${lbl} | ${matLabel}`, `drawer-${i}`)
    } else {
      // Wood drawer box: 2 side panels + front + back panel
      const sideThick = d.facePanelThick
      add('panel', '抽屉侧板',
        `${Math.round(innerD)}×${Math.round(d.h)}mm 厚${sideThick}mm`,
        2, '块', `${lbl} | ${matLabel}`, `drawer-${i}`)
      add('panel', '抽屉前/后板',
        `${Math.round(innerW - 2 * sideThick)}×${Math.round(d.h)}mm 厚${sideThick}mm`,
        2, '块', `${lbl} | ${matLabel}`, `drawer-${i}`)
      add('panel', '抽屉底板',
        `${Math.round(innerW - 2 * sideThick)}×${Math.round(innerD - 2 * sideThick)}mm 厚${d.bottomThick}mm`,
        1, '块', `${lbl} | ${matLabel}`, `drawer-${i}`)
    }

    // Face panel
    const fp = calcFacePanelSize(state, i)
    add('panel', '抽屉面板',
      `${fp.w}×${fp.h}mm 厚${d.facePanelThick}mm`,
      1, '块', `${lbl} | ${matLabel}`, `drawer-${i}`)

    // Rail
    if (railType !== 'none') {
      const rl = Math.round(Math.min(railLen, innerD))
      add('rail', RAIL_LABELS[railType] || '滑轨',
        `长${rl}mm × 高${state.railH}mm × 厚${railThick}mm`, 1, '副', lbl, `drawer-${i}`)
    }
  }

  // ── Cabinet frame ──
  const cInnerW = Math.round(cabinetW - 2 * profileW)
  const cInnerD = Math.round(cabinetD - 2 * profileW)
  add('profile', '柜体立柱', `${profileW}×${profileH}×${cabinetH}mm`, 4, '根', '柜体框架')
  add('profile', '柜体横梁（宽向）', `${profileW}×${profileH}×${cInnerW}mm`, 4, '根', '柜体框架 上下各2')
  add('profile', '柜体横梁（深向）', `${profileW}×${profileH}×${cInnerD}mm`, 4, '根', '柜体框架 上下各2')
  add('connector', cornerLabel, screwType.replace(/x.*/, '') + ' 规格', 8, '个', '柜体框架')
  add('screw', `内六角螺钉 ${screwType}`, screwType, 16, '颗', '柜体框架')
  if (capType !== 'none') {
    add('connector', capLabel, `${profileW}×${profileH}mm`, 8, '个', '柜体框架')
  }

  // ── Rail-mount beams on cabinet sides (one per aluminum drawer with side rail) ──
  // Each beam is mortised/tapped at both ends into the cabinet columns.
  // Beam center aligns with the drawer's bottom profile center.
  if (railType === 'side') {
    for (let i = 0; i < drawerCount; i++) {
      const d = state.drawers[i]
      if ((d.drawerType ?? 'aluminum') !== 'aluminum') continue
      const beamCY = Math.round(calcRailBeamCenterY(state, i))
      // Use drawer-specific name so entries are never merged across drawers
      const name = `侧面滑轨安装横梁（抽屉${i + 1}）`
      const note = `中心距柜顶 ${beamCY}mm | 两端攻丝 | 左右各1`
      add('profile', name, `${profileW}×${profileH}×${cInnerD}mm`, 2, '根', note)
    }
  }

  // Cabinet back panel
  add('panel', '柜体背板',
    `${cInnerW}×${Math.round(cabinetH - 2 * profileH)}mm 厚6mm`,
    1, '块', `${matLabel}`)

  return items
}

export const BOM_TYPE_META = {
  profile:   { label: '型材',   color: 'bg-blue-100 text-blue-700' },
  panel:     { label: '板材',   color: 'bg-purple-100 text-purple-700' },
  rail:      { label: '滑轨',   color: 'bg-green-100 text-green-700' },
  connector: { label: '连接件', color: 'bg-pink-100 text-pink-700' },
  screw:     { label: '螺钉',   color: 'bg-orange-100 text-orange-700' },
}
export const BOM_TYPE_ORDER = ['profile', 'panel', 'rail', 'connector', 'screw']
