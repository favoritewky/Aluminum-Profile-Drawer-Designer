# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

铝型材抽屉设计器 (Aluminum Profile Drawer Designer) — a client-side React + Vite application for designing aluminum profile drawer cabinets with real-time multi-view visualization and Bill of Materials (BOM) generation.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server with HMR
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test framework is installed.

## Architecture

### Data Flow

All application state lives in `src/hooks/useDrawerState.js` via `useReducer`. The `App.jsx` component holds the single `state` object and `dispatch` function, passing relevant slices down as props to:
- `Sidebar/` components (read/write via dispatch)
- `CanvasView.jsx` (read-only, passes full state to `draw.js`)
- `BomTable.jsx` (read-only, passes full state to `bom.js`)

### State Shape

Key state fields (all dimensions in mm):
- Cabinet: `cabinetW`, `cabinetD`, `cabinetH`
- Profile: `profileW`, `profileH`, `profileThick`
- Rail: `railType` (`'side'|'bottom'|'undermount'|'none'`), `railThick`, `railH`, `railLen`, `railGap`
- Drawers: `drawers[]` array — each drawer has `height`, `gaps`, `thick`, and four expansion mode fields
- Panel: `panelMaterial`, `sheetW`, `sheetH`
- UI: `currentDrawer`, `view` (`'front'|'side'|'top'|'3d'`), `zoom`, `panX`, `panY`

Reducer action types: `SET`, `SET_MANY`, `SET_DRAWER_COUNT`, `SET_DRAWER_FIELD`, `CYCLE_EXPAND`, `SET_CURRENT_DRAWER`.

### Core Logic

**`src/utils/draw.js`** — All canvas rendering. `renderView(canvas, state)` is the main entry. Calls one of `drawFront`, `drawSide`, `drawTop`, or `draw3D` depending on `state.view`. Uses raw HTML5 Canvas API (no graphics library). Includes zoom/pan coordinate transforms.

**`src/utils/bom.js`** — Geometry and BOM. Key exported functions:
- `calcDrawerInnerW(state)` / `calcDrawerInnerD(state)` — compute usable interior space accounting for profiles, rails, and gaps
- `calcFacePanelSize(state, drawer)` — face panel dimensions with expansion modes
- `generateBOM(state)` — returns grouped BOM array with 5 categories: 型材, 板材, 滑轨, 连接件, 螺钉

### Component Structure

`Sidebar/ui.jsx` exports shared primitives used by all sidebar sections: `NumInput`, `SelectInput`, `Field`, `Row2`, `Row3`, `SectionTitle`. Sidebar sections are independent; each receives the slice of state it needs and dispatches actions.

`CanvasView.jsx` manages mouse events for pan/drag and calls `renderView` on every state change via `useEffect`.

## Extending the App

- **New sidebar section:** Create a component in `src/components/Sidebar/`, import it in `Sidebar/index.jsx`, add needed state fields to `INITIAL` in `useDrawerState.js`, and handle them in the reducer.
- **New canvas view:** Add a draw function in `draw.js`, add the view key to the `view` state, and add a tab in `CanvasView.jsx`.
- **New BOM category:** Add logic in `generateBOM()` in `bom.js` and update `BomTable.jsx` if needed.

## BOM Parser — Panel Dimension Rules (`src/utils/bomParserLogic.js`)

Both `parseTextBOM` (text path) and `parseJsonBOM` (JSON path) must apply these adjustments after extracting raw dimensions:

| Code prefix | Material | Adjustment |
|-------------|----------|------------|
| `2.87` | 聚碳酸酯（插板） | 长和宽各 **−10 mm**（内嵌余量） |
| `2.83` | PVC 发泡板（侧板） | 宽边 **+18 mm**（与前柜门亚克力齐平） |
| `2.86` | 亚克力（柜门） | 原样，不调整 |

The JSON path reads vertices from `e.data.PLN_CONTOUR.vertices` and computes a bounding box; the adjustments must be applied to the resulting `dims` array **before** pushing to `panelBuf`.

## BOM Parser — JSON Profile Machining (`src/utils/bomParserLogic.js`)

`parseJsonMachining(machList, profileLen)` converts `entity.data.machining` into a `subs[]` array compatible with the text-path `parseMachining` output.

Only `MACH_TYPE_CROSS_BORE` entries are extracted — these are user-drawn countersunk/counterbore holes on profiles. All other types (`MACH_TYPE_CONN_BORE`, `MACH_TYPE_CUT_SLICE`, `MACH_TYPE_CUT_PNL`, `MACH_TYPE_BORE_PNL`) are ignored.

Fields per `CROSS_BORE` entry:
- `attributes.main_diameter` → drill diameter (⌀Xmm)
- `attributes.second_diameter` / `second_depth` → countersink info (沉头⌀Xmm深Ymm), omitted if ≤ 0
- `matrix[13]` → position along profile axis; compared to `profileLen/2` to report "距左/右端 Xmm"
- `matrix[12]` / `matrix[14]` → face coordinates, shown as `面(xN,zN)` in fingerprint

Aggregation key for `profMap`/`ppMap` is `${code}|${length}|${machining_sig}` where `machining_sig` is the sorted fingerprints joined by `;`. Profiles with the same code/length but different bore patterns are listed separately and `markWarnings` correctly flags them with ⚠.


