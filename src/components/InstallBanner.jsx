import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'harmony_pwa_banner_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      setIos(true);
      setShow(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#1a1a2e',
      borderTop: '1px solid rgba(134,59,255,0.4)',
      padding: '14px 16px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.35)',
    }}>
      <img src="/apple-touch-icon.png" alt="Harmony"
        style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>
          Harmony Admin
        </p>
        {ios ? (
          <p style={{ color: '#c4b5fd', fontSize: 12, margin: '2px 0 0', lineHeight: 1.4 }}>
            Home screen pe add karo — tap{' '}
            <span style={{ fontWeight: 700 }}>Share</span>{' '}
            <span style={{ fontSize: 14 }}>⬆</span>{' '}
            phir{' '}
            <span style={{ fontWeight: 700 }}>"Add to Home Screen"</span>
          </p>
        ) : (
          <p style={{ color: '#c4b5fd', fontSize: 12, margin: '2px 0 0' }}>
            App install karo — offline bhi kaam karega
          </p>
        )}
      </div>

      {!ios && (
        <button onClick={handleInstall} style={{
          background: '#863bff', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 14px', fontSize: 13,
          fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          Install
        </button>
      )}

      <button onClick={dismiss} style={{
        background: 'transparent', border: 'none', color: '#888',
        fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
        flexShrink: 0,
      }}>
        ×
      </button>
    </div>
  );
}
