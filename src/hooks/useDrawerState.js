import { useReducer, useCallback } from 'react'

// ─── Default state ────────────────────────────────────────────────────────────
export const EXPAND_CYCLE = ['none', 'half', 'full']

function defaultDrawer(h = 120) {
  return {
    h,
    gapTop: 5,
    gapLeft: 2,
    gapRight: 2,
    bottomThick: 6,
    facePanelThick: 18,
    drawerType: 'aluminum', // 'aluminum' | 'wood'
    expand: { top: 'none', bottom: 'none', left: 'none', right: 'none' },
  }
}

function buildDrawers(count, existing = []) {
  return Array.from({ length: count }, (_, i) =>
    existing[i] ?? defaultDrawer()
  )
}

const INITIAL = {
  // Cabinet
  cabinetW: 600,
  cabinetD: 500,
  cabinetH: 720,
  drawerCount: 3,

  // Profile
  profileW: 30,
  profileH: 30,
  profileThick: 1.5,

  // Drawer profile (may differ from cabinet frame profile)
  drawerProfileW: 20,
  drawerProfileH: 20,

  // Rail
  railType: 'side',   // 'side' | 'bottom' | 'undermount' | 'none'
  railThick: 12.7,
  railH: 45,
  railLen: 450,
  railGap: 0,

  // Materials
  panelMaterial: 'plywood',
  sheetW: 1220,
  sheetH: 2440,

  // Connectors
  cornerType: 'tee',
  screwType: 'M4x10',
  capType: 'plastic',

  // UI
  currentDrawer: 0,
  view: 'front',

  // Per-drawer array
  drawers: buildDrawers(3),
}

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET': {
      return { ...state, [action.key]: action.value }
    }
    case 'SET_MANY': {
      return { ...state, ...action.payload }
    }
    case 'SET_DRAWER_COUNT': {
      const count = Math.max(1, Math.min(12, action.count))
      const drawers = buildDrawers(count, state.drawers)
      const currentDrawer = Math.min(state.currentDrawer, count - 1)
      return { ...state, drawerCount: count, drawers, currentDrawer }
    }
    case 'SET_DRAWER_FIELD': {
      const drawers = state.drawers.map((d, i) =>
        i === state.currentDrawer ? { ...d, [action.key]: action.value } : d
      )
      return { ...state, drawers }
    }
    case 'CYCLE_EXPAND': {
      const { dir } = action
      const d = state.drawers[state.currentDrawer]
      const cur = EXPAND_CYCLE.indexOf(d.expand[dir])
      const next = EXPAND_CYCLE[(cur + 1) % 3]
      const expand = { ...d.expand, [dir]: next }
      const drawers = state.drawers.map((dr, i) =>
        i === state.currentDrawer ? { ...dr, expand } : dr
      )
      return { ...state, drawers }
    }
    case 'SET_CURRENT_DRAWER': {
      return { ...state, currentDrawer: action.index }
    }
    default:
      return state
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDrawerState() {
  const [state, dispatch] = useReducer(reducer, INITIAL)

  const set = useCallback((key, value) => dispatch({ type: 'SET', key, value }), [])
  const setMany = useCallback((payload) => dispatch({ type: 'SET_MANY', payload }), [])
  const setDrawerCount = useCallback((count) => dispatch({ type: 'SET_DRAWER_COUNT', count }), [])
  const setDrawerField = useCallback((key, value) => dispatch({ type: 'SET_DRAWER_FIELD', key, value }), [])
  const cycleExpand = useCallback((dir) => dispatch({ type: 'CYCLE_EXPAND', dir }), [])
  const setCurrentDrawer = useCallback((index) => dispatch({ type: 'SET_CURRENT_DRAWER', index }), [])

  return { state, set, setMany, setDrawerCount, setDrawerField, cycleExpand, setCurrentDrawer }
}
