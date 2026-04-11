import { useMemo, useState } from 'react'
import { generateBOM, BOM_TYPE_META, BOM_TYPE_ORDER } from '../utils/bom.js'

export default function BomTable({ state }) {
  const bom = useMemo(() => generateBOM(state), [state])
  const [scopeFilter, setScopeFilter] = useState('all')

  // Build scope tab list: all | cabinet | drawer-0 … drawer-N
  const scopeTabs = useMemo(() => {
    const tabs = [{ key: 'all', label: '全部' }, { key: 'cabinet', label: '柜体' }]
    for (let i = 0; i < state.drawerCount; i++) {
      tabs.push({ key: `drawer-${i}`, label: `抽屉 ${i + 1}` })
    }
    return tabs
  }, [state.drawerCount])

  const filtered = useMemo(
    () => scopeFilter === 'all' ? bom : bom.filter(x => x.scope === scopeFilter),
    [bom, scopeFilter]
  )

  const grouped = useMemo(() =>
    BOM_TYPE_ORDER.reduce((acc, type) => {
      const items = filtered.filter(x => x.type === type)
      if (items.length) acc[type] = items
      return acc
    }, {}),
    [filtered]
  )

  function exportCSV() {
    const headers = ['类型', '名称', '规格', '数量', '单位', '备注']
    const rows = filtered.map(item => [
      (BOM_TYPE_META[item.type]?.label ?? item.type),
      item.name, item.spec, item.qty, item.unit, item.note,
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const suffix = scopeFilter === 'all' ? '全部' : scopeFilter === 'cabinet' ? '柜体' : `抽屉${parseInt(scopeFilter.split('-')[1]) + 1}`
    download('\ufeff' + csv, `铝型材抽屉BOM_${suffix}.csv`, 'text/csv;charset=utf-8')
  }

  function exportText() {
    const { cabinetW, cabinetD, cabinetH, profileW, profileH, drawerCount } = state
    let txt = '铝型材抽屉设计 - 物料清单 (BOM)\n' + '='.repeat(64) + '\n'
    txt += `柜体: W${cabinetW} × D${cabinetD} × H${cabinetH} mm\n`
    txt += `型材: ${profileW}×${profileH}mm    抽屉数: ${drawerCount}\n`
    if (scopeFilter !== 'all') {
      const label = scopeFilter === 'cabinet' ? '柜体' : `抽屉 ${parseInt(scopeFilter.split('-')[1]) + 1}`
      txt += `范围: ${label}\n`
    }
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
    const suffix = scopeFilter === 'all' ? '全部' : scopeFilter === 'cabinet' ? '柜体' : `抽屉${parseInt(scopeFilter.split('-')[1]) + 1}`
    download(txt, `铝型材抽屉BOM_${suffix}.txt`, 'text/plain;charset=utf-8')
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
        <h2 className="text-sm font-semibold text-slate-800">物料清单 (BOM)</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors">
            导出 CSV
          </button>
          <button onClick={exportText}
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors">
            导出文本
          </button>
        </div>
      </div>

      {/* Scope filter tabs */}
      <div className="flex gap-1 px-4 pt-2 pb-1 border-b border-slate-100 shrink-0 overflow-x-auto">
        {scopeTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setScopeFilter(tab.key)}
            className={`px-2.5 py-1 text-xs rounded whitespace-nowrap transition-colors ${
              scopeFilter === tab.key
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
          <thead className="sticky top-0 bg-slate-50 z-10">
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
