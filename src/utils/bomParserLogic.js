import * as XLSX from 'xlsx'

// ─── BOM 整理特殊规则 ──────────────────────────────────────────────────────────
export const PARSER_RULES = [
  { label: '铝型材识别',          desc: '编码前两段 1.11（如 1.11.030030/600）；长度取编码末尾斜杠后的数字（/600 → 600mm）。' },
  { label: 'PP 组合型材',         desc: '编码前两段 1.41（如 1.41.F14/…）；长度取法同铝型材。' },
  { label: '亚克力 = 柜门',       desc: '编码前两段 2.86；尺寸原样提取；描述含"Special Order"时标注特殊订货需单独报价。' },
  { label: '聚碳酸酯 = 内嵌插板', desc: '编码前两段 2.87；设计图中为插板，实际做内嵌安装；尺寸宽高各减 10mm（内嵌余量）。' },
  { label: 'PVC 发泡板 = 侧板',   desc: '编码前两段 2.83；侧板需与前柜门（亚克力）齐平，宽边 +18mm 补偿厚度差；非库存件，按需采购。' },
  { label: '加工差异警告',         desc: '相同编码的型材若加工要求（类型、孔径、距离）不一致，所有相关行标 ⚠，提示区分订购和安装。' },
  { label: 'PDF 页眉过滤',         desc: '以"页码："开头的行（PDF 分页页眉）及其后的延续行自动忽略，不参与解析。' },
  { label: '多行条目合并',         desc: '同一条目内容跨行时，后续行自动追加到主行末尾，直至下一个编号行或子项行为止。' },
]

// ─── 共用：编码前缀匹配 ───────────────────────────────────────────────────────
// 取 x.xx（前两个点分段），用于宽松匹配
const pfx = c => { const m = c.match(/^(\d+\.\d+)/); return m ? m[1] : '' }

// ─── 共用：汇总计算 ───────────────────────────────────────────────────────────
function buildSummary(profiles, panels) {
  const pArea  = mat => panels.filter(p => p.material === mat).reduce((s, p) => s + (p.dims ? p.dims[0] * p.dims[1] * p.qty : 0), 0)
  const pCount = mat => panels.filter(p => p.material === mat).reduce((s, p) => s + p.qty, 0)
  return {
    profileCount:    profiles.reduce((s, p) => s + p.qty, 0),
    profileTotalMm:  profiles.reduce((s, p) => s + p.length * p.qty, 0),
    acrylicCount:    pCount('亚克力'),
    acrylicAreaMm2:  pArea('亚克力'),
    polycarbCount:   pCount('聚碳酸酯'),
    polycarbAreaMm2: pArea('聚碳酸酯'),
    pvcCount:        pCount('PVC发泡板'),
    pvcAreaMm2:      pArea('PVC发泡板'),
  }
}

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

// ─── parseTextBOM ─────────────────────────────────────────────────────────────
// 解析从 MayCAD PDF 复制的纯文本 BOM
function parseTextBOM(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  const mainLines = {}, subItems = {}, order = []
  let pending = null
  let inPageBreak = false

  for (const line of lines) {
    if (/框架重量/.test(line) || /^\d+\.\d+\s*kg/i.test(line)) continue
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

  for (const { num, code, desc, qty, drawRef, subs } of items) {
    const p = pfx(code)

    if (p === '1.11') {
      const len = (code.match(/\/(\d+)$/) || [])[1]
      profiles.push({ num, code, length: len ? +len : 0, qty, drawRef, subs, warned: false })

    } else if (p === '1.41') {
      const len = (code.match(/\/(\d+)$/) || [])[1]
      ppProfiles.push({ num, code, length: len ? +len : 0, qty, drawRef, subs, warned: false })

    } else if (p === '2.86') {
      const dm   = desc.match(/大小：([\d.]+)MM\s*x\s*([\d.]+)MM/i)
      const dims = dm ? [Math.round(+dm[1]), Math.round(+dm[2])] : null
      const note = '柜门' + (/Special Order/i.test(desc) ? '；特殊订货，需单独报价' : '')
      panels.push({ num, material: '亚克力', spec: '6mm', dims, qty, drawRef, note })

    } else if (p === '2.87') {
      const dm   = desc.match(/大小：([\d.]+)MM\s*x\s*([\d.]+)MM/i)
      const dims = dm ? [Math.round(+dm[1]) - 10, Math.round(+dm[2]) - 10] : null
      panels.push({ num, material: '聚碳酸酯', spec: '4mm', dims, qty, drawRef, note: '设计为插板，实际做内嵌；每边已减10mm' })

    } else if (p === '2.83') {
      const dm   = desc.match(/大小：([\d.]+)MM\s*x\s*([\d.]+)MM/i)
      const dims = dm ? [Math.round(+dm[1]) + 18, Math.round(+dm[2])] : null
      panels.push({ num, material: 'PVC发泡板', spec: '6mm', dims, qty, drawRef, note: '侧板；宽边+18mm与前柜门对齐；非库存件按需采购' })

    } else if (code.startsWith('0.63.D07991.04')) {
      hardware.push({ num, name: '沉头螺钉 M4×8', qty })
    } else if (code.startsWith('0.63.D07991.06')) {
      hardware.push({ num, name: '沉头螺钉 M6×12', qty })
    } else if (p === '1.21') {
      hardware.push({ num, name: '标准连接件', qty })
    } else if (code.startsWith('1.31.FM4')) {
      hardware.push({ num, name: '螺母板 M4', qty })
    } else if (code.startsWith('1.31.FM6')) {
      hardware.push({ num, name: '螺母板 M6', qty })
    } else {
      others.push({ num, code, desc, qty, drawRef })
    }
  }

  // 加工差异警告
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

  return { profiles, ppProfiles, panels, hardware, others, summary: buildSummary(profiles, panels) }
}

// ─── parseJsonBOM ─────────────────────────────────────────────────────────────
// 解析 MayCAD JSON 文件 ({ version, entities })
// 型材长度 — 4×4 矩阵（行主序 flat[16]）三列向量模长的最大值
// 面板尺寸 — PLN_CONTOUR.vertices 的包围盒（已是设计最终尺寸，无需再调整）
// 打孔加工 — MACH_TYPE_CROSS_BORE：用户自绘沉头孔；从 matrix[12,13,14] 读取位置和面
// 攻丝检测 — 沉头孔出口侧若有另一根型材端面对接，该型材标记为需攻丝；偏差 >2mm 触发警告

// 行主序 4×4 矩阵变换：lx/lz 为截面 mm 坐标，ly_norm = by_mm / profile_len（型材 Y 轴已归一化）
function _xformPt(mat, lx, ly_norm, lz) {
  return [
    lx * mat[0] + ly_norm * mat[4] + lz * mat[8]  + mat[12],
    lx * mat[1] + ly_norm * mat[5] + lz * mat[9]  + mat[13],
    lx * mat[2] + ly_norm * mat[6] + lz * mat[10] + mat[14],
  ]
}
const _dist3 = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)

// 从 entity.data.machining 提取用户自绘沉头孔（MACH_TYPE_CROSS_BORE）
// 返回 subs，每项含 {letter, type, detail, fingerprint, bx, by, bz, face}
function parseJsonMachining(machList) {
  if (!machList?.length) return []
  const subs = []
  let letterCode = 65 // 'A'
  for (const m of machList) {
    if (m.mach_type !== 'MACH_TYPE_CROSS_BORE') continue
    const bx = Math.round(m.matrix?.[12] ?? 0)
    const by = Math.round(m.matrix?.[13] ?? 0)  // 距左端 mm
    const bz = Math.round(m.matrix?.[14] ?? 0)
    // 绝对值较大的截面分量决定所在面
    const face = Math.abs(bx) >= Math.abs(bz)
      ? (bx >= 0 ? 'X+面' : 'X-面')
      : (bz >= 0 ? 'Z+面' : 'Z-面')
    const distStr     = `距左端${by}mm`
    const fingerprint = `沉头孔|${face}|${distStr}`
    subs.push({ letter: String.fromCharCode(letterCode++), type: '沉头孔',
      bx, by, bz, face, detail: `沉头孔 ${face}，${distStr}`, fingerprint })
  }
  return subs
}

export function parseJsonBOM(data) {
  if (!data?.entities || !Array.isArray(data.entities))
    throw new Error('不是有效的 MayCAD JSON 文件（缺少 entities 数组）')

  const colLen = (mat, offset) =>
    Math.sqrt(mat[offset] ** 2 + mat[offset + 1] ** 2 + mat[offset + 2] ** 2)

  const bboxDims = verts => {
    const xs = [], ys = []
    for (let i = 0; i < verts.length; i += 3) { xs.push(verts[i]); ys.push(verts[i + 1]) }
    return [Math.round(Math.max(...xs) - Math.min(...xs)), Math.round(Math.max(...ys) - Math.min(...ys))]
  }

  const profMap    = new Map()
  const ppMap      = new Map()
  const panelBuf   = []
  const hwMap      = new Map()
  const rawProfiles = []   // 保留原始实体数据，用于攻丝连接检测

  for (const e of data.entities) {
    if (e.excludeFromBOM) continue
    const code = e.template || ''
    const p    = pfx(code)
    const mat  = e.matrix || []

    if (p === '1.11' || p === '1.41') {
      const len  = Math.round(Math.max(colLen(mat, 0), colLen(mat, 4), colLen(mat, 8)))
      const subs = parseJsonMachining(e.data?.machining)
      // 同 code + 长度 + 加工签名 → 合并数量；签名不同则独立列出（用于差异警告）
      const sig  = subs.map(s => s.fingerprint).sort().join(';')
      const key  = `${code}|${len}|${sig}`
      const map  = p === '1.11' ? profMap : ppMap
      if (map.has(key)) map.get(key).qty++
      else map.set(key, { code, length: len, qty: 1, drawRef: null, subs, warned: false })
      // 记录原始数据供几何分析
      rawProfiles.push({ code, len, key, mat: mat.slice(),
        startW: _xformPt(mat, 0, 0, 0), endW: _xformPt(mat, 0, 1, 0), subs })

    } else if (p === '2.86' || p === '2.87' || p === '2.83') {
      const verts = e.data?.PLN_CONTOUR?.vertices || []
      let dims    = verts.length >= 6 ? bboxDims(verts) : null
      // 插板（2.87）：长和宽各减 10mm（内嵌余量）
      if (p === '2.87' && dims) dims = [dims[0] - 10, dims[1] - 10]
      // 侧板（2.83）：宽边 +18mm 与前柜门对齐
      if (p === '2.83' && dims) dims = [dims[0] + 18, dims[1]]
      const [material, spec, note] =
        p === '2.86' ? ['亚克力',    '6mm', '柜门']
        : p === '2.87' ? ['聚碳酸酯',  '4mm', '设计为插板，实际做内嵌；每边已减10mm']
        :                ['PVC发泡板', '6mm', '侧板；宽边+18mm与前柜门对齐；非库存件按需采购']
      panelBuf.push({ material, spec, dims, note, drawRef: null })

    } else {
      const hwName =
        code.startsWith('0.63.D07991.04') ? '沉头螺钉 M4×8'  :
        code.startsWith('0.63.D07991.06') ? '沉头螺钉 M6×12' :
        p === '1.21'                       ? '标准连接件'      :
        code.startsWith('1.31.FM4')        ? '螺母板 M4'       :
        code.startsWith('1.31.FM6')        ? '螺母板 M6'       : null
      if (hwName) hwMap.set(hwName, (hwMap.get(hwName) || 0) + 1)
    }
  }

  // ── 攻丝连接检测 ──────────────────────────────────────────────────────────────
  // 对每个沉头孔，计算出口侧世界坐标，查找最近的型材端面。
  // 偏差 ≤ 2mm：精确对接，标记目标型材需攻丝；> 2mm 且 ≤ 30mm：同样标记但附偏差警告。
  const TAPPING_EXACT   = 2    // mm，视为精确对接
  const TAPPING_SEARCH  = 30   // mm，超过此距离认为没有对接型材
  const connectionWarnings = []

  for (const prof of rawProfiles) {
    for (const sub of prof.subs) {
      const { bx, by, bz } = sub
      // 出口侧局部坐标（对面面）= 对称取反
      const exitW = _xformPt(prof.mat, -bx, by / prof.len, -bz)

      let bestDist = Infinity, bestProf = null, bestEnd = null
      for (const other of rawProfiles) {
        if (other === prof) continue
        const ds = _dist3(exitW, other.startW)
        const de = _dist3(exitW, other.endW)
        if (ds < bestDist) { bestDist = ds; bestProf = other; bestEnd = '左端' }
        if (de < bestDist) { bestDist = de; bestProf = other; bestEnd = '右端' }
      }

      if (bestDist <= TAPPING_SEARCH && bestProf) {
        // 标记目标型材需攻丝
        const map = profMap.has(bestProf.key) ? profMap : ppMap
        if (map.has(bestProf.key)) map.get(bestProf.key).tapping = true

        if (bestDist > TAPPING_EXACT) {
          const warn = `${bestProf.code} ${bestProf.len}mm ${bestEnd} 与沉头孔出口偏差 ${bestDist.toFixed(1)}mm`
          if (map.has(bestProf.key)) {
            const e = map.get(bestProf.key)
            if (!e.tappingWarnings) e.tappingWarnings = []
            e.tappingWarnings.push(warn)
          }
          connectionWarnings.push(warn)
        }
      }
    }
  }

  // 面板按 材料+尺寸 聚合
  const panelMap = new Map()
  for (const p of panelBuf) {
    const key = `${p.material}|${p.dims?.[0]}x${p.dims?.[1]}`
    if (panelMap.has(key)) panelMap.get(key).qty++
    else panelMap.set(key, { ...p, qty: 1 })
  }

  let n = 1
  const numbered = arr => arr.map(x => ({ ...x, num: n++ }))
  const profiles   = numbered([...profMap.values()])
  const ppProfiles = numbered([...ppMap.values()])
  const panels     = numbered([...panelMap.values()])
  const hardware   = [...hwMap.entries()].map(([name, qty]) => ({ num: n++, name, qty }))

  return { profiles, ppProfiles, panels, hardware, others: [], summary: buildSummary(profiles, panels), connectionWarnings }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
export const fmtN    = n   => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
export const fmtLen  = mm  => `${fmtN(mm)} mm（${(mm / 1000).toFixed(2)} m）`
export const fmtArea = mm2 => `${fmtN(mm2)} mm²（${(mm2 / 1e6).toFixed(4)} m²）`

// ─── formatText ───────────────────────────────────────────────────────────────
export function formatText({ profiles, ppProfiles, panels, hardware, others, summary, connectionWarnings }) {
  const out = []
  const now = new Date()
  const ts  = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('/')
    + ' ' + [String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0')].join(':')

  out.push('MayCAD BOM 整理报告')
  out.push(`生成时间：${ts}`)
  out.push('═'.repeat(48))
  out.push('')

  let sec = 1
  function pushProfile(p) {
    const ref  = p.drawRef        ? `  （图纸${p.drawRef}）` : ''
    const warn = p.warned         ? '  ⚠' : ''
    const tap  = p.tapping        ? '  [需攻丝]' : ''
    out.push(`  #${p.num}  ${p.length}mm × ${p.qty}件${ref}${tap}${warn}`)
    for (const s of p.subs) out.push(`       加工 ${s.letter}：${s.detail}`)
    for (const w of (p.tappingWarnings || [])) out.push(`       ⚠ 对位偏差：${w}`)
  }

  if (profiles.length)   { out.push(`【${sec++}、铝型材 30×30mm】`);      profiles.forEach(pushProfile);   out.push('') }
  if (ppProfiles.length) { out.push(`【${sec++}、PP 组合型材（盖板槽）】`); ppProfiles.forEach(pushProfile); out.push('') }
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

  // 汇总
  const { profileCount, profileTotalMm,
          acrylicCount, acrylicAreaMm2,
          polycarbCount, polycarbAreaMm2,
          pvcCount, pvcAreaMm2 } = summary
  const totalPanelCount = acrylicCount + polycarbCount + pvcCount
  const totalPanelArea  = acrylicAreaMm2 + polycarbAreaMm2 + pvcAreaMm2
  const panelTypeCount  = [acrylicAreaMm2, polycarbAreaMm2, pvcAreaMm2].filter(v => v > 0).length
  if (profileTotalMm > 0 || totalPanelArea > 0) {
    out.push('─'.repeat(48))
    out.push('【汇总统计】')
    out.push('')
    if (profileTotalMm > 0)   out.push(`  铝型材 30×30mm：共 ${profileCount} 根，总长 ${fmtLen(profileTotalMm)}`)
    if (acrylicAreaMm2 > 0)   out.push(`  面板·亚克力：  共 ${acrylicCount} 块，总面积 ${fmtArea(acrylicAreaMm2)}`)
    if (polycarbAreaMm2 > 0)  out.push(`  面板·聚碳酸酯：共 ${polycarbCount} 块，总面积 ${fmtArea(polycarbAreaMm2)}`)
    if (pvcAreaMm2 > 0)       out.push(`  面板·PVC发泡板：共 ${pvcCount} 块，总面积 ${fmtArea(pvcAreaMm2)}`)
    if (panelTypeCount > 1)   out.push(`  面板合计：      共 ${totalPanelCount} 块，总面积 ${fmtArea(totalPanelArea)}`)
    out.push('')
  }

  // 加工差异警告
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

  if (connectionWarnings?.length) {
    out.push('─'.repeat(48))
    out.push('⚠ 对位偏差警告：以下攻丝对接端面与沉头孔出口不重合，请检查模型！')
    out.push('')
    for (const w of connectionWarnings) out.push(`  ${w}`)
    out.push('')
  }

  return out.join('\n')
}

// ─── buildRows ────────────────────────────────────────────────────────────────
export function buildRows({ profiles, ppProfiles, panels, hardware, others }) {
  const rows = []
  const profNote = p => {
    const parts = []
    if (p.subs.length) parts.push(p.subs.map(s => `加工${s.letter}: ${s.detail}`).join(' | '))
    if (p.tapping)     parts.push('需攻丝')
    if (p.tappingWarnings?.length) parts.push(p.tappingWarnings.map(w => `⚠${w}`).join(' | '))
    return parts.join('；')
  }
  for (const p of profiles) {
    rows.push({ num: p.num, category: '铝型材 30×30mm', spec: p.length + 'mm', dims: '', qty: p.qty, drawRef: p.drawRef ? '图纸' + p.drawRef : '', note: profNote(p), warned: p.warned })
  }
  for (const p of ppProfiles) {
    rows.push({ num: p.num, category: 'PP 组合型材', spec: p.length + 'mm', dims: '', qty: p.qty, drawRef: p.drawRef ? '图纸' + p.drawRef : '', note: profNote(p), warned: p.warned })
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
export const CSV_HEADERS = ['编号', '类别', '规格', '尺寸(mm)', '数量(件)', '图纸', '备注/加工']

function toDataRows(rows) {
  return rows.map(r => [r.num, r.category, r.spec, r.dims, r.qty, r.drawRef, r.note])
}

function summaryDataRows(summary) {
  const { profileCount, profileTotalMm, acrylicCount, acrylicAreaMm2, polycarbCount, polycarbAreaMm2, pvcCount, pvcAreaMm2 } = summary
  const rows = [['', '', '', '', '', '', ''], ['【汇总统计】', '', '', '', '', '', '']]
  if (profileTotalMm > 0)
    rows.push(['铝型材 30×30mm', `共${profileCount}根`, `总长${fmtLen(profileTotalMm)}`, '', '', '', ''])
  if (acrylicAreaMm2 > 0)
    rows.push(['面板·亚克力', `共${acrylicCount}块`, `总面积${fmtArea(acrylicAreaMm2)}`, '', '', '', ''])
  if (polycarbAreaMm2 > 0)
    rows.push(['面板·聚碳酸酯', `共${polycarbCount}块`, `总面积${fmtArea(polycarbAreaMm2)}`, '', '', '', ''])
  if (pvcAreaMm2 > 0)
    rows.push(['面板·PVC发泡板', `共${pvcCount}块`, `总面积${fmtArea(pvcAreaMm2)}`, '', '', '', ''])
  if (acrylicAreaMm2 > 0 && polycarbAreaMm2 > 0)
    rows.push(['面板合计', `共${acrylicCount + polycarbCount + pvcCount}块`, `总面积${fmtArea(acrylicAreaMm2 + polycarbAreaMm2 + pvcAreaMm2)}`, '', '', '', ''])
  return rows
}

export function rowsToCsv(rows, summary) {
  const esc  = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const data = [CSV_HEADERS, ...toDataRows(rows), ...summaryDataRows(summary)]
  return data.map(r => r.map(esc).join(',')).join('\n')
}

export function downloadXlsx(rows, summary) {
  const wb        = XLSX.utils.book_new()
  const sheetData = [CSV_HEADERS, ...toDataRows(rows), ...summaryDataRows(summary)]
  const ws        = XLSX.utils.aoa_to_sheet(sheetData)
  ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, ws, 'BOM整理')
  XLSX.writeFile(wb, 'bom整理.xlsx')
}

// ─── download helper ─────────────────────────────────────────────────────────
export function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── parse (入口) ─────────────────────────────────────────────────────────────
export function parseText(raw) {
  if (!raw.trim()) return { text: '', rows: [], summary: null }
  const parsed = parseTextBOM(raw)
  return { text: formatText(parsed), rows: buildRows(parsed), summary: parsed.summary }
}

export function parseJson(data) {
  const parsed = parseJsonBOM(data)
  return { text: formatText(parsed), rows: buildRows(parsed), summary: parsed.summary }
}
