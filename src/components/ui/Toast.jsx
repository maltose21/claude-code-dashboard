import { useState, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl text-[13px] font-medium shadow-lg border animate-[slideIn_0.2s_ease-out] ${
              toast.type === 'success' ? 'bg-white border-green-200 text-green-700' :
              toast.type === 'error' ? 'bg-white border-red-200 text-red-600' :
              'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {toast.type === 'success' && '✓ '}
            {toast.type === 'error' && '✗ '}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
