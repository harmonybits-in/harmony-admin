// src/components/ToastContainer.jsx
import { useToastStore } from '../hooks/useToast'

const COLORS = {
  success: { bg: '#10b981', icon: '✅' },
  error:   { bg: '#ef4444', icon: '❌' },
  info:    { bg: '#6366f1', icon: 'ℹ️' },
  warn:    { bg: '#f59e0b', icon: '⚠️' },
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const { bg, icon } = COLORS[t.type] || COLORS.info
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: bg, color: '#fff', borderRadius: 10,
            padding: '10px 16px', fontSize: 13, fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            pointerEvents: 'all', cursor: 'pointer',
            animation: 'slideIn 0.2s ease',
            minWidth: 260, maxWidth: 380,
          }} onClick={() => remove(t.id)}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ opacity: 0.7, fontSize: 16 }}>✕</span>
          </div>
        )
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
