// src/pages/ItemRecipes.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import AddRecipePage from '../components/inventory/AddRecipePage'
import RecipeListPage from '../components/inventory/RecipeListPage'
import BulkRecipeEditor from '../components/inventory/BulkRecipeEditor'

const MOCK_PRODUCTS = [
  { id:1,  name:'Chat Spiral',               category:'French Fries'    },
  { id:2,  name:'Veg Noodles',               category:'Noodles'         },
  { id:3,  name:'Chef Special Full Loaded',  category:'Mr Chef Special' },
  { id:4,  name:'Corn Tomato',               category:'Double Topping'  },
  { id:5,  name:'Onion Corn',                category:'Double Topping'  },
  { id:6,  name:'Onion & Paneer',            category:'Basic Pizza'     },
  { id:7,  name:'Spl. Kur Kure Burger',      category:'Burger'          },
  { id:8,  name:'Special Mha Raja Burger',   category:'Burger'          },
  { id:9,  name:'Spl. Tandoori Paneer Burger',category:'Burger'         },
  { id:10, name:'Veg Momos',                 category:'Momos'           },
  { id:11, name:'Cheese Burst Pizza',        category:'Basic Pizza'     },
  { id:12, name:'Cold Coffee',               category:'Shakes'          },
]

const MOCK_RAW = [
  { id:1,  name:'Potato',  units:['Piece','kg','gm'] },
  { id:2,  name:'Maida',   units:['kg','gm','bag']   },
  { id:3,  name:'Tomatoes',units:['kg','gm','Piece'] },
  { id:4,  name:'Paneer',  units:['kg','gm']         },
  { id:5,  name:'Cheese',  units:['kg','gm','Piece'] },
  { id:6,  name:'Oil',     units:['ltr','ml']        },
  { id:7,  name:'Salt',    units:['gm','kg']         },
  { id:8,  name:'Onion',   units:['kg','gm','Piece'] },
  { id:9,  name:'Butter',  units:['kg','gm']         },
  { id:10, name:'Corn',    units:['kg','gm']         },
]

// Resolve category name — if subcategory has parentId, return parent name for tab grouping
function resolveCategoryName(product, catById) {
  const cat = product.category
  if (!cat) return product.categoryName || ''
  if (typeof cat === 'string') return cat

  // cat is a Category object
  if (cat.parentId && catById[cat.parentId]) {
    return catById[cat.parentId].name   // group under parent
  }
  return cat.name || ''
}

// Raw subcategory name (for display in table)
function getRawCategoryName(product) {
  const cat = product.category
  if (!cat) return product.categoryName || ''
  if (typeof cat === 'string') return cat
  return cat.name || ''
}

export default function ItemRecipes() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const importRef = useRef()

  const [view,           setView]         = useState('list')
  const [editItem,       setEditItem]     = useState(null)
  const [editRecipeId,   setEditRecipeId] = useState(null)
  const [editIngredients,setEditIngredients] = useState(null)
  const [importing,      setImporting]    = useState(false)

  const [products,     setProducts]     = useState(MOCK_PRODUCTS)
  const [rawMaterials, setRawMaterials] = useState(MOCK_RAW)
  const [recipes,      setRecipes]      = useState([])
  const [catById,      setCatById]      = useState({})   // id → Category object

  const loadData = useCallback(async () => {
    try {
      const [prods, raws, recs, cats] = await Promise.all([
        api.get(`/products?restaurantId=${rid}&size=500`).catch(() => null),
        api.get(`/inv/raw-materials?restaurantId=${rid}&activeOnly=false&size=500`).catch(() => null),
        api.get(`/inv/recipes?restaurantId=${rid}&size=500`).catch(() => null),
        api.get(`/categories?restaurantId=${rid}`).catch(() => null),
      ])

      // Categories — build id → category map for subcategory resolution
      if (cats) {
        const list = Array.isArray(cats) ? cats : (cats?.content ?? [])
        const map = {}
        list.forEach(c => { map[c.id] = c })
        setCatById(map)
      }

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
    } catch (_) { toast.error('Data load failed') }
  }, [rid])

  useEffect(() => { loadData() }, [loadData])

  // Merge products + recipes → list for RecipeListPage
  // Expands products with variants into multiple rows: base + one per variant
  const mergedRecipes = []
  products.forEach(p => {
    const catName    = resolveCategoryName(p, catById)
    const subCatName = getRawCategoryName(p)
    const variants   = (p.productVariants || []).map(pv => pv.variant).filter(Boolean)

    // Base recipe row (variantId = null → applies to all variants)
    const baseRec = recipes.find(r => r.productId === p.id && !r.variantId)
    mergedRecipes.push({
      id:          `${p.id}-base`,
      productId:   p.id,
      productName: p.name,
      variantId:   null,
      variantName: null,
      category:    catName,
      subCategory: subCatName,
      hasRecipe:   !!baseRec,
      recipeId:    baseRec?.id || null,
    })

    // One row per variant (only if product has variants)
    variants.forEach(v => {
      const varRec = recipes.find(r => r.productId === p.id && r.variantId === v.id)
      mergedRecipes.push({
        id:          `${p.id}-${v.id}`,
        productId:   p.id,
        productName: p.name,
        variantId:   v.id,
        variantName: v.name,
        category:    catName,
        subCategory: subCatName,
        hasRecipe:   !!varRec,
        recipeId:    varRec?.id || null,
      })
    })
  })

  // ── Template download ──────────────────────────────────────────────
  function downloadTemplate() {
    const maxRm = 10
    const rmHeaders = Array.from({ length: maxRm }, (_, i) =>
      `<th>RawMaterial${i+1}</th><th>Qty${i+1}</th><th>Unit${i+1}</th><th>Area${i+1}</th>`
    ).join('')

    // Example row to guide users
    const exampleCols = ['Potato', '100', 'gm', 'Kitchen',
                         'Cheese', '50', 'gm', '',
                         ...Array.from({ length: (maxRm - 2) * 4 }, () => '')]
      .map(v => `<td>${v}</td>`).join('')
    const exampleRow = `<tr style="background:#fffbe6">
      <td>0x1</td><td>Example Item Name</td><td>Item</td><td></td><td></td><td>Active</td>${exampleCols}
    </tr>`

    // All products (not just first 5)
    const productRows = products.map(p => {
      const emptyCols = Array.from({ length: maxRm * 4 }, () => '<td></td>').join('')
      const catName = typeof p.category === 'object' ? p.category?.name : (p.category || '')
      return `<tr><td>0x${p.id}</td><td>${p.name}</td><td>Item</td><td>${catName}</td><td></td><td>Active</td>${emptyCols}</tr>`
    }).join('')

    const html = `<html><head><meta charset="UTF-8"></head><body><table border="1">
<tr><th>ItemID</th><th>ItemName</th><th>ItemType</th><th>AddonArea</th><th>SapCode</th><th>ItemStatus</th>${rmHeaders}</tr>
${exampleRow}
${productRows}
</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'Recipe_Import_Template.xls'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import handler ──────────────────────────────────────────────────
  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('restaurantId', rid)
      const token = localStorage.getItem('harmoney_token')
      const res   = await fetch('/api/v1/import/recipes', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      })
      const data = await res.json()
      if (!res.ok) { toast.error('Import failed: ' + (data.error || 'Server error')); return }
      const { created = 0, updated = 0, skipped = 0, notFound = [] } = data
      let msg = `Import done — ${created} created, ${updated} updated`
      if (skipped > 0) msg += `, ${skipped} skipped`
      toast.success(msg)
      if (notFound.length > 0) {
        console.warn('Items not matched in menu:', notFound)
        toast.error(`${notFound.length} items not found in menu (see console)`)
      }
      loadData()
    } catch (err) {
      toast.error('Import failed: ' + (err.message || 'Network error'))
    } finally { setImporting(false) }
  }

  function handleAdd()        { setEditItem(null); setEditRecipeId(null); setEditIngredients(null); setView('add') }
  function handleEdit(recipe) {
    setEditItem({
      id: recipe.productId, name: recipe.productName,
      variantId: recipe.variantId || null, variantName: recipe.variantName || null,
    })
    setEditRecipeId(recipe.recipeId || null)
    // Pass existing ingredients so AddRecipePage can pre-populate rows
    const fullRecipe = recipes.find(r => r.id === recipe.recipeId)
    setEditIngredients(fullRecipe?.ingredients || null)
    setView('edit')
  }
  function handleBack()       { setView('list'); setEditItem(null); setEditRecipeId(null); setEditIngredients(null) }
  function handleSave()       { loadData(); setView('list'); setEditItem(null); setEditRecipeId(null); setEditIngredients(null) }
  function handleBulkEdit()   { setView('bulk') }
  function handleBulkBack()   { setView('list') }
  function handleBulkSaved()  { loadData() }

  if (view === 'add' || view === 'edit') {
    return (
      <AddRecipePage
        products={products}
        rawMaterials={rawMaterials}
        editProduct={editItem}
        editRecipeId={editRecipeId}
        editIngredients={editIngredients}
        rid={rid}
        onSave={handleSave}
        onCancel={handleBack}
      />
    )
  }

  if (view === 'bulk') {
    return (
      <BulkRecipeEditor
        rawMaterials={rawMaterials}
        recipes={recipes}
        rid={rid}
        onBack={handleBulkBack}
        onSaved={handleBulkSaved}
      />
    )
  }

  return (
    <>
      <input ref={importRef} type="file" accept=".xls,.xlsx"
        style={{ display:'none' }} onChange={handleImport} />
      <RecipeListPage
        products={products}
        rawMaterials={rawMaterials}
        recipes={mergedRecipes}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDeleteRecipe={loadData}
        onDownloadTemplate={downloadTemplate}
        onImport={() => importRef.current?.click()}
        importing={importing}
        onBulkEdit={handleBulkEdit}
      />
    </>
  )
}
