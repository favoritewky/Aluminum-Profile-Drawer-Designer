import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { generateBOM, BOM_TYPE_META, BOM_TYPE_ORDER } from '../utils/bom.js'

const BOM_RULES = [
  { label: '合并规则', desc: '名称 + 规格 + 范围三者完全相同的条目自动累加数量；跨范围（柜体 vs 各抽屉）的同名条目保持独立。' },
  { label: '连接件影响截料', desc: '三通角码：前/后横梁与侧向横梁均缩短 2×型材宽（两端各让位）。L角码 / 槽用角码 / T螺母：前/后横梁取全净内宽，侧向横梁缩短 2×型材宽（夹在前后梁之间）。' },
  { label: '螺钉计算', desc: '每个角码需 3 颗螺钉；每个抽屉底部 4 角 = 12 颗。' },
  { label: '侧装滑轨安装横梁', desc: '每个铝制抽屉在柜体侧面各加一根横梁，条目按抽屉编号独立命名（不合并），备注记录中心距柜顶距离供现场定位。' },
  { label: '底板 / 后板 / 侧板', desc: '均向内缩进型材宽（嵌入型材内侧槽），尺寸 = 净内宽/深 − 2×型材宽。' },
  { label: '面板扩展', desc: 'none = 不扩展；half = 延伸半个型材宽；full = 延伸整个型材宽。四向独立设置。' },
  { label: '木质抽屉箱体', desc: '侧板取全净内深；前/后板宽 = 净内宽 − 2×侧板厚；底板同理缩进侧板厚，与铝框结构不同。' },
]

export default function BomTable({ state }) {
  const bom = useMemo(() => generateBOM(state), [state])
  const [selectedScopes, setSelectedScopes] = useState(new Set())
  const [showRules, setShowRules] = useState(false)

  // Build scope chip list: cabinet | drawer-0 … drawer-N  (no 'all' — empty set = all)
  const scopeTabs = useMemo(() => {
    const tabs = [{ key: 'cabinet', label: '柜体' }]
    for (let i = 0; i < state.drawerCount; i++) {
      tabs.push({ key: `drawer-${i}`, label: `抽屉 ${i + 1}` })
    }
    return tabs
  }, [state.drawerCount])

  function toggleScope(key) {
    if (key === 'all') { setSelectedScopes(new Set()); return }
    setSelectedScopes(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filtered = useMemo(
    () => selectedScopes.size === 0 ? bom : bom.filter(x => selectedScopes.has(x.scope)),
    [bom, selectedScopes]
  )

  const exportSuffix = useMemo(() => {
    if (selectedScopes.size === 0) return '全部'
    return [...selectedScopes]
      .map(k => k === 'cabinet' ? '柜体' : `抽屉${parseInt(k.split('-')[1]) + 1}`)
      .join('+')
  }, [selectedScopes])

  const grouped = useMemo(() =>
    BOM_TYPE_ORDER.reduce((acc, type) => {
      const items = filtered.filter(x => x.type === type)
      if (items.length) acc[type] = items
      return acc
    }, {}),
    [filtered]
  )

  function exportXlsx() {
    const headers = ['类型', '名称', '规格', '数量', '单位', '备注']
    const rows = filtered.map(item => [
      (BOM_TYPE_META[item.type]?.label ?? item.type),
      item.name, item.spec, item.qty, item.unit, item.note,
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 20 }, { wch: 8 }, { wch: 6 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BOM')
    XLSX.writeFile(wb, `铝型材抽屉BOM_${exportSuffix}.xlsx`)
  }

  function exportText() {
    const { cabinetW, cabinetD, cabinetH, profileW, profileH, drawerCount } = state
    let txt = '铝型材抽屉设计 - 物料清单 (BOM)\n' + '='.repeat(64) + '\n'
    txt += `柜体: W${cabinetW} × D${cabinetD} × H${cabinetH} mm\n`
    txt += `型材: ${profileW}×${profileH}mm    抽屉数: ${drawerCount}\n`
    if (selectedScopes.size > 0) txt += `范围: ${exportSuffix}\n`
    txt += '='.repeat(64) + '\n\n'
    const typeNames = { profile: '型材', panel: '板材', rail: '滑轨', connector: '连接件', screw: '螺钉' }
    BOM_TYPE_ORDER.forEach(type => {
      const items = filtered.filter(x => x.type === type)
      if (!items.length) return
      txt += `【${typeNames[type]}】\n`
      items.forEach(item => {
        txt += `  ${item.name.padEnd(22)} ${item.spec.padEnd(36)} ${String(item.qty).padStart(4)} ${item.unit}   ${item.note}\n`
      })
      txt += '\n'
    })
    download(txt, `铝型材抽屉BOM_${exportSuffix}.txt`, 'text/plain;charset=utf-8')
  }

  function download(content, name, mime) {
    const blob = new Blob([content], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="bg-white border-t border-slate-200 flex flex-col shrink-0" style={{ maxHeight: '300px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">物料清单 (BOM)</h2>
          <button
            onClick={() => setShowRules(v => !v)}
            title="整理规则说明"
            className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
              showRules
                ? 'bg-amber-100 border-amber-300 text-amber-700 font-medium'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
            }`}
          >
            整理规则
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={exportXlsx}
            className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors">
            导出 XLSX
          </button>
          <button onClick={exportText}
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors">
            导出文本
          </button>
        </div>
      </div>

      {/* Rules panel */}
      {showRules && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 shrink-0 overflow-y-auto" style={{ maxHeight: '180px' }}>
          <p className="text-[11px] font-semibold text-amber-700 mb-2">BOM 整理特殊规则</p>
          <ul className="space-y-1.5">
            {BOM_RULES.map(r => (
              <li key={r.label} className="flex gap-2 text-[11px] leading-relaxed">
                <span className="shrink-0 font-semibold text-amber-700 whitespace-nowrap">· {r.label}：</span>
                <span className="text-amber-900">{r.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scope filter — multi-select chips */}
      <div className="flex items-center gap-1 px-4 pt-2 pb-1 border-b border-slate-100 shrink-0 overflow-x-auto">
        {/* 全部 = clear selection */}
        <button
          onClick={() => toggleScope('all')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap transition-colors ${
            selectedScopes.size === 0
              ? 'bg-blue-600 text-white font-medium'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部
        </button>
        <span className="text-slate-200 select-none">|</span>
        {scopeTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => toggleScope(tab.key)}
            className={`px-2.5 py-1 text-xs rounded whitespace-nowrap transition-colors ${
              selectedScopes.has(tab.key)
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-[1]">
            <tr>
              {['类型', '名称', '规格', '数量', '单位', '备注'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BOM_TYPE_ORDER.map(type => {
              const items = grouped[type]
              if (!items) return null
              return items.map((item, idx) => (
                <tr key={`${type}-${idx}`} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${BOM_TYPE_META[item.type]?.color}`}>
                      {BOM_TYPE_META[item.type]?.label}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{item.name}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">{item.spec}</td>
                  <td className="px-3 py-1.5 font-bold text-slate-800">{item.qty}</td>
                  <td className="px-3 py-1.5 text-slate-500">{item.unit}</td>
                  <td className="px-3 py-1.5 text-slate-400">{item.note}</td>
                </tr>
              ))
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
