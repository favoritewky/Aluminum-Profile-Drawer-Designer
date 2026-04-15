import { Shape, Rect, Line, Text, Group } from 'react-konva'

// ─── Colour palette ───────────────────────────────────────────────────────────
export const C = {
  profileStroke:   '#3b6ea5',
  profileFill:     '#dce9f7',
  profileHatch:    'rgba(59,110,165,0.28)',
  panelStroke:     '#5c9e52',
  panelFill:       '#d4edda',
  railStroke:      '#c07e18',
  railFill:        '#fde9b4',
  mountBeamStroke: '#9333ea',
  mountBeamFill:   '#f3e8ff',
  mountBeamHatch:  'rgba(147,51,234,0.22)',
  faceFill:        '#e0eaff',
  faceHighFill:    '#bcd4ff',
  highlight:       '#2563eb',
  dimLine:         '#94a3b8',
  dimText:         '#475569',
  mountDimText:    '#7e22ce',
}

// ─── ProfileShape ─────────────────────────────────────────────────────────────
// Aluminum profile rectangle with hatch fill.
export function ProfileShape({ x, y, w, h }) {
  return (
    <Shape
      x={x} y={y}
      listening={false}
      sceneFunc={(ctx) => {
        ctx.fillStyle = C.profileFill
        ctx.fillRect(0, 0, w, h)

        // Hatch at 45°
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, w, h)
        ctx.clip()
        ctx.strokeStyle = C.profileHatch
        ctx.lineWidth = 0.4
        const stride = 8
        const diag = Math.sqrt(w * w + h * h) + stride
        const steps = Math.ceil(diag * 2 / stride) + 2
        ctx.translate(w / 2, h / 2)
        ctx.rotate(Math.PI / 4)
        for (let i = -steps; i <= steps; i++) {
          ctx.beginPath()
          ctx.moveTo(i * stride, -diag)
          ctx.lineTo(i * stride, diag)
          ctx.stroke()
        }
        ctx.restore()

        ctx.strokeStyle = C.profileStroke
        ctx.lineWidth = 1.5
        ctx.strokeRect(0, 0, w, h)
      }}
    />
  )
}

// ─── MountBeamShape ───────────────────────────────────────────────────────────
// Purple rail-mount beam with reverse hatch.
export function MountBeamShape({ x, y, w, h }) {
  return (
    <Shape
      x={x} y={y}
      listening={false}
      sceneFunc={(ctx) => {
        ctx.fillStyle = C.mountBeamFill
        ctx.fillRect(0, 0, w, h)

        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, w, h)
        ctx.clip()
        ctx.strokeStyle = C.mountBeamHatch
        ctx.lineWidth = 0.4
        const stride = 8
        const diag = Math.sqrt(w * w + h * h) + stride
        const steps = Math.ceil(diag * 2 / stride) + 2
        ctx.translate(w / 2, h / 2)
        ctx.rotate(-Math.PI / 4)
        for (let i = -steps; i <= steps; i++) {
          ctx.beginPath()
          ctx.moveTo(i * stride, -diag)
          ctx.lineTo(i * stride, diag)
          ctx.stroke()
        }
        ctx.restore()

        ctx.strokeStyle = C.mountBeamStroke
        ctx.lineWidth = 1.5
        ctx.strokeRect(0, 0, w, h)
      }}
    />
  )
}

// ─── PanelShape ───────────────────────────────────────────────────────────────
export function PanelShape({ x, y, w, h }) {
  return <Rect x={x} y={y} width={w} height={h} fill={C.panelFill} stroke={C.panelStroke} strokeWidth={0.8} listening={false} />
}

// ─── RailShape ────────────────────────────────────────────────────────────────
export function RailShape({ x, y, w, h }) {
  return <Rect x={x} y={y} width={w} height={h} fill={C.railFill} stroke={C.railStroke} strokeWidth={0.8} listening={false} />
}

// ─── DimLine ──────────────────────────────────────────────────────────────────
// Dimension annotation with arrowheads and text label.
export function DimLine({ x1, y1, x2, y2, text, color = C.dimText }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        const horiz = Math.abs(y2 - y1) < 0.5
        const aw = 5, ah = 2.5

        ctx.strokeStyle = C.dimLine
        ctx.lineWidth = 0.7
        ctx.setLineDash([3, 3])

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        if (horiz) {
          ctx.moveTo(x1, y1); ctx.lineTo(x1 + aw, y1 - ah)
          ctx.moveTo(x1, y1); ctx.lineTo(x1 + aw, y1 + ah)
          ctx.moveTo(x2, y2); ctx.lineTo(x2 - aw, y2 - ah)
          ctx.moveTo(x2, y2); ctx.lineTo(x2 - aw, y2 + ah)
        } else {
          ctx.moveTo(x1, y1); ctx.lineTo(x1 - ah, y1 + aw)
          ctx.moveTo(x1, y1); ctx.lineTo(x1 + ah, y1 + aw)
          ctx.moveTo(x2, y2); ctx.lineTo(x2 - ah, y2 - aw)
          ctx.moveTo(x2, y2); ctx.lineTo(x2 + ah, y2 - aw)
        }
        ctx.stroke()
        ctx.setLineDash([])

        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        ctx.font = '10px sans-serif'
        const tw = ctx.measureText(text).width
        const pad = 3
        ctx.fillStyle = 'rgba(247,248,250,0.9)'
        ctx.fillRect(mx - tw / 2 - pad, my - 7, tw + 2 * pad, 14)
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, mx, my)
      }}
    />
  )
}
