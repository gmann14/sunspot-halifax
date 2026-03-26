'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  showToast: (text: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, text, type }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage
  onDismiss: (id: number) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 200)
    }, 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto mx-auto max-w-sm w-full px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${
        toast.type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {toast.text}
    </div>
  )
}
