export default function CodeEditor({ value, onChange, rows = 15, placeholder = '' }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      spellCheck={false}
      className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-5 text-[14px] text-gray-800 font-mono leading-7 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 focus:bg-white placeholder:text-gray-400 transition-all"
    />
  )
}
