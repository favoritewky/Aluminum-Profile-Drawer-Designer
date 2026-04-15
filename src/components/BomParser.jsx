import { useState } from 'react'
import {
  PARSER_RULES,
  CSV_HEADERS,
  fmtLen, fmtArea,
  formatText, buildRows,
  rowsToCsv, downloadXlsx, downloadFile,
  parseText, parseJson,
} from '../utils/bomParserLogic.js'

export default function BomParser() {
  const [open, setOpen]             = useState(false)
  const [input, setInput]           = useState('')
  const [result, setResult]         = useState({ text: '', rows: [], summary: null })
  const [showRules, setShowRules]   = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleParse = () => setResult(parseText(input))
  const handleClear = () => { setInput(''); setResult({ text: '', rows: [], summary: null }) }

  function handleFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) { alert('请选择 .json 文件'); return }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const result = parseJson(JSON.parse(e.target.result))
        setResult(result)
        setInput('')
      } catch (err) {
        alert('JSON 解析失败：' + err.message)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  function onDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

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
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-800">MayCAD BOM 整理</span>
                  <span className="text-xs text-slate-400">粘贴原始 BOM → 翻译整理 → 文本 + 表格同时展示</span>
                  <button
                    onClick={() => setShowRules(v => !v)}
                    className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                      showRules
                        ? 'bg-amber-100 border-amber-300 text-amber-700 font-medium'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
                    }`}
                  >
                    整理规则
                  </button>
                </div>
                <button onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1">✕</button>
              </div>
              {showRules && (
                <div className="px-5 pb-3">
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {PARSER_RULES.map(r => (
                      <li key={r.label} className="flex gap-1.5 text-[11px] leading-relaxed">
                        <span className="shrink-0 font-semibold text-amber-700 whitespace-nowrap">· {r.label}：</span>
                        <span className="text-slate-600">{r.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

                {/* JSON drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }}
                  onDrop={onDrop}
                  className={`shrink-0 flex items-center justify-center gap-2 px-3 py-2.5
                    border-2 border-dashed rounded-lg transition-colors ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50 text-blue-600'
                      : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[11px]">拖拽 JSON 文件，或</span>
                  <label className="text-[11px] text-blue-500 hover:text-blue-600 cursor-pointer underline shrink-0">
                    点击上传
                    <input type="file" accept=".json" className="hidden"
                      onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
                  </label>
                </div>

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
                        onClick={() => downloadFile(text, 'bom整理.txt', 'text/plain;charset=utf-8')}
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
                          onClick={() => downloadFile(rowsToCsv(rows, summary), 'bom整理.csv', 'text/csv;charset=utf-8')}
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
                          <tr className="sticky top-0 bg-slate-100 z-[1]">
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
                  {summary && (summary.profileTotalMm > 0 || summary.acrylicAreaMm2 > 0 || summary.polycarbAreaMm2 > 0 || summary.pvcAreaMm2 > 0) && (() => {
                    const totalPanel = summary.acrylicAreaMm2 + summary.polycarbAreaMm2 + summary.pvcAreaMm2
                    const totalCount = summary.acrylicCount + summary.polycarbCount + summary.pvcCount
                    const typeCount  = [summary.acrylicAreaMm2, summary.polycarbAreaMm2, summary.pvcAreaMm2].filter(v => v > 0).length
                    return (
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
                        {summary.pvcAreaMm2 > 0 && (
                          <span>
                            PVC发泡板共&nbsp;<strong className="text-blue-700">{summary.pvcCount}</strong>&nbsp;块&nbsp;·&nbsp;
                            总面积&nbsp;<strong className="text-blue-700">{fmtArea(summary.pvcAreaMm2)}</strong>
                          </span>
                        )}
                        {typeCount > 1 && (
                          <span className="text-slate-500">
                            面板合计&nbsp;<strong className="text-slate-700">{totalCount}块 / {fmtArea(totalPanel)}</strong>
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
