import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { generateBOM, BOM_TYPE_META, BOM_TYPE_ORDER } from '../utils/bom.js'

export default function BomTable({ state }) {
  const bom = useMemo(() => generateBOM(state), [state])
  const [selectedScopes, setSelectedScopes] = useState(new Set())

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
        <h2 className="text-sm font-semibold text-slate-800">物料清单 (BOM)</h2>
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
