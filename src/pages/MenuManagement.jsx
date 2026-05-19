import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import ProductsTab  from '../components/menu/ProductsTab'
import CategoriesTab from '../components/menu/CategoriesTab'
import VariantsTab  from '../components/menu/VariantsTab'
import AddonsTab    from '../components/menu/AddonsTab'
import DiscountsTab from '../components/menu/DiscountsTab'
import TablesTab    from '../components/menu/TablesTab'

const TABS = [
  { key:'products',   icon:'🍽️', label:'Menu Items'  },
  { key:'categories', icon:'📋', label:'Categories'  },
  { key:'variants',   icon:'🔀', label:'Variants'    },
  { key:'addons',     icon:'➕', label:'Addons'      },
  { key:'discounts',  icon:'🏷️', label:'Discounts'   },
  { key:'tables',     icon:'🪑', label:'Tables/Area' },
]

export default function MenuManagement() {
  const { restaurantId } = useAuthStore()
  const [tab, setTab]           = useState('products')
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])

  const loadCategories = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.allSettled([
        api.get(`/categories/restaurant/${restaurantId}`),
        api.get(`/products?restaurantId=${restaurantId}&size=200`),
      ])
      setCategories(Array.isArray(cats.value) ? cats.value : [])
      const pl = prods.value?.content || (Array.isArray(prods.value) ? prods.value : [])
      setProducts(pl)
    } catch (_) {}
  }, [restaurantId])

  useEffect(() => { loadCategories() }, [])

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:22, fontWeight:700 }}>🍽️ Menu Management</h1>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
          Items, categories, variants, addons, discounts, tables
        </p>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {TABS.map(({ key, icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
            cursor:'pointer', border:'1px solid var(--border)',
            background: tab===key ? 'var(--accent)' : 'transparent',
            color: tab===key ? '#fff' : 'var(--text-muted)',
          }}>{icon} {label}</button>
        ))}
      </div>

      {tab==='products'   && <ProductsTab  rid={restaurantId} categories={categories} />}
      {tab==='categories' && <CategoriesTab rid={restaurantId} onRefresh={loadCategories} />}
      {tab==='variants'   && <VariantsTab  rid={restaurantId} />}
      {tab==='addons'     && <AddonsTab    rid={restaurantId} />}
      {tab==='discounts'  && <DiscountsTab rid={restaurantId} categories={categories} products={products} />}
      {tab==='tables'     && <TablesTab    rid={restaurantId} />}
    </div>
  )
}
