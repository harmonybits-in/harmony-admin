// src/pages/ItemRecipes.jsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import AddRecipePage from '../components/inventory/AddRecipePage'
import RecipeListPage from '../components/inventory/RecipeListPage'

// ── Mock data ─────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id:1,  name:'Chat Spiral',               category:'French Fries'    },
  { id:2,  name:'Veg Noodles',               category:'Noodles'         },
  { id:3,  name:'Chef Special Full Loaded',  category:'Mr Chef Special' },
  { id:4,  name:'Corn Tomato',               category:'Double Topping'  },
  { id:5,  name:'Onion Corn',                category:'Double Topping'  },
  { id:6,  name:'Onion & Paneer',            category:'Basic Pizza'     },
  { id:7,  name:'Spl. Kur Kure Burger',      category:'Burger'         },
  { id:8,  name:'Special Mha Raja Burger',   category:'Burger'         },
  { id:9,  name:'Spl. Tandoori Paneer Burger',category:'Burger'        },
  { id:10, name:'Veg Momos',                 category:'Momos'          },
  { id:11, name:'Cheese Burst Pizza',        category:'Basic Pizza'    },
  { id:12, name:'Cold Coffee',               category:'Shakes'         },
]

const MOCK_RAW = [
  { id:1, name:'Potato',       units:['Piece','kg','gm'] },
  { id:2, name:'Maida',        units:['kg','gm','bag']   },
  { id:3, name:'Tomatoes',     units:['kg','gm','Piece'] },
  { id:4, name:'Paneer',       units:['kg','gm']         },
  { id:5, name:'Cheese',       units:['kg','gm','Piece'] },
  { id:6, name:'Oil',          units:['ltr','ml']        },
  { id:7, name:'Salt',         units:['gm','kg']         },
  { id:8, name:'Onion',        units:['kg','gm','Piece'] },
  { id:9, name:'Butter',       units:['kg','gm']         },
  { id:10,name:'Corn',         units:['kg','gm']         },
]

export default function ItemRecipes() {
  const rid  = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [view,         setView]         = useState('list')
  const [editItem,     setEditItem]     = useState(null)
  const [editRecipeId, setEditRecipeId] = useState(null)

  const [products,     setProducts]     = useState(MOCK_PRODUCTS)
  const [rawMaterials, setRawMaterials] = useState(MOCK_RAW)
  const [recipes,      setRecipes]      = useState([])

  const loadData = useCallback(async () => {
    try {
      const [prods, raws, recs] = await Promise.all([
        api.get(`/products?restaurantId=${rid}&size=200`).catch(() => null),
        api.get(`/inv/raw-materials?restaurantId=${rid}`).catch(() => null),
        api.get(`/inv/recipes?restaurantId=${rid}`).catch(() => null),
      ])
      if (prods) {
        const list = Array.isArray(prods) ? prods : (prods?.content ?? [])
        if (list.length) setProducts(list)
      }
      if (raws) {
        const list = Array.isArray(raws) ? raws : (raws?.content ?? [])
        if (list.length) setRawMaterials(list.map(rm => ({
          ...rm,
          units: [rm.consumptionUnit, rm.purchaseUnit].filter(Boolean),
        })))
      }
      if (recs) {
        const list = Array.isArray(recs) ? recs : (recs?.content ?? [])
        setRecipes(list)
      }
    } catch (err) { toast.error('Data load failed') }
  }, [rid])

  useEffect(() => { loadData() }, [loadData])

  // Merge products + recipes → list for RecipeListPage
  const mergedRecipes = products.map(p => {
    const rec = recipes.find(r => r.productId === p.id)
    return {
      id:          p.id,
      productId:   p.id,
      productName: p.name,
      category:    p.category || p.categoryName || '',
      hasRecipe:   !!rec,
      recipeId:    rec?.id || null,
    }
  })

  function handleAdd()       { setEditItem(null); setEditRecipeId(null); setView('add') }
  function handleEdit(recipe){ setEditItem({ id: recipe.productId, name: recipe.productName }); setEditRecipeId(recipe.recipeId || null); setView('edit') }
  function handleBack()      { setView('list'); setEditItem(null); setEditRecipeId(null) }
  function handleSave()      { loadData(); setView('list'); setEditItem(null); setEditRecipeId(null) }

  if (view === 'add' || view === 'edit') {
    return (
      <AddRecipePage
        products={products}
        rawMaterials={rawMaterials}
        editProduct={editItem}
        editRecipeId={editRecipeId}
        rid={rid}
        onSave={handleSave}
        onCancel={handleBack}
      />
    )
  }

  return (
    <RecipeListPage
      products={products}
      rawMaterials={rawMaterials}
      recipes={mergedRecipes}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDeleteRecipe={loadData}
    />
  )
}
