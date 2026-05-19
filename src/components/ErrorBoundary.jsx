import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || 'Unknown error'

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', padding: '2rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          Kuch problem aa gayi
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-muted)', marginBottom: 24,
          maxWidth: 480, lineHeight: 1.6,
        }}>
          {msg}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: 600,
              fontSize: 13, cursor: 'pointer',
            }}>
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text)', fontSize: 13, cursor: 'pointer',
            }}>
            Reload Page
          </button>
        </div>
        {import.meta.env.DEV && (
          <pre style={{
            marginTop: 24, padding: '12px 16px', borderRadius: 8,
            background: '#fee2e2', color: '#991b1b', fontSize: 11,
            textAlign: 'left', maxWidth: 600, overflowX: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {this.state.error.stack}
          </pre>
        )}
      </div>
    )
  }
}
