import { useState } from 'react'

const STORAGE_KEY = 'drawer_designer_auth'
const NICKNAME = import.meta.env.VITE_NICKNAME

export default function LoginGate({ children }) {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === NICKNAME
  )
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (authed) return children

  function handleSubmit(e) {
    e.preventDefault()
    if (input === NICKNAME) {
      sessionStorage.setItem(STORAGE_KEY, NICKNAME)
      setAuthed(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-slate-800 p-8 rounded-2xl shadow-2xl w-72"
      >
        <div className="flex items-center gap-2 mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <line x1="8" y1="6" x2="8" y2="18"/>
            <line x1="16" y1="6" x2="16" y2="18"/>
            <circle cx="12" cy="12" r="1.5" fill="#60a5fa"/>
          </svg>
          <span className="text-white font-semibold text-sm tracking-wide">铝型材抽屉设计器</span>
        </div>

        <label className="text-slate-400 text-xs">请输入访问码（没错，你从谁那来的？）</label>
        <input
          autoFocus
          value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          placeholder="Nickname"
          className={`bg-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none
            border ${error ? 'border-red-500' : 'border-slate-600'}
            focus:border-blue-400 transition-colors`}
        />
        {error && (
          <p className="text-red-400 text-xs -mt-2">访问码错误，请重试</p>
        )}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white text-sm
            font-medium rounded-lg py-2 transition-colors"
        >
          进入
        </button>
      </form>
    </div>
  )
}
