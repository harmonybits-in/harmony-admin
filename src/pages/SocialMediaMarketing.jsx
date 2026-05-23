// src/pages/SocialMediaMarketing.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { socialApi } from '../api/client'

// ── Constants ──────────────────────────────────────────────────────
const POST_TYPES = ['OFFER', 'PROMOTION', 'UPDATE', 'ANNOUNCEMENT']

const STATUS_COLOR = {
  PUBLISHED:  { background: '#d1fae5', color: '#065f46' },
  FAILED:     { background: '#fee2e2', color: '#991b1b' },
  SCHEDULED:  { background: '#dbeafe', color: '#1e40af' },
  PUBLISHING: { background: '#fef3c7', color: '#92400e' },
  DRAFT:      { background: '#f3f4f6', color: '#4b5563' },
}

const PLATFORM_META = {
  facebook:  { label: 'Facebook',         icon: '📘', color: '#1877f2', key: 'facebookEnabled'  },
  instagram: { label: 'Instagram',        icon: '📸', color: '#e1306c', key: 'instagramEnabled' },
  google:    { label: 'Google Business',  icon: '🔍', color: '#4285f4', key: 'googleEnabled'    },
}

// ── Sub-components ─────────────────────────────────────────────────

function PlatformCard({ platform, config, onConfigure }) {
  const meta      = PLATFORM_META[platform]
  const connected = config ? !!config[meta.key] : false
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '16px 20px',
      border: '1px solid #e8eaed', flex: 1, minWidth: 160,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{meta.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{meta.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#22c55e' : '#9ca3af',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 11, color: connected ? '#16a34a' : '#6b7280', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onConfigure(platform)}
        style={{
          padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          border: `1px solid ${meta.color}`, color: meta.color, background: 'transparent',
          cursor: 'pointer',
        }}>
        Configure
      </button>
    </div>
  )
}

function PostPreview({ caption, imageUrl, restaurantName }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Mock profile header */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#e53e3e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>
          {(restaurantName || 'R').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
            {restaurantName || 'Your Restaurant'}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Just now · 🌐</div>
        </div>
      </div>

      {/* Caption */}
      <div style={{ padding: '0 14px 12px', fontSize: 13, color: '#374151', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
        {caption || <span style={{ color: '#d1d5db' }}>Aapka post preview yahan dikhega...</span>}
      </div>

      {/* Image */}
      {imageUrl && (
        <div style={{ background: '#f3f4f6', maxHeight: 220, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={imageUrl}
            alt="Post preview"
            style={{ width: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 16 }}>
        {['👍 Like', '💬 Comment', '↗️ Share'].map(a => (
          <span key={a} style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{a}</span>
        ))}
      </div>
    </div>
  )
}

function TipsCard() {
  const tips = [
    'Instagram ke liye image URL zaroori hai',
    'Facebook par bina image ke bhi post ho sakta hai',
    'Google Business par short offers best perform karte hain',
    'Long-lived Page Access Token Facebook Developer Console se milega',
  ]
  return (
    <div style={{
      background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10,
      padding: '14px 16px', marginTop: 16,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>💡 Tips</div>
      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tips.map((t, i) => (
          <li key={i} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.45 }}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

function PasswordField({ value, onChange, placeholder, style }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '8px 36px 8px 10px', borderRadius: 7, fontSize: 13,
          border: '1px solid #d1d5db', outline: 'none', ...style,
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af',
          padding: 0,
        }}>
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

function AccordionSection({ title, icon, children, openKey, currentKey, onToggle }) {
  const isOpen = openKey === currentKey
  return (
    <div style={{ border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      <button
        onClick={() => onToggle(isOpen ? null : currentKey)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 16px', border: 'none', background: isOpen ? '#fff5f5' : '#fff',
          cursor: 'pointer', textAlign: 'left',
        }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#222' }}>{title}</span>
        <span style={{
          fontSize: 14, color: '#9ca3af',
          transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s',
        }}>›</span>
      </button>
      {isOpen && (
        <div style={{ padding: '16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 42, height: 22, borderRadius: 11, position: 'relative',
          background: checked ? '#22c55e' : '#d1d5db', transition: 'background .2s',
          flexShrink: 0,
        }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      {label && <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</span>}
    </label>
  )
}

function InputRow({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
const BLANK_POST = {
  caption: '',
  imageUrl: '',
  postType: 'OFFER',
  platforms: { facebook: false, instagram: false, google: false },
  scheduleMode: 'now',
  scheduledFor: '',
}

const BLANK_CONFIG = {
  facebookEnabled: false,
  facebookPageId: '',
  facebookPageAccessToken: '',
  instagramEnabled: false,
  instagramUserId: '',
  googleEnabled: false,
  googleAccountId: '',
  googleLocationId: '',
  googleAccessToken: '',
  googleRefreshToken: '',
}

export default function SocialMediaMarketing() {
  const { token, restaurantId, user } = useAuthStore()

  // Tabs
  const [activeTab, setActiveTab] = useState('compose')

  // Config
  const [config, setConfig]     = useState(null)
  const [configForm, setConfigForm] = useState(BLANK_CONFIG)
  const [configOpen, setConfigOpen] = useState(null) // accordion key
  const [savingConfig, setSavingConfig] = useState(false)
  const [configMsg, setConfigMsg] = useState({ text: '', ok: true })

  // Posts
  const [posts, setPosts]       = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError]     = useState('')

  // Composer
  const [form, setForm]         = useState(BLANK_POST)
  const [posting, setPosting]   = useState(false)
  const [postMsg, setPostMsg]   = useState({ text: '', ok: true })

  const refreshIntervalRef = useRef(null)
  const settingsSectionRef = useRef(null)

  // ── Load config ──
  const loadConfig = useCallback(async () => {
    if (!restaurantId) return
    try {
      const data = await socialApi.getConfig(restaurantId)
      setConfig(data)
      setConfigForm({
        facebookEnabled:         !!data.facebookEnabled,
        facebookPageId:          data.facebookPageId || '',
        facebookPageAccessToken: data.facebookPageAccessToken || '',
        instagramEnabled:        !!data.instagramEnabled,
        instagramUserId:         data.instagramUserId || '',
        googleEnabled:           !!data.googleEnabled,
        googleAccountId:         data.googleAccountId || '',
        googleLocationId:        data.googleLocationId || '',
        googleAccessToken:       data.googleAccessToken || '',
        googleRefreshToken:      data.googleRefreshToken || '',
      })
    } catch {
      setConfig(null)
    }
  }, [restaurantId])

  // ── Load posts ──
  const loadPosts = useCallback(async () => {
    if (!restaurantId) return
    setPostsLoading(true)
    setPostsError('')
    try {
      const data = await socialApi.getPosts(restaurantId)
      setPosts(Array.isArray(data) ? data : (data.content || []))
    } catch (e) {
      setPostsError(e.message)
    } finally {
      setPostsLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    loadConfig()
    loadPosts()
  }, [loadConfig, loadPosts])

  // Auto-refresh history every 30s
  useEffect(() => {
    if (activeTab !== 'history') return
    refreshIntervalRef.current = setInterval(loadPosts, 30000)
    return () => clearInterval(refreshIntervalRef.current)
  }, [activeTab, loadPosts])

  // ── Config form helpers ──
  function cfSet(key, val) {
    setConfigForm(f => ({ ...f, [key]: val }))
  }

  async function saveConfig() {
    setSavingConfig(true)
    setConfigMsg({ text: '', ok: true })
    try {
      await socialApi.updateConfig(restaurantId, configForm)
      setConfigMsg({ text: 'Configuration saved!', ok: true })
      await loadConfig()
    } catch (e) {
      setConfigMsg({ text: e.message || 'Save failed', ok: false })
    } finally {
      setSavingConfig(false)
    }
  }

  // ── Compose helpers ──
  function fSet(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function togglePlatform(key) {
    setForm(f => ({
      ...f,
      platforms: { ...f.platforms, [key]: !f.platforms[key] },
    }))
  }

  async function handlePost() {
    if (!form.caption.trim()) {
      setPostMsg({ text: 'Caption likhiye pehle!', ok: false })
      return
    }
    const selectedPlatforms = Object.entries(form.platforms)
      .filter(([, v]) => v).map(([k]) => k.toUpperCase())
    if (!selectedPlatforms.length) {
      setPostMsg({ text: 'Kam se kam ek platform select karo', ok: false })
      return
    }

    setPosting(true)
    setPostMsg({ text: '', ok: true })
    try {
      const body = {
        restaurantId,
        caption: form.caption,
        imageUrl: form.imageUrl || null,
        postType: form.postType,
        platforms: selectedPlatforms,
        scheduledFor: form.scheduleMode === 'schedule' && form.scheduledFor ? form.scheduledFor : null,
      }
      const created = await socialApi.createPost(restaurantId, body)
      const postId = created.id || created.postId

      if (form.scheduleMode === 'now' && postId) {
        await socialApi.publishPost(restaurantId, postId)
        setPostMsg({ text: 'Post successfully publish ho gaya! 🎉', ok: true })
      } else {
        setPostMsg({ text: 'Post scheduled ho gaya! 📅', ok: true })
      }

      setForm(BLANK_POST)
      loadPosts()
    } catch (e) {
      setPostMsg({ text: e.message || 'Post failed', ok: false })
    } finally {
      setPosting(false)
    }
  }

  async function handlePublishAgain(postId) {
    try {
      await socialApi.publishPost(restaurantId, postId)
      loadPosts()
    } catch (e) {
      alert('Publish failed: ' + e.message)
    }
  }

  async function handleDelete(postId) {
    if (!window.confirm('Ye post delete karna chahte ho?')) return
    try {
      await socialApi.deletePost(restaurantId, postId)
      loadPosts()
    } catch (e) {
      alert('Delete failed: ' + e.message)
    }
  }

  function scrollToSettings(platform) {
    setConfigOpen(platform)
    settingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Shared input style ──
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 10px', borderRadius: 7, fontSize: 13,
    border: '1px solid #d1d5db', outline: 'none',
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>
          📣 Social Media Marketing
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
          Facebook, Instagram & Google Business se directly post karo
        </p>
      </div>

      {/* ── Platform Cards ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {['facebook', 'instagram', 'google'].map(p => (
          <PlatformCard
            key={p}
            platform={p}
            config={config}
            onConfigure={scrollToSettings}
          />
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e8eaed', marginBottom: 24 }}>
        {[
          { key: 'compose', label: '✏️  Post Karo' },
          { key: 'history', label: '📋  Post History' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: activeTab === tab.key ? '#e53e3e' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #e53e3e' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          TAB 1: Compose
      ════════════════════════════════════════════ */}
      {activeTab === 'compose' && (
        <>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* ── Left: Composer ── */}
            <div style={{ flex: '3 1 400px', minWidth: 0 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e8eaed' }}>

                {/* Caption */}
                <InputRow label="Caption *">
                  <textarea
                    value={form.caption}
                    onChange={e => fSet('caption', e.target.value)}
                    placeholder="Apna offer ya update likhiye... (emojis bhi chal jaate hain 🎉)"
                    rows={4}
                    style={{
                      ...inputStyle, resize: 'vertical', minHeight: 120, fontFamily: 'inherit',
                    }}
                  />
                </InputRow>

                {/* Image URL */}
                <InputRow
                  label="Image URL"
                  hint="Publicly accessible link — Instagram ke liye zaroori hai">
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={e => fSet('imageUrl', e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </InputRow>

                {/* Post Type */}
                <InputRow label="Post Type">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {POST_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => fSet('postType', t)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          border: `1.5px solid ${form.postType === t ? '#e53e3e' : '#d1d5db'}`,
                          background: form.postType === t ? '#fff5f5' : '#fff',
                          color: form.postType === t ? '#e53e3e' : '#6b7280',
                          cursor: 'pointer',
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </InputRow>

                {/* Platforms */}
                <InputRow label="Platforms">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'facebook',  label: 'Facebook Page',       color: '#1877f2', icon: '📘', configKey: 'facebookEnabled'  },
                      { key: 'instagram', label: 'Instagram Business',   color: '#e1306c', icon: '📸', configKey: 'instagramEnabled' },
                      { key: 'google',    label: 'Google My Business',   color: '#22c55e', icon: '🔍', configKey: 'googleEnabled'    },
                    ].map(p => {
                      const connected = config ? !!config[p.configKey] : false
                      return (
                        <label
                          key={p.key}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            cursor: connected ? 'pointer' : 'not-allowed', userSelect: 'none',
                            opacity: connected ? 1 : 0.5,
                          }}>
                          <input
                            type="checkbox"
                            checked={connected && !!form.platforms[p.key]}
                            disabled={!connected}
                            onChange={() => connected && togglePlatform(p.key)}
                            style={{ width: 15, height: 15, accentColor: p.color }}
                          />
                          <span style={{ fontSize: 14 }}>{p.icon}</span>
                          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{p.label}</span>
                          {!connected && (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>(Not connected)</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </InputRow>

                {/* Schedule */}
                <InputRow label="Kab post karein?">
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { value: 'now',      label: 'Abhi post karo' },
                      { value: 'schedule', label: 'Schedule karo' },
                    ].map(opt => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="radio"
                          checked={form.scheduleMode === opt.value}
                          onChange={() => fSet('scheduleMode', opt.value)}
                          style={{ accentColor: '#e53e3e' }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {form.scheduleMode === 'schedule' && (
                    <input
                      type="datetime-local"
                      value={form.scheduledFor}
                      onChange={e => fSet('scheduledFor', e.target.value)}
                      style={{ ...inputStyle, marginTop: 10 }}
                    />
                  )}
                </InputRow>

                {/* Message */}
                {postMsg.text && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
                    background: postMsg.ok ? '#d1fae5' : '#fee2e2',
                    color: postMsg.ok ? '#065f46' : '#991b1b',
                  }}>
                    {postMsg.text}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handlePost}
                  disabled={posting}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8, fontSize: 14,
                    fontWeight: 700, border: 'none', cursor: posting ? 'not-allowed' : 'pointer',
                    background: posting ? '#fca5a5' : '#e53e3e', color: '#fff',
                    transition: 'background .15s',
                  }}>
                  {posting ? 'Posting...' : form.scheduleMode === 'schedule' ? 'Schedule Karo 📅' : 'Post Karo 🚀'}
                </button>
              </div>
            </div>

            {/* ── Right: Preview ── */}
            <div style={{ flex: '2 1 260px', minWidth: 0 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e8eaed', marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>
                  👁️ Post Preview
                </div>
                <PostPreview
                  caption={form.caption}
                  imageUrl={form.imageUrl}
                  restaurantName={user?.restaurantName || 'Your Restaurant'}
                />
              </div>
              <TipsCard />
            </div>
          </div>

          {/* ── Platform Settings (accordion) ── */}
          <div ref={settingsSectionRef} style={{ marginTop: 32 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>
              ⚙️ Platform Settings
            </div>

            {/* Facebook */}
            <AccordionSection
              title="Facebook Settings"
              icon="📘"
              currentKey="facebook"
              openKey={configOpen}
              onToggle={setConfigOpen}>
              <InputRow label="Page ID *">
                <input
                  type="text"
                  value={configForm.facebookPageId}
                  onChange={e => cfSet('facebookPageId', e.target.value)}
                  placeholder="123456789"
                  style={inputStyle}
                />
              </InputRow>
              <InputRow label="Page Access Token *">
                <PasswordField
                  value={configForm.facebookPageAccessToken}
                  onChange={e => cfSet('facebookPageAccessToken', e.target.value)}
                  placeholder="EAAxxxxxxxx..."
                />
              </InputRow>
              <div style={{ marginBottom: 16 }}>
                <ToggleSwitch
                  checked={configForm.facebookEnabled}
                  onChange={v => cfSet('facebookEnabled', v)}
                  label="Facebook Enabled"
                />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  📖 Kaise connect karein?
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    'developers.facebook.com par jao',
                    'App banao → "Pages" product add karo',
                    'Long-lived Page Access Token generate karo',
                    'Page ID aur Token yahan paste karo',
                  ].map((step, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#64748b' }}>{step}</li>
                  ))}
                </ol>
              </div>
            </AccordionSection>

            {/* Instagram */}
            <AccordionSection
              title="Instagram Settings"
              icon="📸"
              currentKey="instagram"
              openKey={configOpen}
              onToggle={setConfigOpen}>
              <InputRow
                label="Instagram Business User ID *"
                hint="Facebook Graph API Explorer se milega">
                <input
                  type="text"
                  value={configForm.instagramUserId}
                  onChange={e => cfSet('instagramUserId', e.target.value)}
                  placeholder="17841400000000000"
                  style={inputStyle}
                />
              </InputRow>
              <div style={{
                background: '#fef3c7', borderRadius: 8, padding: '10px 14px',
                fontSize: 12, color: '#92400e', marginBottom: 14,
              }}>
                ℹ️ Instagram Facebook Page Access Token use karta hai — upar Facebook section mein set karo.
                Instagram Business account Facebook Page se linked hona chahiye.
              </div>
              <div style={{ marginBottom: 4 }}>
                <ToggleSwitch
                  checked={configForm.instagramEnabled}
                  onChange={v => cfSet('instagramEnabled', v)}
                  label="Instagram Enabled"
                />
              </div>
            </AccordionSection>

            {/* Google */}
            <AccordionSection
              title="Google My Business Settings"
              icon="🔍"
              currentKey="google"
              openKey={configOpen}
              onToggle={setConfigOpen}>
              <InputRow label="Account ID *" hint='Format: "accounts/123456789"'>
                <input
                  type="text"
                  value={configForm.googleAccountId}
                  onChange={e => cfSet('googleAccountId', e.target.value)}
                  placeholder="accounts/123456789"
                  style={inputStyle}
                />
              </InputRow>
              <InputRow label="Location ID *" hint='Format: "locations/987654321"'>
                <input
                  type="text"
                  value={configForm.googleLocationId}
                  onChange={e => cfSet('googleLocationId', e.target.value)}
                  placeholder="locations/987654321"
                  style={inputStyle}
                />
              </InputRow>
              <InputRow label="Access Token *">
                <PasswordField
                  value={configForm.googleAccessToken}
                  onChange={e => cfSet('googleAccessToken', e.target.value)}
                  placeholder="ya29.xxxxxxxx"
                />
              </InputRow>
              <InputRow label="Refresh Token *">
                <PasswordField
                  value={configForm.googleRefreshToken}
                  onChange={e => cfSet('googleRefreshToken', e.target.value)}
                  placeholder="1//xxxxxxxx"
                />
              </InputRow>
              <div style={{ marginBottom: 14 }}>
                <ToggleSwitch
                  checked={configForm.googleEnabled}
                  onChange={v => cfSet('googleEnabled', v)}
                  label="Google Business Enabled"
                />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  📖 Kaise connect karein?
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    'Google Cloud Console par jao',
                    '"My Business API" enable karo',
                    'OAuth 2.0 credentials banao',
                    'Access Token aur Refresh Token yahan paste karo',
                  ].map((step, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#64748b' }}>{step}</li>
                  ))}
                </ol>
              </div>
            </AccordionSection>

            {/* Save config button */}
            {configMsg.text && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
                background: configMsg.ok ? '#d1fae5' : '#fee2e2',
                color: configMsg.ok ? '#065f46' : '#991b1b',
              }}>
                {configMsg.text}
              </div>
            )}
            <button
              onClick={saveConfig}
              disabled={savingConfig}
              style={{
                padding: '10px 28px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: 'none', background: savingConfig ? '#fca5a5' : '#e53e3e',
                color: '#fff', cursor: savingConfig ? 'not-allowed' : 'pointer',
              }}>
              {savingConfig ? 'Saving...' : 'Save Configuration 💾'}
            </button>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB 2: Post History
      ════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Post History</div>
            <button
              onClick={loadPosts}
              style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#374151',
              }}>
              🔄 Refresh
            </button>
          </div>

          {postsLoading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Loading posts...
            </div>
          )}

          {postsError && !postsLoading && (
            <div style={{ padding: 24, color: '#991b1b', fontSize: 13 }}>{postsError}</div>
          )}

          {!postsLoading && !postsError && posts.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              Koi post nahi mila. Pahle kuch post karo!
            </div>
          )}

          {!postsLoading && posts.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Date', 'Caption', 'Platforms', 'Type', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
                        letterSpacing: 0.4, borderBottom: '1px solid #e8eaed', whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, i) => {
                    const statusStyle = STATUS_COLOR[post.status] || STATUS_COLOR.DRAFT
                    const platforms   = Array.isArray(post.platforms) ? post.platforms : []
                    const caption     = post.caption || ''
                    const truncated   = caption.length > 60 ? caption.slice(0, 60) + '…' : caption
                    const createdAt   = post.createdAt
                      ? new Date(post.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '-'

                    return (
                      <tr
                        key={post.id || i}
                        style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '11px 14px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {createdAt}
                        </td>
                        <td style={{ padding: '11px 14px', maxWidth: 240 }}>
                          <span title={caption} style={{ color: '#374151' }}>{truncated || '-'}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {platforms.map(p => {
                              const colors = {
                                FACEBOOK:  { bg: '#dbeafe', color: '#1e40af' },
                                INSTAGRAM: { bg: '#fce7f3', color: '#9d174d' },
                                GOOGLE:    { bg: '#d1fae5', color: '#065f46' },
                              }
                              const c = colors[p] || { bg: '#f3f4f6', color: '#374151' }
                              return (
                                <span key={p} style={{
                                  padding: '2px 8px', borderRadius: 20, fontSize: 10,
                                  fontWeight: 700, background: c.bg, color: c.color,
                                }}>
                                  {p}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {post.postType || '-'}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            ...statusStyle,
                          }}>
                            {post.status || 'DRAFT'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {post.status === 'FAILED' && (
                              <button
                                onClick={() => handlePublishAgain(post.id)}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  border: '1px solid #2563eb', color: '#2563eb', background: '#fff',
                                  cursor: 'pointer', whiteSpace: 'nowrap',
                                }}>
                                🔁 Publish Again
                              </button>
                            )}
                            {['DRAFT', 'FAILED'].includes(post.status) && (
                              <button
                                onClick={() => handleDelete(post.id)}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  border: '1px solid #dc2626', color: '#dc2626', background: '#fff',
                                  cursor: 'pointer',
                                }}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
