// src/hooks/useToast.js
import { create } from 'zustand'

let id = 0

export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'success') => {
    const toast = { id: ++id, message, type }
    set(s => ({ toasts: [...s.toasts, toast] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== toast.id) }))
    }, 3500)
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export function useToast() {
  const add = useToastStore(s => s.add)
  return {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
    warn:    (msg) => add(msg, 'warn'),
  }
}
