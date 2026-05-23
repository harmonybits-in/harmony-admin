import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { menuApi } from '../api/client'

export default function MenuImageUpload() {
  const { token, restaurantId } = useAuthStore()

  const [items, setItems]       = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)

  // Modal state
  const [modalItem, setModalItem]   = useState(null)
  const [activeTab, setActiveTab]   = useState('image')

  // Image tab
  const [imageUrl, setImageUrl]     = useState('')
  const [savingImg, setSavingImg]   = useState(false)

  // Nutrition tab
  const [nutrition, setNutrition] = useState({
    calories: '', protein: '', carbs: '', fat: '', fiber: '', allergens: '', servingSize: '',
  })
  const [savingNut, setSavingNut] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await menuApi.getProducts(restaurantId)
      const arr = Array.isArray(data) ? data : (data?.content ?? [])
      setItems(arr)
      setFiltered(arr)
    } catch { setItems([]); setFiltered([]) }
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { loadItems() }, [loadItems])

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return }
    const q = search.toLowerCase()
    setFiltered(items.filter(i => i.name?.toLowerCase().includes(q) || i.categoryName?.toLowerCase().includes(q)))
  }, [search, items])

  function openModal(item) {
    setModalItem(item)
    setActiveTab('image')
    setImageUrl(item.imageUrl ?? '')
    setNutrition({
      calories:    item.calories    ?? '',
      protein:     item.protein     ?? '',
      carbs:       item.carbs       ?? '',
      fat:         item.fat         ?? '',
      fiber:       item.fiber       ?? '',
      allergens:   item.allergens   ?? '',
      servingSize: item.servingSize ?? '',
    })
  }

  function closeModal() { setModalItem(null) }

  async function handleSaveImage(e) {
    e.preventDefault()
    setSavingImg(true)
    try {
      await menuApi.updateProduct(modalItem.id, { imageUrl })
      setItems(prev => prev.map(i => i.id === modalItem.id ? { ...i, imageUrl } : i))
      setModalItem(m => ({ ...m, imageUrl }))
      alert('Image URL saved')
    } catch (err) { alert(err.message ?? 'Failed to save image') }
    setSavingImg(false)
  }

  async function handleSaveNutrition(e) {
    e.preventDefault()
    setSavingNut(true)
    try {
      const payload = {
        calories:    nutrition.calories    ? parseFloat(nutrition.calories)    : null,
        protein:     nutrition.protein     ? parseFloat(nutrition.protein)     : null,
        carbs:       nutrition.carbs       ? parseFloat(nutrition.carbs)       : null,
        fat:         nutrition.fat         ? parseFloat(nutrition.fat)         : null,
        fiber:       nutrition.fiber       ? parseFloat(nutrition.fiber)       : null,
        allergens:   nutrition.allergens   || null,
        servingSize: nutrition.servingSize || null,
      }
      await menuApi.updateProduct(modalItem.id, payload)
      setItems(prev => prev.map(i => i.id === modalItem.id ? { ...i, ...payload } : i))
      alert('Nutrition info saved')
    } catch (err) { alert(err.message ?? 'Failed to save nutrition info') }
    setSavingNut(false)
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Menu Image &amp; Nutrition Manager</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Manage images and nutritional information for menu items
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by item name or category…"
          style={{
            padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
            fontSize: 14, width: 320, outline: 'none',
          }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading menu items…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>No items found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
              overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              {/* Image preview */}
              <div style={{ height: 100, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 28, color: '#9ca3af' }}>📷</span>
                }
              </div>
              {/* Info */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  {item.categoryName && (
                    <span style={{
                      background: '#ede9fe', color: '#5b21b6', padding: '2px 8px',
                      borderRadius: 4, fontSize: 11, fontWeight: 600,
                    }}>{item.categoryName}</span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>₹{item.price ?? item.sellingPrice ?? 0}</span>
                </div>
                <button onClick={() => openModal(item)} style={{
                  width: '100%', background: '#3b82f6', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '7px 0', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 520, maxHeight: '90vh',
            overflow: 'auto', padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,.2)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{modalItem.name}</div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{modalItem.categoryName}</div>
              </div>
              <button onClick={closeModal} style={{
                background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280',
              }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 18 }}>
              {['image', 'nutrition'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: activeTab === tab ? 700 : 400,
                  color: activeTab === tab ? '#3b82f6' : '#6b7280',
                  borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                  fontSize: 14, textTransform: 'capitalize',
                }}>{tab === 'image' ? 'Image' : 'Nutrition'}</button>
              ))}
            </div>

            {/* Tab: Image */}
            {activeTab === 'image' && (
              <form onSubmit={handleSaveImage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={labelStyle}>
                  Image URL
                  <input
                    value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://…/image.jpg" style={inputStyle}
                  />
                </label>
                {/* Live preview */}
                <div style={{
                  height: 160, background: '#f3f4f6', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {imageUrl
                    ? <img src={imageUrl} alt="preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    : <span style={{ color: '#9ca3af', fontSize: 13 }}>Preview will appear here</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={savingImg} style={btnStyle('#3b82f6')}>
                    {savingImg ? 'Saving…' : 'Save Image'}
                  </button>
                  <button type="button" onClick={closeModal} style={btnStyle('#6b7280')}>Cancel</button>
                </div>
              </form>
            )}

            {/* Tab: Nutrition */}
            {activeTab === 'nutrition' && (
              <form onSubmit={handleSaveNutrition} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { key: 'calories', label: 'Calories (kcal)' },
                    { key: 'protein',  label: 'Protein (g)' },
                    { key: 'carbs',    label: 'Carbs (g)' },
                    { key: 'fat',      label: 'Fat (g)' },
                    { key: 'fiber',    label: 'Fiber (g)' },
                  ].map(({ key, label }) => (
                    <label key={key} style={labelStyle}>
                      {label}
                      <input
                        type="number" min="0" step="0.1"
                        value={nutrition[key]}
                        onChange={e => setNutrition(n => ({ ...n, [key]: e.target.value }))}
                        style={inputStyle}
                      />
                    </label>
                  ))}
                </div>
                <label style={labelStyle}>
                  Allergens
                  <input
                    value={nutrition.allergens}
                    onChange={e => setNutrition(n => ({ ...n, allergens: e.target.value }))}
                    placeholder="e.g. Gluten, Dairy, Nuts"
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Serving Size
                  <input
                    value={nutrition.servingSize}
                    onChange={e => setNutrition(n => ({ ...n, servingSize: e.target.value }))}
                    placeholder="e.g. 200g, 1 plate"
                    style={inputStyle}
                  />
                </label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="submit" disabled={savingNut} style={btnStyle('#10b981')}>
                    {savingNut ? 'Saving…' : 'Save Nutrition'}
                  </button>
                  <button type="button" onClick={closeModal} style={btnStyle('#6b7280')}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
})
const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}
const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none',
}
