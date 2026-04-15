import { useState } from 'react'
import * as XLSX from 'xlsx'

// ─── parseMachining ───────────────────────────────────────────────────────────
function parseMachining(letter, rest) {
  const body = rest
    .replace(/^\S+\s+/, '')
    .replace(/\s+EA\s+\d+\s*$/i, '')
    .trim()

  const typeM  = body.match(/^([^，,]+)/)
  const dirM   = body.match(/[，,]\s*([左右])/)
  const diaM   = body.match(/([左右])\s*([\d.]+)\s*mm/i)
  const distM  = body.match(/距离\s*([\d.]+)\s*mm/i)
  const faceM  = body.match(/侧面[：:]\s*(\d+)/i)

  const type    = typeM?.[1]?.trim() ?? body
  const fromDir = dirM?.[1] ?? diaM?.[1] ?? ''
  const dia     = diaM?.[2] ? parseFloat(diaM[2]) : null
  const dist    = distM?.[1] ? parseFloat(distM[1]) : null
  const face    = faceM?.[1] ? +faceM[1] : null

  const diaStr  = dia  != null ? `⌀${dia}mm` : ''
  const faceStr = face != null ? `侧面${face}` : ''
  const distStr = dist != null ? `距${fromDir === '右' ? '右' : '左'}端${dist}mm` : ''
  const detail  = [diaStr, faceStr, distStr].filter(Boolean).join('，')

  return { letter, type, detail, fingerprint: `${type}|${diaStr}|${faceStr}|${distStr}` }
}

// ─── parseItems ───────────────────────────────────────────────────────────────
function parseItems(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  const mainLines = {}, subItems = {}, order = []
  let pending = null
  let inPageBreak = false   // suppress continuation lines during PDF page headers

  for (const line of lines) {
    if (/框架重量/.test(line) || /^\d+\.\d+\s*kg/i.test(line)) continue

    // PDF page-break header starts with "页码："
    if (/^页码[：:]/.test(line)) { inPageBreak = true; continue }

    const subM = line.match(/^(\d+)\.([A-Za-z])\s+(.+)$/)
    if (subM) {
      inPageBreak = false
      const pNum = +subM[1]
      if (!subItems[pNum]) subItems[pNum] = []
      subItems[pNum].push({ letter: subM[2].toUpperCase(), rest: subM[3] })
      pending = null
      continue
    }
    if (/^\d+\s/.test(line)) {
      inPageBreak = false
      const num = +line.match(/^(\d+)/)[1]
      mainLines[num] = line
      if (!order.includes(num)) order.push(num)
      pending = num
      continue
    }
    // Continuation — skip while inside a page-break header block
    if (pending !== null && !inPageBreak) mainLines[pending] += ' ' + line
  }

  const items = []
  for (const num of order) {
    const line = mainLines[num]
    const m = line.match(/^(\d+)\s+(\S+)\s+(.*?)\s+(MM|EA|SM)\s+(\d+)\s*$/)
    if (!m) continue
    const [, , code, rawDesc, , qty] = m
    const drawRef = (rawDesc.match(/\*\*图纸(\w+)\*\*/) || [])[1] ?? null
    const desc    = rawDesc.replace(/\*\*图纸\w+\*\*/g, '').trim()
    const subs    = (subItems[num] || []).map(s => parseMachining(s.letter, s.rest))
    items.push({ num, code, desc, qty: +qty, drawRef, subs, warned: false })
  }

  const profiles = [], ppProfiles = [], panels = [], hardware = [], others = []

  for (const it of items) {
    const { num, code, desc, qty, drawRef, subs } = it

    if (code.startsWith('1.11.030030')) {
      const len = (code.match(/\/(\d+)$/) || [])[1]
      profiles.push({ num, code, length: len ? +len : 0, qty, drawRef, subs, warned: false })

    } else if (code.startsWith('1.41.F14')) {
      const len = (code.match(/\/(\d+)$/) || [])[1]
      ppProfiles.push({ num, code, length: len ? +len : 0, qty, drawRef, subs, warned: false })

    } else if (code === '2.86.2362-99') {
      const dm   = desc.match(/大小：([\d.]+)MM\s*x\s*([\d.]+)MM/i)
      const dims = dm ? [Math.round(+dm[1]), Math.round(+dm[2])] : null
      const note = /Special Order/i.test(desc) ? '特殊订货，需单独报价' : ''
      panels.push({ num, material: '亚克力', spec: '6mm', dims, qty, drawRef, note })

    } else if (code === '2.87.1571-99') {
      const dm   = desc.match(/大小：([\d.]+)MM\s*x\s*([\d.]+)MM/i)
      const dims = dm ? [Math.round(+dm[1]) - 10, Math.round(+dm[2]) - 10] : null
      panels.push({ num, material: '聚碳酸酯', spec: '4mm', dims, qty, drawRef, note: '每边已减10mm' })

    } else if (code === '0.63.D07991.04008') {
      hardware.push({ num, name: '沉头螺钉 M4×8', qty })
    } else if (code === '0.63.D07991.06012') {
      hardware.push({ num, name: '沉头螺钉 M6×12', qty })
    } else if (code === '1.21.3F1') {
      hardware.push({ num, name: '标准连接件', qty })
    } else if (code === '1.31.FM4') {
      hardware.push({ num, name: '螺母板 M4', qty })
    } else if (code === '1.31.FM6') {
      hardware.push({ num, name: '螺母板 M6', qty })
    } else {
      others.push({ num, code, desc, qty, drawRef })
    }
  }

  // Machining mismatch warnings
  function markWarnings(list) {
    const byCode = {}
    for (const p of list) {
      if (!byCode[p.code]) byCode[p.code] = []
      byCode[p.code].push(p)
    }
    for (const group of Object.values(byCode)) {
      if (group.length < 2) continue
      const sigs = group.map(p =>
        p.subs.length === 0 ? '(无加工)' : p.subs.map(s => s.fingerprint).sort().join(';')
      )
      if (!sigs.every(s => s === sigs[0])) group.forEach(p => { p.warned = true })
    }
  }
  markWarnings(profiles)
  markWarnings(ppProfiles)

  // ── Summary: only 铝型材 + 面板 ──────────────────────────────────────────
  const summary = {
    profileCount:   profiles.reduce((s, p) => s + p.qty, 0),
    profileTotalMm: profiles.reduce((s, p) => s + p.length * p.qty, 0),
    acrylicCount:   panels.filter(p => p.material === '亚克力').reduce((s, p) => s + p.qty, 0),
    acrylicAreaMm2: panels.filter(p => p.material === '亚克力')
      .reduce((s, p) => s + (p.dims ? p.dims[0] * p.dims[1] * p.qty : 0), 0),
    polycarbCount:  panels.filter(p => p.material === '聚碳酸酯').reduce((s, p) => s + p.qty, 0),
    polycarbAreaMm2: panels.filter(p => p.material === '聚碳酸酯')
      .reduce((s, p) => s + (p.dims ? p.dims[0] * p.dims[1] * p.qty : 0), 0),
  }

  return { profiles, ppProfiles, panels, hardware, others, summary }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmtN    = n  => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const fmtLen  = mm => `${fmtN(mm)} mm（${(mm / 1000).toFixed(2)} m）`
const fmtArea = mm2 => `${fmtN(mm2)} mm²（${(mm2 / 1e6).toFixed(4)} m²）`

// ─── formatText ───────────────────────────────────────────────────────────────
function formatText({ profiles, ppProfiles, panels, hardware, others, summary }) {
  const out = []
  const now = new Date()
  const ts  = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('/')
    + ' ' + [String(now.getHours()).padStart(2,'0'), String(now.getMinutes()).padStart(2,'0')].join(':')

  out.push('MayCAD BOM 整理报告')
  out.push(`生成时间：${ts}`)
  out.push('═'.repeat(48))
  out.push('')

  let sec = 1
  function pushProfile(p) {
    const ref  = p.drawRef ? `  （图纸${p.drawRef}）` : ''
    const warn = p.warned  ? '  ⚠' : ''
    out.push(`  #${p.num}  ${p.length}mm × ${p.qty}件${ref}${warn}`)
    for (const s of p.subs) out.push(`       加工 ${s.letter}：${s.type}，${s.detail}`)
  }

  if (profiles.length) {
    out.push(`【${sec++}、铝型材 30×30mm】`)
    profiles.forEach(pushProfile)
    out.push('')
  }
  if (ppProfiles.length) {
    out.push(`【${sec++}、PP 组合型材（盖板槽）】`)
    ppProfiles.forEach(pushProfile)
    out.push('')
  }
  if (panels.length) {
    out.push(`【${sec++}、面板】`)
    for (const p of panels) {
      const ref     = p.drawRef ? `  （图纸${p.drawRef}）` : ''
      const dimsStr = p.dims ? `${p.dims[0]} × ${p.dims[1]} mm` : '尺寸未知'
      const noteStr = p.note ? `  [${p.note}]` : ''
      out.push(`  #${p.num}  ${p.material} ${p.spec}，尺寸：${dimsStr}，${p.qty}件${ref}${noteStr}`)
    }
    out.push('')
  }
  if (hardware.length) {
    out.push(`【${sec++}、标准件及连接件】`)
    hardware.forEach(h => out.push(`  #${h.num}  ${h.name}，${h.qty}件`))
    out.push('')
  }
  if (others.length) {
    out.push(`【${sec++}、其他】`)
    others.forEach(o => {
      const ref = o.drawRef ? `  （图纸${o.drawRef}）` : ''
      out.push(`  #${o.num}  [${o.code}]  ${o.desc}，${o.qty}件${ref}`)
    })
    out.push('')
  }

  if (!profiles.length && !ppProfiles.length && !panels.length && !hardware.length && !others.length)
    out.push('（未识别到任何条目，请检查粘贴的内容格式）')

  // ── Summary ────────────────────────────────────────────────────────────────
  const { profileCount, profileTotalMm, acrylicCount, acrylicAreaMm2, polycarbCount, polycarbAreaMm2 } = summary
  const hasProfileSummary = profileTotalMm > 0
  const hasPanelSummary   = acrylicAreaMm2 > 0 || polycarbAreaMm2 > 0
  if (hasProfileSummary || hasPanelSummary) {
    out.push('─'.repeat(48))
    out.push('【汇总统计】')
    out.push('')
    if (hasProfileSummary) {
      out.push(`  铝型材 30×30mm：共 ${profileCount} 根，总长 ${fmtLen(profileTotalMm)}`)
    }
    if (acrylicAreaMm2 > 0) {
      out.push(`  面板·亚克力：  共 ${acrylicCount} 块，总面积 ${fmtArea(acrylicAreaMm2)}`)
    }
    if (polycarbAreaMm2 > 0) {
      out.push(`  面板·聚碳酸酯：共 ${polycarbCount} 块，总面积 ${fmtArea(polycarbAreaMm2)}`)
    }
    if (acrylicAreaMm2 > 0 && polycarbAreaMm2 > 0) {
      out.push(`  面板合计：      共 ${acrylicCount + polycarbCount} 块，总面积 ${fmtArea(acrylicAreaMm2 + polycarbAreaMm2)}`)
    }
    out.push('')
  }

  // ── Machining warnings ─────────────────────────────────────────────────────
  function warnBlock(list, typeName) {
    const byCode = {}
    for (const p of list) {
      if (!byCode[p.code]) byCode[p.code] = []
      byCode[p.code].push(p)
    }
    const wlines = []
    for (const [code, group] of Object.entries(byCode)) {
      if (!group.some(p => p.warned)) continue
      const len = (code.match(/\/(\d+)$/) || [])[1] ?? '?'
      wlines.push(`  ${typeName} ${len}mm：`)
      for (const p of group) {
        const ref = p.drawRef ? `  （图纸${p.drawRef}）` : ''
        const mac = p.subs.length ? `有加工（${p.subs.map(s => '加工' + s.letter).join('、')}）` : '无加工'
        wlines.push(`    #${p.num}  ${mac}${ref}`)
      }
    }
    return wlines
  }
  const warnLines = [...warnBlock(profiles, '铝型材 30×30mm'), ...warnBlock(ppProfiles, 'PP 组合型材')]
  if (warnLines.length) {
    out.push('─'.repeat(48))
    out.push('⚠ 警告：以下型材规格相同但加工要求不同，订购和安装时请注意区分！')
    out.push('')
    out.push(...warnLines)
    out.push('')
  }

  return out.join('\n')
}

// ─── buildRows ────────────────────────────────────────────────────────────────
function buildRows({ profiles, ppProfiles, panels, hardware, others }) {
  const rows = []
  for (const p of profiles) {
    const machining = p.subs.length ? p.subs.map(s => `加工${s.letter}: ${s.type}，${s.detail}`).join(' | ') : ''
    rows.push({ num: p.num, category: '铝型材 30×30mm', spec: p.length + 'mm', dims: '', qty: p.qty, drawRef: p.drawRef ? '图纸' + p.drawRef : '', note: machining, warned: p.warned })
  }
  for (const p of ppProfiles) {
    const machining = p.subs.length ? p.subs.map(s => `加工${s.letter}: ${s.type}，${s.detail}`).join(' | ') : ''
    rows.push({ num: p.num, category: 'PP 组合型材', spec: p.length + 'mm', dims: '', qty: p.qty, drawRef: p.drawRef ? '图纸' + p.drawRef : '', note: machining, warned: p.warned })
  }
  for (const p of panels) {
    rows.push({ num: p.num, category: '面板·' + p.material, spec: p.spec, dims: p.dims ? `${p.dims[0]}×${p.dims[1]}` : '', qty: p.qty, drawRef: p.drawRef ? '图纸' + p.drawRef : '', note: p.note, warned: false })
  }
  for (const h of hardware) {
    rows.push({ num: h.num, category: '标准件', spec: h.name, dims: '', qty: h.qty, drawRef: '', note: '', warned: false })
  }
  for (const o of others) {
    rows.push({ num: o.num, category: '其他', spec: o.desc, dims: '', qty: o.qty, drawRef: o.drawRef ? '图纸' + o.drawRef : '', note: '', warned: false })
  }
  rows.sort((a, b) => a.num - b.num)
  return rows
}

// ─── CSV / XLSX ───────────────────────────────────────────────────────────────
const CSV_HEADERS = ['编号', '类别', '规格', '尺寸(mm)', '数量(件)', '图纸', '备注/加工']

function toDataRows(rows) {
  return rows.map(r => [r.num, r.category, r.spec, r.dims, r.qty, r.drawRef, r.note])
}

function summaryDataRows(summary) {
  const { profileCount, profileTotalMm, acrylicCount, acrylicAreaMm2, polycarbCount, polycarbAreaMm2 } = summary
  const rows = [['', '', '', '', '', '', ''], ['【汇总统计】', '', '', '', '', '', '']]
  if (profileTotalMm > 0)
    rows.push(['铝型材 30×30mm', `共${profileCount}根`, `总长${fmtLen(profileTotalMm)}`, '', '', '', ''])
  if (acrylicAreaMm2 > 0)
    rows.push(['面板·亚克力', `共${acrylicCount}块`, `总面积${fmtArea(acrylicAreaMm2)}`, '', '', '', ''])
  if (polycarbAreaMm2 > 0)
    rows.push(['面板·聚碳酸酯', `共${polycarbCount}块`, `总面积${fmtArea(polycarbAreaMm2)}`, '', '', '', ''])
  if (acrylicAreaMm2 > 0 && polycarbAreaMm2 > 0)
    rows.push(['面板合计', `共${acrylicCount + polycarbCount}块`, `总面积${fmtArea(acrylicAreaMm2 + polycarbAreaMm2)}`, '', '', '', ''])
  return rows
}

function rowsToCsv(rows, summary) {
  const esc  = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const data = [CSV_HEADERS, ...toDataRows(rows), ...summaryDataRows(summary)]
  return data.map(r => r.map(esc).join(',')).join('\n')
}

function downloadXlsx(rows, summary) {
  const wb = XLSX.utils.book_new()
  const sheetData = [CSV_HEADERS, ...toDataRows(rows), ...summaryDataRows(summary)]
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, ws, 'BOM整理')
  XLSX.writeFile(wb, 'bom整理.xlsx')
}

// ─── download helper ─────────────────────────────────────────────────────────
function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── parse ────────────────────────────────────────────────────────────────────
function parse(raw) {
  if (!raw.trim()) return { text: '', rows: [], summary: null }
  const parsed = parseItems(raw)
  return { text: formatText(parsed), rows: buildRows(parsed), summary: parsed.summary }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BomParser() {
  const [open, setOpen]     = useState(false)
  const [input, setInput]   = useState('')
  const [result, setResult] = useState({ text: '', rows: [], summary: null })

  const handleParse = () => setResult(parse(input))
  const handleClear = () => { setInput(''); setResult({ text: '', rows: [], summary: null }) }

  const { text, rows, summary } = result

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 px-3 py-1.5 rounded text-xs font-semibold
          bg-amber-500 hover:bg-amber-400 text-white transition-colors shadow"
      >
        BOM 整理
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-xl shadow-2xl flex flex-col"
            style={{ width: '90vw', maxWidth: 1100, height: '88vh' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3
              border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">MayCAD BOM 整理</span>
                <span className="text-xs text-slate-400">粘贴原始 BOM → 翻译整理 → 文本 + 表格同时展示</span>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1">✕</button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 divide-x divide-slate-200">

              {/* Left: input */}
              <div className="flex flex-col min-w-0 p-4 gap-2" style={{ flex: '0 0 300px' }}>
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    原始 BOM
                  </span>
                  <button onClick={handleClear}
                    className="text-[11px] text-slate-400 hover:text-slate-600">清空</button>
                </div>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="将 MayCAD PDF 中的 BOM 内容粘贴到此处..."
                  className="flex-1 min-h-0 text-xs font-mono border border-slate-200 rounded-lg p-3
                    resize-none outline-none focus:border-blue-400 text-slate-700 bg-slate-50"
                  spellCheck={false}
                />
                <button
                  onClick={handleParse}
                  disabled={!input.trim()}
                  className="shrink-0 py-2 rounded-lg text-sm font-semibold
                    bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                    text-white transition-colors"
                >
                  解析整理
                </button>
              </div>

              {/* Right: text (top) + table (bottom) */}
              <div className="flex flex-col flex-1 min-w-0 min-h-0 divide-y divide-slate-200">

                {/* Text output */}
                <div className="flex flex-col min-h-0 p-4 gap-2" style={{ flex: '4 4 0' }}>
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      文本结果
                    </span>
                    {text && (
                      <button
                        onClick={() => download(text, 'bom整理.txt', 'text/plain;charset=utf-8')}
                        className="text-[11px] px-2 py-1 rounded bg-green-600 hover:bg-green-500
                          text-white transition-colors font-semibold"
                      >
                        下载 TXT
                      </button>
                    )}
                  </div>
                  <textarea
                    value={text} readOnly
                    placeholder="文本整理结果将显示在此处..."
                    className="flex-1 min-h-0 text-xs font-mono border border-slate-200 rounded-lg p-3
                      resize-none outline-none text-slate-700 bg-slate-50"
                    spellCheck={false}
                  />
                </div>

                {/* Table output */}
                <div className="flex flex-col min-h-0 p-4 gap-2" style={{ flex: '6 6 0' }}>
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      表格结果
                      {rows.some(r => r.warned) && (
                        <span className="ml-2 text-amber-600 normal-case font-normal">⚠ 含加工差异项</span>
                      )}
                    </span>
                    {rows.length > 0 && summary && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => download(rowsToCsv(rows, summary), 'bom整理.csv', 'text/csv;charset=utf-8')}
                          className="text-[11px] px-2 py-1 rounded bg-slate-500 hover:bg-slate-400
                            text-white transition-colors font-semibold"
                        >
                          下载 CSV
                        </button>
                        <button
                          onClick={() => downloadXlsx(rows, summary)}
                          className="text-[11px] px-2 py-1 rounded bg-blue-600 hover:bg-blue-500
                            text-white transition-colors font-semibold"
                        >
                          下载 XLSX
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Table scroll area */}
                  <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-lg">
                    {rows.length > 0 ? (
                      <table className="text-xs w-full border-collapse">
                        <thead>
                          <tr className="sticky top-0 bg-slate-100 z-10">
                            {CSV_HEADERS.map(h => (
                              <th key={h}
                                className="text-left px-3 py-2 font-semibold text-slate-600
                                  border-b border-slate-200 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={r.num}
                              className={r.warned ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                                {r.warned ? '⚠ ' : ''}#{r.num}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{r.category}</td>
                              <td className="px-3 py-1.5 font-mono text-slate-700 whitespace-nowrap">{r.spec}</td>
                              <td className="px-3 py-1.5 font-mono text-slate-700 whitespace-nowrap">{r.dims}</td>
                              <td className="px-3 py-1.5 text-slate-700 text-center whitespace-nowrap">{r.qty}</td>
                              <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{r.drawRef}</td>
                              <td className="px-3 py-1.5 text-slate-600 max-w-xs">{r.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">
                        解析后将在此显示表格
                      </div>
                    )}
                  </div>

                  {/* Summary strip */}
                  {summary && (summary.profileTotalMm > 0 || summary.acrylicAreaMm2 > 0 || summary.polycarbAreaMm2 > 0) && (
                    <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1
                      px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-slate-700">
                      {summary.profileTotalMm > 0 && (
                        <span>
                          铝型材共&nbsp;<strong className="text-blue-700">{summary.profileCount}</strong>&nbsp;根&nbsp;·&nbsp;
                          总长&nbsp;<strong className="text-blue-700">{fmtLen(summary.profileTotalMm)}</strong>
                        </span>
                      )}
                      {summary.acrylicAreaMm2 > 0 && (
                        <span>
                          亚克力共&nbsp;<strong className="text-blue-700">{summary.acrylicCount}</strong>&nbsp;块&nbsp;·&nbsp;
                          总面积&nbsp;<strong className="text-blue-700">{fmtArea(summary.acrylicAreaMm2)}</strong>
                        </span>
                      )}
                      {summary.polycarbAreaMm2 > 0 && (
                        <span>
                          聚碳酸酯共&nbsp;<strong className="text-blue-700">{summary.polycarbCount}</strong>&nbsp;块&nbsp;·&nbsp;
                          总面积&nbsp;<strong className="text-blue-700">{fmtArea(summary.polycarbAreaMm2)}</strong>
                        </span>
                      )}
                      {summary.acrylicAreaMm2 > 0 && summary.polycarbAreaMm2 > 0 && (
                        <span className="text-slate-500">
                          面板合计&nbsp;<strong className="text-slate-700">{fmtArea(summary.acrylicAreaMm2 + summary.polycarbAreaMm2)}</strong>
                        </span>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
