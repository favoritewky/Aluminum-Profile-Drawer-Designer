# 铝型材抽屉设计器 — Aluminum Profile Drawer Designer

一个基于浏览器的铝型材抽屉柜设计工具，支持实时 Canvas 渲染和 BOM 物料清单导出。

A browser-based design tool for aluminum profile drawer cabinets with real-time Canvas rendering and BOM export.

---

## 功能特性 / Features

- **双抽屉类型 / Dual drawer types** — 铝型材开顶抽屉（三通角件底部四角连接）或木质抽屉箱体  
  Aluminum open-top drawer (tee connectors at 4 bottom corners) or wood drawer box
- **独立型材规格 / Independent profile sizes** — 柜体框架与抽屉框架可分别设置截面尺寸  
  Cabinet frame and drawer frame have independent cross-section sizes
- **三种滑轨类型 / Three rail types** — 侧装 / 底装 / 隐藏式底装，含安装横梁位置标注  
  Side-mount / bottom-mount / undermount, with mount beam position annotations
- **四视图实时渲染 / Four live views** — 正视图、侧视图、俯视图、3D 斜轴测图  
  Front, side, top, and 3D oblique projection views
- **分组 BOM 导出 / Grouped BOM export** — 按柜体 / 每个抽屉过滤并导出 CSV 或打印  
  Filter and export by cabinet or individual drawer; CSV or print

---

## 快速开始 / Quick Start

```bash
npm install
npm run dev      # 开发服务器 / dev server → http://localhost:5173
npm run build    # 生产构建 / production build
npm run preview  # 预览构建产物 / preview build output
```

---

## 部署 / Deployment

本项目部署到 **Cloudflare Workers**（静态资源托管）。

Deployed to **Cloudflare Workers** (static asset hosting).

```bash
# 构建并部署（稳定版本）/ Build and deploy (stable)
npm run deploy
# 等价于 / equivalent to:
npx wrangler deploy

# 上传新版本（不立即全量发布，用于灰度）/ Upload a new version (without immediate full rollout)
npm run versions:upload
# 等价于 / equivalent to:
npx wrangler versions upload
```

首次部署前需登录：/ First-time setup — authenticate first:

```bash
npx wrangler login
```

部署配置见 [`wrangler.toml`](./wrangler.toml)：Worker 名称 `drawer-designer`，静态资源目录 `./dist`。

Deployment config is in [`wrangler.toml`](./wrangler.toml): Worker name `drawer-designer`, assets directory `./dist`.

---

## 技术栈 / Tech Stack

| 层 / Layer | 技术 / Technology |
|---|---|
| UI 框架 | React 19 |
| 构建工具 | Vite 6 |
| 样式 | Tailwind CSS 4 |
| 图形渲染 | HTML5 Canvas API（原生，无第三方库） |
| 状态管理 | `useReducer` + `useCallback` |
| 托管 | Cloudflare Workers (Static Assets) |

---

## 项目结构 / Project Structure

```
src/
├── App.jsx                        # 根布局：Header + Sidebar + Canvas + BOM
├── hooks/
│   └── useDrawerState.js          # 全局状态 reducer，所有设计参数
├── utils/
│   ├── bom.js                     # 几何计算 + BOM 生成（纯函数）
│   └── draw.js                    # Canvas 四视图绘制
└── components/
    ├── CanvasView.jsx             # Canvas 容器，视图切换按钮
    ├── BomTable.jsx               # BOM 表格，带分组过滤 Tab 和导出
    └── Sidebar/
        ├── index.jsx              # 侧边栏根组件
        ├── CabinetSection.jsx     # 柜体尺寸
        ├── ProfileSection.jsx     # 型材规格（柜体 / 抽屉分组）
        ├── DrawerSection.jsx      # 抽屉参数（类型、尺寸、展开模式）
        ├── RailSection.jsx        # 滑轨设置
        ├── MaterialSection.jsx    # 板材 / 连接件 / 端盖
        └── ui.jsx                 # 通用 UI 原子组件
```

---

## 设计约定 / Design Conventions

### 铝型材抽屉结构 / Aluminum drawer structure

```
┌──────────┐  ← 无顶梁（开顶）/ No top beam (open top)
│          │
│  (空腔)  │  四立柱高度 = 抽屉高 − 1个梁高
│          │  Post height = drawer H − 1 beam height
└──┬────┬──┘
   │角件│     ← 底部四角：三通角件 / 4 bottom corners: tee connector
```

每个底角连接：前/后梁 + 侧梁 + 立柱，共 12 颗螺钉（3 颗/角件）。

Each bottom corner joins: front/back beam + side beam + post — 12 screws total (3 per connector).

### 侧面滑轨安装原理 / Side-rail mount beam alignment

```
柜顶横梁 ──────────────────────
                               ↑ profileH
侧装安装横梁 ══════════════════  ← 中心线与抽屉底梁中心线齐平
                               ↑ gapTop + d.h − dpH/2
抽屉底梁   ──────────────────── ← 中心
```

`calcRailBeamCenterY(state, i)` 返回从柜顶到抽屉底梁中心的距离，同时用于：
- BOM 备注（安装位置和端头攻丝提示）
- 侧视图安装横梁绘制与标注
- 正视图滑轨端面绘制
- 3D 视图滑轨和安装横梁绘制

`calcRailBeamCenterY(state, i)` returns the distance from cabinet top to drawer bottom beam center, shared across BOM notes, side view annotations, front view rail cross-sections, and 3D view.

### 坐标系 / Coordinate system

Canvas 坐标原点在**柜体外轮廓左上角**，Y 轴向下。3D 斜轴测投影：

Canvas origin is the **cabinet outer bounding box top-left**, Y increases downward. 3D oblique projection:

```js
p(x, y, z) = { x: x + z * 0.45,  y: y − z * 0.28 }
```

### 内宽计算 / Inner width calculation

```
drawerInnerW = cabinetW − 2×profileW − gapLeft − gapRight
             − 2×(railThick + railGap)   [侧装滑轨时 / if side-mount rail]
```

铝型材抽屉底板内尺寸再各减去两侧抽屉型材壁：`innerW − 2×dpW`。

Aluminum drawer bottom panel further subtracts drawer profile walls: `innerW − 2×dpW`.
