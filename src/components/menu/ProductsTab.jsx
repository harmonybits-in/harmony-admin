import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonTable } from '../Skeleton'
import MenuCsvImport from './MenuCsvImport'

// ── Utilities ─────────────────────────────────────────────────────────────────
function groupProducts(items) {
  const groups = [], seen = new Set()
  items.forEach(p => {
    if (seen.has(p.id)) return
    const lastWord = p.name.trim().split(' ').pop()
    const siblings = items.filter(o =>
      !seen.has(o.id) && o.id !== p.id &&
      o.categoryId === p.categoryId &&
      o.name.trim().endsWith(lastWord)
    )
    if (siblings.length > 0) {
      const all = [p, ...siblings]
      all.forEach(x => seen.add(x.id))
      groups.push({ isGroup: true, baseName: lastWord, items: all })
    } else {
      seen.add(p.id)
      groups.push({ isGroup: false, items: [p] })
    }
  })
  return groups
}

function blankRow(categories, rid, catId) {
  return {
    name: '', shortCode: '', displayName: '', categoryId: catId || categories[0]?.id || '',
    price: '0', description: '', dietary: 'VEG', gstType: 'SERVICES',
    available: true, active: true,
    productVariants: [], addonGroupIds: [], restaurantId: rid,
    _variantId: '', _variantPrice: '', _addonGroupId: '',
    // New fields
    shortCode2: '', containerCharges: '0', weightValue: '', weightUnit: '',
    profitMargin: '', noDecimalQty: false,
    exposeOnlineOrders: true, exposeCaptainApp: true, exposeKiosk: false, exposeOther: false,
    orderTypeHomeDelivery: true, orderTypePickUp: true, orderTypeDineIn: true,
    manufacturingDate: '', expirationDate: '', itemScheduleEnabled: false,
    cuisineTags: '', spiceLevel: 'NOT_APPLICABLE',
    isSpicy: false, isChefSpecial: false, isMrpItem: false, isNew: false, isVegan: false,
    isExtraSpicy: false, openQtyPopup: false, isFavorite: false, ignoreTax: false,
    ignoreDiscount: false, ignoreAddon: false, ignorePackingCharge: false,
    removeFromDineinQr: false, containsAlcohol: false, isCombo: false,
    swiggyPortionSizeValue: '', swiggyPortionSizeUnit: '', swiggyMinPrepTime: '',
    swiggySpiceLevel: 'NOT_APPLICABLE', swiggySweetLevel: 'NOT_APPLICABLE',
    swiggyGravyProperty: 'NOT_APPLICABLE', swiggyAccompaniments: '',
    swiggyRecommended: false, seasonalIngredients: false,
    zomatoTags: '',
    hsnCode: '', sapCode: '', fsnCode: '', stockStatus: 'DO_NOT_TRACK',
    createSelfItemRecipe: false, nutritionInfo: '',
  }
}

function blankCombo(categories, rid, catId) {
  return {
    name: '', shortCode: '', displayName: '', description: '',
    gstType: 'SERVICES', dietary: 'VEG',
    categoryId: catId || categories[0]?.id || '',
    comboType: 'FIXED',
    price: '0',
    lineItems: [], // [{ productId, qty, standardPrice, offerPrice }]
    _pendingProductId: '',
  }
}

function productToForm(p) {
  return {
    ...p,
    price: String(p.price || '0'),
    stockQuantity: String(p.stockQuantity || ''),
    productVariants: (p.productVariants || []).map(pv => ({ variantId: pv.variant?.id ?? pv.variantId, price: pv.price ?? 0 })),
    addonGroupIds: (p.addonGroups || []).map(a => a.id),
    _variantId: '', _variantPrice: '', _addonGroupId: '',
  }
}

// ── Indian food-type indicator ─────────────────────────────────────────────────
function FoodDot({ type = 'VEG', size = 14 }) {
  const c = type === 'NON_VEG' ? '#ef4444' : type === 'EGG' ? '#f59e0b' : '#10b981'
  return (
    <div title={type === 'NON_VEG' ? 'Non-Veg' : type === 'EGG' ? 'Egg' : 'Veg'} style={{
      width: size, height: size, border: `1.5px solid ${c}`, borderRadius: 3,
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: size * 0.43, height: size * 0.43, borderRadius: '50%', background: c }} />
    </div>
  )
}

// ── Field wrapper for form ────────────────────────────────────────────────────
function FLabel({ label, children, span = 1 }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const fi = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
  width: '100%', boxSizing: 'border-box', outline: 'none',
}
const fs = { ...fi, cursor: 'pointer' }

// ─────────────────────────────────────────────────────────────────────────────
export default function ProductsTab({ rid, categories }) {
  const toast = useToast()
  const [items,        setItems]        = useState([])
  const [variants,     setVariants]     = useState([])
  const [addonGroups,  setAddonGroups]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [saving,       setSaving]       = useState(false)
  const [expanded,     setExpanded]     = useState(new Set())
  const [selCat,       setSelCat]       = useState('ALL')
  const [view,         setView]         = useState('list')
  const [editItem,     setEditItem]     = useState(null)
  const [rows,         setRows]         = useState([])
  const [viewItem,     setViewItem]     = useState(null)
  const [selected,     setSelected]     = useState(new Set())
  const [actionOpen,   setActionOpen]   = useState(false)
  const [actionSearch, setActionSearch] = useState('')
  const [actionBusy,   setActionBusy]   = useState(false)
  const [gstModal,     setGstModal]     = useState(false)
  const [toggling,     setToggling]     = useState(null)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [dietFilter,   setDietFilter]   = useState('ALL')
  const [comboView,      setComboView]      = useState(false)
  const [addDropdown,    setAddDropdown]    = useState(false)
  const [comboForm,      setComboForm]      = useState(null)
  const [comboStep,      setComboStep]      = useState(1)
  const [comboSaving,    setComboSaving]    = useState(false)
  const [editingComboId, setEditingComboId] = useState(null)
  const actionRef = useRef(null)

  // ── Category drag-and-drop ───────────────────────────────────────────────────
  const [catParentOrder, setCatParentOrder] = useState(null)  // [id, ...] sorted parents
  const [catSubOrder,    setCatSubOrder]    = useState({})     // { parentId: [id, ...] }
  const [dragItem,       setDragItem]       = useState(null)   // { type, id, parentId? }
  const [dragOverItem,   setDragOverItem]   = useState(null)   // same shape
  const [collapsedCats,  setCollapsedCats]  = useState(new Set()) // parent IDs that are collapsed

  function toggleCollapse(parentId) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(String(parentId)) ? next.delete(String(parentId)) : next.add(String(parentId))
      return next
    })
  }

  // Re-init local order whenever categories prop changes
  useEffect(() => {
    const parents = [...categories.filter(c => !c.parentId)]
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
    setCatParentOrder(parents.map(c => String(c.id)))
    const subs = {}
    parents.forEach(p => {
      subs[String(p.id)] = [...categories.filter(c => String(c.parentId) === String(p.id))]
        .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
        .map(c => String(c.id))
    })
    setCatSubOrder(subs)
    // Auto-collapse parents that have subcategories
    setCollapsedCats(new Set(
      parents.filter(p => categories.some(c => String(c.parentId) === String(p.id))).map(p => String(p.id))
    ))
  }, [categories])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, v, a, c] = await Promise.allSettled([
        api.get(`/products?restaurantId=${rid}&size=200`),
        api.get(`/variants?restaurantId=${rid}`),
        api.get(`/addon-groups?restaurantId=${rid}`),
        api.get('/combos'),
      ])
      const products = r.value?.content || (Array.isArray(r.value) ? r.value : [])
      const combos   = (Array.isArray(c.value) ? c.value : []).map(cb => ({ ...cb, _isCombo: true }))
      setItems([...products, ...combos])
      setVariants(Array.isArray(v.value) ? v.value : [])
      setAddonGroups(Array.isArray(a.value) ? a.value : [])
    } catch (_) { setItems([]) } finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  function goAdd() {
    setEditItem(null)
    setRows([blankRow(categories, rid, selCat !== 'ALL' ? selCat : null),
             blankRow(categories, rid, selCat !== 'ALL' ? selCat : null)])
    setView('addItems')
  }
  function goEdit(p) { setEditItem(p); setRows([productToForm(p)]); setView('addItems') }
  function goBack() { setView('list'); setEditItem(null); setRows([]) }

  function upd(i, f, v) { setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [f]: v } : r)) }

  function addVariantToRow(i, variantsList) {
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r
      const vid = Number(r._variantId)
      if (!vid) return r
      if ((r.productVariants || []).some(pv => pv.variantId === vid)) return r
      const variantDefault = variantsList.find(v => v.id === vid)?.price || 0
      const vp = r._variantPrice !== '' && r._variantPrice != null
        ? Number(r._variantPrice) : variantDefault
      const pvs = [...(r.productVariants || []), { variantId: vid, price: vp }]
      return { ...r, productVariants: pvs, price: '', _variantId: '', _variantPrice: '' }
    }))
  }
  function removeVariantFromRow(i, vid) {
    setRows(rs => rs.map((r, idx) => idx !== i ? r : {
      ...r, productVariants: (r.productVariants || []).filter(pv => pv.variantId !== vid)
    }))
  }
  function addAddonToRow(i) {
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r
      const aid = Number(r._addonGroupId)
      if (!aid || (r.addonGroupIds || []).includes(aid)) return r
      return { ...r, addonGroupIds: [...(r.addonGroupIds || []), aid], _addonGroupId: '' }
    }))
  }
  function removeAddonFromRow(i, aid) {
    setRows(rs => rs.map((r, idx) => idx !== i ? r : {
      ...r, addonGroupIds: (r.addonGroupIds || []).filter(x => x !== aid)
    }))
  }

  async function handleSave(exitAfter) {
    const invalid = rows.find(r => !r.name?.trim())
    if (invalid) { toast.error('Item naam required hai'); return }
    const pendingVariant = rows.find(r => r._variantId)
    if (pendingVariant) {
      toast.error(`"${pendingVariant.name || 'Item'}" mein variant select hua hai but Add nahi kiya`)
      return
    }
    setSaving(true)
    try {
      if (editItem) {
        const r = rows[0]
        await api.put(`/products/${editItem.id}`, {
          name: r.name.trim(), description: r.description, price: Number(r.price) || 0,
          shortCode: r.shortCode || '', displayName: r.displayName || '', gstType: r.gstType || 'SERVICES',
          categoryId: Number(r.categoryId), available: r.available, restaurantId: rid,
          dietary: r.dietary || 'VEG',
          productVariants: (r.productVariants || []).map(pv => ({ variantId: Number(pv.variantId), price: Number(pv.price) || 0 })),
          addonGroupIds: (r.addonGroupIds || []).map(Number),
          shortCode2: r.shortCode2 || '',
          containerCharges: Number(r.containerCharges) || 0,
          weightValue: r.weightValue ? Number(r.weightValue) : null,
          weightUnit: r.weightUnit || null,
          profitMargin: r.profitMargin ? Number(r.profitMargin) : null,
          noDecimalQty: !!r.noDecimalQty,
          exposeOnlineOrders: r.exposeOnlineOrders !== false,
          exposeCaptainApp: r.exposeCaptainApp !== false,
          exposeKiosk: !!r.exposeKiosk,
          exposeOther: !!r.exposeOther,
          orderTypeHomeDelivery: r.orderTypeHomeDelivery !== false,
          orderTypePickUp: r.orderTypePickUp !== false,
          orderTypeDineIn: r.orderTypeDineIn !== false,
          manufacturingDate: r.manufacturingDate || null,
          expirationDate: r.expirationDate || null,
          itemScheduleEnabled: !!r.itemScheduleEnabled,
          cuisineTags: r.cuisineTags || null,
          spiceLevel: r.spiceLevel || 'NOT_APPLICABLE',
          isSpicy: !!r.isSpicy, isChefSpecial: !!r.isChefSpecial, isMrpItem: !!r.isMrpItem,
          isNew: !!r.isNew, isVegan: !!r.isVegan, isExtraSpicy: !!r.isExtraSpicy,
          openQtyPopup: !!r.openQtyPopup, isFavorite: !!r.isFavorite, ignoreTax: !!r.ignoreTax,
          ignoreDiscount: !!r.ignoreDiscount, ignoreAddon: !!r.ignoreAddon,
          ignorePackingCharge: !!r.ignorePackingCharge, removeFromDineinQr: !!r.removeFromDineinQr,
          containsAlcohol: !!r.containsAlcohol, isCombo: !!r.isCombo,
          swiggyPortionSizeValue: r.swiggyPortionSizeValue ? Number(r.swiggyPortionSizeValue) : null,
          swiggyPortionSizeUnit: r.swiggyPortionSizeUnit || null,
          swiggyMinPrepTime: r.swiggyMinPrepTime || null,
          swiggySpiceLevel: r.swiggySpiceLevel || null,
          swiggySweetLevel: r.swiggySweetLevel || null,
          swiggyGravyProperty: r.swiggyGravyProperty || null,
          swiggyAccompaniments: r.swiggyAccompaniments || null,
          swiggyRecommended: !!r.swiggyRecommended,
          seasonalIngredients: !!r.seasonalIngredients,
          zomatoTags: r.zomatoTags || null,
          hsnCode: r.hsnCode || null,
          sapCode: r.sapCode || null,
          fsnCode: r.fsnCode || null,
          stockStatus: r.stockStatus || 'DO_NOT_TRACK',
          createSelfItemRecipe: !!r.createSelfItemRecipe,
          nutritionInfo: r.nutritionInfo || null,
        })
        toast.success('Updated!')
      } else {
        const valid = rows.filter(r => r.name?.trim())
        await Promise.all(valid.map(r => api.post('/products', {
          name: r.name.trim(), description: r.description, price: Number(r.price) || 0,
          shortCode: r.shortCode || '', displayName: r.displayName || '', gstType: r.gstType || 'SERVICES',
          categoryId: Number(r.categoryId), available: r.available, active: true, restaurantId: rid,
          dietary: r.dietary || 'VEG',
          productVariants: (r.productVariants || []).map(pv => ({ variantId: Number(pv.variantId), price: Number(pv.price) || 0 })),
          addonGroupIds: (r.addonGroupIds || []).map(Number),
          shortCode2: r.shortCode2 || '',
          containerCharges: Number(r.containerCharges) || 0,
          weightValue: r.weightValue ? Number(r.weightValue) : null,
          weightUnit: r.weightUnit || null,
          profitMargin: r.profitMargin ? Number(r.profitMargin) : null,
          noDecimalQty: !!r.noDecimalQty,
          exposeOnlineOrders: r.exposeOnlineOrders !== false,
          exposeCaptainApp: r.exposeCaptainApp !== false,
          exposeKiosk: !!r.exposeKiosk,
          exposeOther: !!r.exposeOther,
          orderTypeHomeDelivery: r.orderTypeHomeDelivery !== false,
          orderTypePickUp: r.orderTypePickUp !== false,
          orderTypeDineIn: r.orderTypeDineIn !== false,
          manufacturingDate: r.manufacturingDate || null,
          expirationDate: r.expirationDate || null,
          itemScheduleEnabled: !!r.itemScheduleEnabled,
          cuisineTags: r.cuisineTags || null,
          spiceLevel: r.spiceLevel || 'NOT_APPLICABLE',
          isSpicy: !!r.isSpicy, isChefSpecial: !!r.isChefSpecial, isMrpItem: !!r.isMrpItem,
          isNew: !!r.isNew, isVegan: !!r.isVegan, isExtraSpicy: !!r.isExtraSpicy,
          openQtyPopup: !!r.openQtyPopup, isFavorite: !!r.isFavorite, ignoreTax: !!r.ignoreTax,
          ignoreDiscount: !!r.ignoreDiscount, ignoreAddon: !!r.ignoreAddon,
          ignorePackingCharge: !!r.ignorePackingCharge, removeFromDineinQr: !!r.removeFromDineinQr,
          containsAlcohol: !!r.containsAlcohol, isCombo: !!r.isCombo,
          swiggyPortionSizeValue: r.swiggyPortionSizeValue ? Number(r.swiggyPortionSizeValue) : null,
          swiggyPortionSizeUnit: r.swiggyPortionSizeUnit || null,
          swiggyMinPrepTime: r.swiggyMinPrepTime || null,
          swiggySpiceLevel: r.swiggySpiceLevel || null,
          swiggySweetLevel: r.swiggySweetLevel || null,
          swiggyGravyProperty: r.swiggyGravyProperty || null,
          swiggyAccompaniments: r.swiggyAccompaniments || null,
          swiggyRecommended: !!r.swiggyRecommended,
          seasonalIngredients: !!r.seasonalIngredients,
          zomatoTags: r.zomatoTags || null,
          hsnCode: r.hsnCode || null,
          sapCode: r.sapCode || null,
          fsnCode: r.fsnCode || null,
          stockStatus: r.stockStatus || 'DO_NOT_TRACK',
          createSelfItemRecipe: !!r.createSelfItemRecipe,
          nutritionInfo: r.nutritionInfo || null,
        })))
        toast.success(`${valid.length} items saved!`)
        if (!exitAfter) {
          setRows([blankRow(categories, rid, selCat !== 'ALL' ? selCat : null),
                   blankRow(categories, rid, selCat !== 'ALL' ? selCat : null)])
          load(); return
        }
      }
      load(); goBack()
    } catch (_) { toast.error('Save failed') } finally { setSaving(false) }
  }

  function goEditCombo(combo) {
    setEditingComboId(combo.id)
    setComboForm({
      name: combo.name || '',
      shortCode: combo.shortCode || '',
      displayName: combo.displayName || '',
      description: combo.description || '',
      gstType: combo.gstType || 'SERVICES',
      dietary: combo.dietary || 'VEG',
      categoryId: combo.categoryId || '',
      comboType: combo.comboType || 'FIXED',
      price: String(combo.price || '0'),
      lineItems: (combo.lineItems || []).map(li => ({
        productId: li.productId || li.product?.id,
        qty: li.qty || 1,
        standardPrice: li.standardPrice || 0,
        offerPrice: li.offerPrice || 0,
      })),
      _pendingProductId: '',
    })
    setComboStep(1)
    setComboView(true)
  }

  async function handleSaveCombo() {
    if (!comboForm?.name?.trim()) { toast.error('Combo naam required hai'); return }
    if (comboForm.lineItems.length === 0) { toast.error('Kam se kam ek item add karo'); return }
    setComboSaving(true)
    try {
      const totalStd = comboForm.lineItems.reduce((s, li) => s + (li.standardPrice || 0) * (li.qty || 1), 0)
      const payload = {
        name: comboForm.name.trim(),
        shortCode: comboForm.shortCode || '',
        displayName: comboForm.displayName || '',
        description: comboForm.description || '',
        gstType: comboForm.gstType || 'SERVICES',
        dietary: comboForm.dietary || 'VEG',
        categoryId: comboForm.categoryId ? Number(comboForm.categoryId) : null,
        comboType: comboForm.comboType || 'FIXED',
        price: Number(comboForm.price) || 0,
        originalPrice: totalStd,
        lineItems: comboForm.lineItems.map(li => ({
          productId: Number(li.productId),
          qty: Number(li.qty) || 1,
          offerPrice: Number(li.offerPrice) || 0,
        })),
      }
      if (editingComboId) {
        await api.put(`/combos/${editingComboId}`, payload)
      } else {
        await api.post('/combos', payload)
      }
      toast.success('Combo saved!')
      setComboView(false)
      setComboStep(1)
      setComboForm(null)
      setEditingComboId(null)
      load()
    } catch (_) { toast.error('Save failed') } finally { setComboSaving(false) }
  }

  async function toggle(item) {
    setToggling(item.id)
    try {
      if (item._isCombo) {
        await api.put(`/combos/${item.id}`, { available: !item.available })
      } else {
        await api.patch(`/products/${item.id}/availability?available=${!item.available}`)
      }
      setItems(ps => ps.map(p => p.id === item.id && p._isCombo === item._isCombo ? { ...p, available: !p.available } : p))
    } catch (_) { toast.error('Failed') } finally { setToggling(null) }
  }

  async function del(item) {
    if (!confirm(`"${item.name}" delete karna chahte hain?`)) return
    try {
      if (item._isCombo) {
        await api.delete(`/combos/${item.id}`)
      } else {
        await api.delete(`/products/${item.id}`)
      }
      toast.success('Deleted'); load()
    } catch (_) { toast.error('Delete failed') }
  }

  useEffect(() => {
    if (!actionOpen) return
    function handler(e) {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        setActionOpen(false); setActionSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [actionOpen])

  useEffect(() => {
    if (!addDropdown) return
    const handler = (e) => {
      if (!e.target.closest('[data-add-dropdown]')) setAddDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addDropdown])

  async function callBulk(action, value, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return null
    const ids = [...selected]
    setActionBusy(true)
    try {
      return await api.post('/products/bulk', { action, ids, value: value ?? null })
    } catch (e) {
      toast.error(e.message || 'Bulk action failed')
      return null
    } finally { setActionBusy(false) }
  }

  async function bulkSetAvailability(val) {
    const res = await callBulk('SET_AVAILABLE', val)
    if (!res) return
    toast.success(`${res.updated} items ${val ? 'available' : 'unavailable'} mark kiye`)
    setItems(prev => prev.map(p => selected.has(p.id) ? { ...p, available: val } : p))
    setSelected(new Set())
  }

  async function bulkSetDietary(dietary) {
    const res = await callBulk('SET_DIETARY', dietary)
    if (!res) return
    toast.success(`${res.updated} items ${dietary} mark kiye`)
    setItems(prev => prev.map(p => selected.has(p.id) ? { ...p, dietary } : p))
    setSelected(new Set())
  }

  async function bulkDelete() {
    if (!confirm(`${selected.size} items permanently delete karna chahte hain? Yeh undo nahi hogi.`)) return
    setActionBusy(true)
    try {
      const comboIds   = [...selected].filter(id => items.find(i => i.id === id && i._isCombo))
      const productIds = [...selected].filter(id => items.find(i => i.id === id && !i._isCombo))

      // Delete combos individually
      for (const id of comboIds) {
        try { await api.delete(`/combos/${id}`) } catch (_) {}
      }

      // Bulk delete regular products
      if (productIds.length > 0) {
        await api.post('/products/bulk', { action: 'DELETE', ids: productIds, value: null })
      }

      toast.success(`${selected.size} items delete kiye`)
      setItems(prev => prev.filter(p => !selected.has(p.id)))
      setSelected(new Set())
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    } finally { setActionBusy(false) }
  }

  async function bulkRemoveVariations() {
    const res = await callBulk('CLEAR_VARIANTS', null,
      `${selected.size} items se saare variations remove karna chahte hain?`)
    if (!res) return
    toast.success(`${res.updated} items se variations remove kiye`)
    load(); setSelected(new Set())
  }

  async function bulkSetGstType(gstType) {
    setGstModal(false)
    const res = await callBulk('SET_GST_TYPE', gstType)
    if (!res) return
    toast.success(`${res.updated} items ${gstType} se tag kiye`)
    setItems(prev => prev.map(p => selected.has(p.id) ? { ...p, gstType } : p))
    setSelected(new Set())
  }

  const ACTION_LIST = [
    { label: 'Mark In Stock',              fn: () => bulkSetAvailability(true) },
    { label: 'Mark Out of Stock',          fn: () => bulkSetAvailability(false) },
    { sep: true },
    { label: 'Mark As Veg',               fn: () => bulkSetDietary('VEG') },
    { label: 'Mark As Non Veg',           fn: () => bulkSetDietary('NON_VEG') },
    { label: 'Mark As Egg Item',          fn: () => bulkSetDietary('EGG') },
    { sep: true },
    { label: 'Update service/goods tag',  fn: () => setGstModal(true) },
    { label: 'Remove Variation(s)',       fn: () => bulkRemoveVariations() },
    { label: 'Remove Items',             fn: () => bulkDelete(), danger: true },
    { sep: true },
    { label: 'Update Online Availability',           soon: true },
    { label: 'Active/Inactive Areas',                soon: true },
    { label: 'Update Favorite Item',                 soon: true },
    { label: 'Update Ignore Tax',                    soon: true },
    { label: 'Update Ignore Discount',               soon: true },
    { label: 'Update Ignore Packing Charge (Online)',soon: true },
    { label: 'Update in Captain',                    soon: true },
    { label: 'Update Quantity Popup',                soon: true },
    { label: 'Update in Kiosk',                      soon: true },
    { label: 'Mark Do Not Track',                    soon: true },
    { label: 'Remove Nutrition Data',                soon: true },
    { label: 'Remove Image(s)',                      soon: true },
    { label: 'Assign Addon Group(s)',                soon: true },
    { label: 'Update Item Timings',                  soon: true },
  ]

  const visibleActions = ACTION_LIST.filter(a =>
    a.sep || !actionSearch || a.label?.toLowerCase().includes(actionSearch.toLowerCase())
  )

  function handleAction(action) {
    if (action.soon) { toast.error('Yeh feature jald aayega'); setActionOpen(false); setActionSearch(''); return }
    if (selected.size === 0) { toast.error('Pehle items select karo'); setActionOpen(false); setActionSearch(''); return }
    setActionOpen(false); setActionSearch('')
    action.fn()
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const catCount = {}
  items.forEach(p => { catCount[p.categoryId] = (catCount[p.categoryId] || 0) + 1 })

  // When a parent category is selected, include items from its subcategories too
  const visibleCatIds = (() => {
    if (selCat === 'ALL') return null
    const cat = categories.find(c => String(c.id) === String(selCat))
    if (!cat || cat.parentId) return [String(selCat)]
    const childIds = categories.filter(c => String(c.parentId) === String(selCat)).map(c => String(c.id))
    return [String(selCat), ...childIds]
  })()

  const filtered = items.filter(p =>
    (!search || p.name?.toLowerCase().includes(search.toLowerCase())) &&
    (selCat === 'ALL' || visibleCatIds.includes(String(p.categoryId))) &&
    (dietFilter === 'ALL' || p.dietary === dietFilter)
  )
  const groups = groupProducts(filtered)

  const allFilteredIds = filtered.map(p => p.id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected   = allFilteredIds.some(id => selected.has(id))

  function toggleSelectAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) { allFilteredIds.forEach(id => next.delete(id)) }
      else             { allFilteredIds.forEach(id => next.add(id)) }
      return next
    })
  }
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleGroup(ids) {
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      if (allSel) { ids.forEach(id => n.delete(id)) } else { ids.forEach(id => n.add(id)) }
      return n
    })
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ADD / EDIT VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === 'addItems') return (
    <div style={{ background: 'var(--bg-page)', minHeight: '60vh', borderRadius: 12 }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px 12px 0 0', padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={goBack} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>← Back</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {editItem ? `✏️ Edit: ${editItem.name}` : '➕ Add Menu Items'}
          </div>
          {!editItem && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)',
              padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
              {rows.length} item{rows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editItem && (
            <button onClick={() => handleSave(false)} disabled={saving} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}>Save & Add More</button>
          )}
          <button onClick={() => handleSave(true)} disabled={saving} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Saving…' : 'Save & Exit'}</button>
        </div>
      </div>

      {/* Item cards */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              padding: '12px 16px', background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FoodDot type={row.dietary || 'VEG'} size={16} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                  {row.name || `Item ${i + 1}`}
                </span>
                {row.price && Number(row.price) > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>₹{row.price}</span>
                )}
              </div>
              {!editItem && rows.length > 1 && (
                <button onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
                  style={{
                    fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                  }}>Remove</button>
              )}
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Row 1: Name + Short Code + Display Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 12 }}>
                <FLabel label="Item Name *">
                  <input value={row.name} onChange={e => upd(i, 'name', e.target.value)}
                    placeholder="e.g. Paneer Butter Masala"
                    style={{
                      ...fi,
                      border: `1px solid ${row.name ? 'var(--border)' : '#ef4444'}`,
                      fontWeight: 600,
                    }} />
                </FLabel>
                <FLabel label="Short Code">
                  <input value={row.shortCode || ''} onChange={e => upd(i, 'shortCode', e.target.value)}
                    placeholder="PBM" style={fi} />
                </FLabel>
                <FLabel label="Online Display Name">
                  <input value={row.displayName || ''} onChange={e => upd(i, 'displayName', e.target.value)}
                    placeholder="Blank = same as name" style={fi} />
                </FLabel>
              </div>

              {/* Row 2: Category + Price + Dietary + GST */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
                <FLabel label="Category *">
                  {(() => {
                    const parentCats  = categories.filter(c => !c.parentId)
                    const selCatObj   = categories.find(c => String(c.id) === String(row.categoryId))
                    const selParentId = selCatObj?.parentId ? String(selCatObj.parentId) : String(row.categoryId || '')
                    const subCats     = categories.filter(c => String(c.parentId) === selParentId)
                    const subValue    = selCatObj?.parentId ? String(row.categoryId) : ''
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <select value={selParentId} style={fs}
                          onChange={e => upd(i, 'categoryId', e.target.value)}>
                          <option value="">— Select Category —</option>
                          {parentCats.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                        {subCats.length > 0 && (
                          <select value={subValue} style={{ ...fs, fontSize: 12 }}
                            onChange={e => upd(i, 'categoryId', e.target.value)}>
                            <option value="">— Select Subcategory —</option>
                            {subCats.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        )}
                      </div>
                    )
                  })()}
                </FLabel>

                <FLabel label="Base Price (₹)">
                  <input type="number" value={row.price || '0'}
                    onChange={e => upd(i, 'price', e.target.value)}
                    disabled={(row.productVariants || []).length > 0}
                    title={(row.productVariants || []).length > 0 ? 'Variant price se set hoga' : ''}
                    min="0"
                    style={{
                      ...fi,
                      border: `1px solid ${(row.productVariants || []).length > 0 ? 'var(--border)' : Number(row.price) > 0 ? '#10b981' : '#f59e0b'}`,
                      background: (row.productVariants || []).length > 0 ? 'var(--bg-secondary)' : 'var(--bg-page)',
                      color: (row.productVariants || []).length > 0 ? 'var(--text-muted)' : 'var(--text)',
                      cursor: (row.productVariants || []).length > 0 ? 'not-allowed' : 'text',
                    }} />
                  {(row.productVariants || []).length > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>★ Variant se set hoga</div>
                  )}
                </FLabel>

                <FLabel label="Dietary">
                  <select value={row.dietary || 'VEG'} onChange={e => upd(i, 'dietary', e.target.value)} style={fs}>
                    <option value="VEG">🟢 Veg</option>
                    <option value="NON_VEG">🔴 Non-Veg</option>
                    <option value="EGG">🟡 Egg</option>
                  </select>
                </FLabel>

                <FLabel label="GST Type">
                  <select value={row.gstType || 'SERVICES'} onChange={e => upd(i, 'gstType', e.target.value)} style={fs}>
                    <option value="SERVICES">🧾 Services</option>
                    <option value="GOODS">📦 Goods</option>
                  </select>
                </FLabel>
              </div>

              {/* Row 3: Description */}
              <FLabel label="Description (optional)">
                <textarea value={row.description || ''} onChange={e => upd(i, 'description', e.target.value)}
                  placeholder="Item ke baare mein kuch likhna hai?"
                  rows={2}
                  style={{ ...fi, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </FLabel>

              {/* Row 4: Availability */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div />
                <FLabel label="Availability">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    userSelect: 'none', padding: '8px 12px', borderRadius: 8, width: 'fit-content',
                    border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <input type="checkbox" checked={row.available}
                      onChange={e => upd(i, 'available', e.target.checked)}
                      style={{ accentColor: '#10b981', width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {row.available ? '✅ Available' : '❌ Unavailable'}
                    </span>
                  </label>
                </FLabel>
              </div>

              {/* Variants section */}
              <div style={{
                border: '1px solid var(--border)', borderRadius: 10,
                padding: 14, background: 'var(--bg-secondary)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  🔀 Variations (e.g. Full ₹280 / Half ₹150)
                </div>

                {/* Existing variant chips */}
                {(row.productVariants || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {(row.productVariants || []).map((pv, pi) => {
                      const v = variants.find(x => x.id === pv.variantId)
                      return (
                        <div key={pv.variantId} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '6px 12px', borderRadius: 8,
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          fontSize: 12,
                        }}>
                          {pi === 0 && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 800 }}>★</span>}
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{v?.name || `Variant ${pv.variantId}`}</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>₹{pv.price}</span>
                          <button type="button" onClick={() => removeVariantFromRow(i, pv.variantId)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-muted)', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add variant row */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={row._variantId || ''} onChange={e => {
                    const vid = e.target.value
                    const defPrice = variants.find(v => String(v.id) === vid)?.price || ''
                    upd(i, '_variantId', vid)
                    if (defPrice) upd(i, '_variantPrice', String(defPrice))
                  }} style={{ ...fs, width: 220, flex: 'none' }}>
                    <option value="">+ Select Variation</option>
                    {variants.filter(v => !(row.productVariants || []).some(pv => pv.variantId === v.id)).map(v => (
                      <option key={v.id} value={v.id}>{v.name}{v.price > 0 ? ` (₹${v.price})` : ''}</option>
                    ))}
                  </select>
                  <div style={{ position: 'relative', flex: 'none' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 13, color: 'var(--text-muted)' }}>₹</span>
                    <input type="number" value={row._variantPrice || ''}
                      onChange={e => upd(i, '_variantPrice', e.target.value)}
                      placeholder="Price" min="0"
                      style={{ ...fi, width: 110, paddingLeft: 26, flex: 'none' }} />
                  </div>
                  <button type="button" onClick={() => { upd(i, '_variantId', ''); upd(i, '_variantPrice', '') }}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</button>
                  <button type="button" onClick={() => {
                    if (!row._variantId) { toast.error('Variation select karo'); return }
                    addVariantToRow(i, variants)
                  }} style={{
                    padding: '9px 16px', borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>+ Add Variation</button>
                </div>
              </div>

              {/* Addons section */}
              <div style={{
                border: '1px solid var(--border)', borderRadius: 10,
                padding: 14, background: 'var(--bg-secondary)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  🍟 Addon Groups (extra toppings, sauces, etc.)
                </div>

                {(row.addonGroupIds || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {(row.addonGroupIds || []).map(aid => {
                      const ag = addonGroups.find(x => x.id === aid)
                      return (
                        <div key={aid} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '6px 12px', borderRadius: 8,
                          background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12,
                        }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{ag?.name || `Group ${aid}`}</span>
                          <button type="button" onClick={() => removeAddonFromRow(i, aid)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-muted)', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={row._addonGroupId || ''} onChange={e => upd(i, '_addonGroupId', e.target.value)}
                    style={{ ...fs, width: 260, flex: 'none' }}>
                    <option value="">+ Select Addon Group</option>
                    {addonGroups.filter(ag => !(row.addonGroupIds || []).includes(ag.id)).map(ag => (
                      <option key={ag.id} value={ag.id}>{ag.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => {
                    if (!row._addonGroupId) { toast.error('AddonGroup select karo'); return }
                    addAddonToRow(i)
                  }} style={{
                    padding: '9px 16px', borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>+ Add Addon</button>
                </div>
              </div>

              {/* ── Additional Details ────────────────────────────── */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  📋 Additional Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <FLabel label="Short Code 2">
                    <input value={row.shortCode2 || ''} onChange={e => upd(i, 'shortCode2', e.target.value)} placeholder="Alternate short code" style={fi} />
                  </FLabel>
                  <FLabel label="Container Charges (₹)">
                    <input type="number" value={row.containerCharges ?? '0'} onChange={e => upd(i, 'containerCharges', e.target.value)} min="0" style={fi} />
                  </FLabel>
                  <FLabel label="Profit Margin (%)">
                    <input type="number" value={row.profitMargin || ''} onChange={e => upd(i, 'profitMargin', e.target.value)} placeholder="e.g. 30" min="0" style={fi} />
                  </FLabel>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <FLabel label="Weight / Portion">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" value={row.weightValue || ''} onChange={e => upd(i, 'weightValue', e.target.value)} placeholder="Qty" min="0" style={{ ...fi, flex: 1 }} />
                      <select value={row.weightUnit || ''} onChange={e => upd(i, 'weightUnit', e.target.value)} style={{ ...fs, width: 90 }}>
                        <option value="">Unit</option>
                        {['ML', 'L', 'G', 'KG', 'PC', 'SERVING'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </FLabel>
                  <FLabel label="Spice Level">
                    <select value={row.spiceLevel || 'NOT_APPLICABLE'} onChange={e => upd(i, 'spiceLevel', e.target.value)} style={fs}>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                      <option value="MILD">Mild</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HOT">Hot</option>
                      <option value="EXTRA_HOT">Extra Hot</option>
                    </select>
                  </FLabel>
                  <FLabel label="Stock Status">
                    <select value={row.stockStatus || 'DO_NOT_TRACK'} onChange={e => upd(i, 'stockStatus', e.target.value)} style={fs}>
                      <option value="DO_NOT_TRACK">Do Not Track</option>
                      <option value="TRACK_INVENTORY">Track Inventory</option>
                    </select>
                  </FLabel>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    ['noDecimalQty', 'No Decimal Qty'],
                    ['openQtyPopup', 'Open Qty Popup'],
                    ['isFavorite', '⭐ Set as Favorite'],
                    ['isChefSpecial', '👨‍🍳 Chef Special'],
                    ['isMrpItem', 'MRP Item'],
                    ['isNew', '🆕 New Item'],
                    ['isVegan', '🌿 Vegan'],
                    ['isExtraSpicy', '🌶️ Extra Spicy'],
                    ['isSpicy', '🌶 Spicy'],
                    ['ignoreTax', 'Ignore Tax'],
                    ['ignoreDiscount', 'Ignore Discount'],
                    ['ignoreAddon', 'Ignore Addon'],
                    ['ignorePackingCharge', 'Ignore Packing Charge'],
                    ['removeFromDineinQr', 'Remove From Dine-In QR'],
                    ['containsAlcohol', '🍺 Contains Alcohol'],
                    ['isCombo', 'Set As Combo'],
                  ].map(([field, label]) => (
                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text)', background: row[field] ? '#7c3aed18' : 'var(--bg-page)', padding: '5px 10px', borderRadius: 6, border: `1px solid ${row[field] ? 'var(--accent)' : 'var(--border)'}`, userSelect: 'none' }}>
                      <input type="checkbox" checked={!!row[field]} onChange={e => upd(i, field, e.target.checked)} style={{ accentColor: 'var(--accent)', width: 13, height: 13 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Expose In + Order Types ────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>📡 Expose In</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[['exposeOnlineOrders','Online Orders'],['exposeCaptainApp','Captain App'],['exposeKiosk','Kiosk'],['exposeOther','Other']].map(([f,l]) => (
                      <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text)', background: row[f] ? '#10b98118' : 'var(--bg-page)', padding: '5px 10px', borderRadius: 6, border: `1px solid ${row[f] ? '#10b981' : 'var(--border)'}`, userSelect: 'none' }}>
                        <input type="checkbox" checked={!!row[f]} onChange={e => upd(i, f, e.target.checked)} style={{ accentColor: '#10b981', width: 13, height: 13 }} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>🚚 Order Types</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[['orderTypeHomeDelivery','🏠 Home Delivery'],['orderTypePickUp','🏪 Pick Up'],['orderTypeDineIn','🍽️ Dine In']].map(([f,l]) => (
                      <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text)', background: row[f] ? '#3b82f618' : 'var(--bg-page)', padding: '5px 10px', borderRadius: 6, border: `1px solid ${row[f] ? '#3b82f6' : 'var(--border)'}`, userSelect: 'none' }}>
                        <input type="checkbox" checked={!!row[f]} onChange={e => upd(i, f, e.target.checked)} style={{ accentColor: '#3b82f6', width: 13, height: 13 }} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Dates ─────────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <FLabel label="Manufacturing Date">
                  <input type="date" value={row.manufacturingDate || ''} onChange={e => upd(i, 'manufacturingDate', e.target.value)} style={fi} />
                </FLabel>
                <FLabel label="Expiration Date">
                  <input type="date" value={row.expirationDate || ''} onChange={e => upd(i, 'expirationDate', e.target.value)} style={fi} />
                </FLabel>
                <FLabel label="Item Schedule">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', userSelect: 'none' }}>
                    <input type="checkbox" checked={!!row.itemScheduleEnabled} onChange={e => upd(i, 'itemScheduleEnabled', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                    <span style={{ fontSize: 12 }}>Enable Schedule</span>
                  </label>
                </FLabel>
              </div>

              {/* ── Swiggy ────────────────────────────────────────── */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>🧡 Swiggy</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <FLabel label="Portion Size">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" value={row.swiggyPortionSizeValue || ''} onChange={e => upd(i, 'swiggyPortionSizeValue', e.target.value)} placeholder="Qty" min="0" style={{ ...fi, flex: 1 }} />
                      <select value={row.swiggyPortionSizeUnit || ''} onChange={e => upd(i, 'swiggyPortionSizeUnit', e.target.value)} style={{ ...fs, width: 80 }}>
                        <option value="">Unit</option>
                        {['ML', 'L', 'G', 'KG', 'PC', 'SERVING'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </FLabel>
                  <FLabel label="Min Prep Time (mins)">
                    <input type="number" value={row.swiggyMinPrepTime || ''} onChange={e => upd(i, 'swiggyMinPrepTime', e.target.value)} placeholder="e.g. 15" min="0" style={fi} />
                  </FLabel>
                  <FLabel label="Spice Level">
                    <select value={row.swiggySpiceLevel || 'NOT_APPLICABLE'} onChange={e => upd(i, 'swiggySpiceLevel', e.target.value)} style={fs}>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                      <option value="MILD">Mild</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HOT">Hot</option>
                      <option value="EXTRA_HOT">Extra Hot</option>
                    </select>
                  </FLabel>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <FLabel label="Sweet Level">
                    <select value={row.swiggySweetLevel || 'NOT_APPLICABLE'} onChange={e => upd(i, 'swiggySweetLevel', e.target.value)} style={fs}>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </FLabel>
                  <FLabel label="Gravy Property">
                    <select value={row.swiggyGravyProperty || 'NOT_APPLICABLE'} onChange={e => upd(i, 'swiggyGravyProperty', e.target.value)} style={fs}>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                      <option value="DRY">Dry</option>
                      <option value="SEMI_GRAVY">Semi Gravy</option>
                      <option value="GRAVY">Gravy</option>
                    </select>
                  </FLabel>
                  <FLabel label="Accompaniments">
                    <input value={row.swiggyAccompaniments || ''} onChange={e => upd(i, 'swiggyAccompaniments', e.target.value)} placeholder="e.g. Roti, Rice" style={fi} />
                  </FLabel>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['swiggyRecommended','⭐ Swiggy Recommended'],['seasonalIngredients','🌿 Seasonal Ingredients']].map(([f,l]) => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text)', background: row[f] ? '#f9731618' : 'var(--bg-page)', padding: '5px 10px', borderRadius: 6, border: `1px solid ${row[f] ? '#f97316' : 'var(--border)'}`, userSelect: 'none' }}>
                      <input type="checkbox" checked={!!row[f]} onChange={e => upd(i, f, e.target.checked)} style={{ accentColor: '#f97316', width: 13, height: 13 }} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Zomato Tags ───────────────────────────────────── */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>🔴 Zomato Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Beverage','Spicy','Seasonal','Chef-Special','Zomato Treat Item','Meal','Cake','South Indian','Party Order','Restaurant-Recommended','New','Holi-Special','Vegan','Home-Style-Meal','Ham','Bacon','Gluten-Free','Dairy-Free','Custom-Photo-Cake','Chef-Table-Collection','BCRS'].map(tag => {
                    const tags = (row.zomatoTags || '').split(',').map(t => t.trim()).filter(Boolean)
                    const active = tags.includes(tag)
                    return (
                      <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: 'var(--text)', background: active ? '#ef444418' : 'var(--bg-page)', padding: '4px 9px', borderRadius: 6, border: `1px solid ${active ? '#ef4444' : 'var(--border)'}`, userSelect: 'none' }}>
                        <input type="checkbox" checked={active} onChange={e => {
                          const cur = (row.zomatoTags || '').split(',').map(t => t.trim()).filter(Boolean)
                          const updated = e.target.checked ? [...cur, tag] : cur.filter(t => t !== tag)
                          upd(i, 'zomatoTags', updated.join(','))
                        }} style={{ accentColor: '#ef4444', width: 12, height: 12 }} />
                        {tag}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* ── Inventory & Nutrition ─────────────────────────── */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>📦 Inventory & Nutrition</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <FLabel label="HSN Code">
                    <input value={row.hsnCode || ''} onChange={e => upd(i, 'hsnCode', e.target.value)} placeholder="e.g. 2106" style={fi} />
                  </FLabel>
                  <FLabel label="SAP Code">
                    <input value={row.sapCode || ''} onChange={e => upd(i, 'sapCode', e.target.value)} placeholder="SAP Code" style={fi} />
                  </FLabel>
                  <FLabel label="FSN Code">
                    <input value={row.fsnCode || ''} onChange={e => upd(i, 'fsnCode', e.target.value)} placeholder="FSN Code" style={fi} />
                  </FLabel>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <FLabel label="Cuisine Tags (comma-separated)">
                    <input value={row.cuisineTags || ''} onChange={e => upd(i, 'cuisineTags', e.target.value)} placeholder="e.g. North Indian, Chinese" style={fi} />
                  </FLabel>
                  <FLabel label="Stock Status">
                    <select value={row.stockStatus || 'DO_NOT_TRACK'} onChange={e => upd(i, 'stockStatus', e.target.value)} style={fs}>
                      <option value="DO_NOT_TRACK">Do Not Track</option>
                      <option value="TRACK_INVENTORY">Track Inventory</option>
                    </select>
                  </FLabel>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12, userSelect: 'none', fontSize: 12 }}>
                  <input type="checkbox" checked={!!row.createSelfItemRecipe} onChange={e => upd(i, 'createSelfItemRecipe', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  <span>Create Self Item Recipe (applicable only when item is Purchased but has no recipe)</span>
                </label>
                <FLabel label="Nutrition Info">
                  <textarea value={row.nutritionInfo || ''} onChange={e => upd(i, 'nutritionInfo', e.target.value)} placeholder="Enter nutrition details..." rows={3} style={{ ...fi, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                </FLabel>
              </div>

            </div>
          </div>
        ))}

        {/* Add another item */}
        {!editItem && (
          <button type="button"
            onClick={() => setRows(rs => [...rs, blankRow(categories, rid, selCat !== 'ALL' ? selCat : null)])}
            style={{
              padding: '12px', borderRadius: 10, border: '2px dashed var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 13,
              cursor: 'pointer', width: '100%', fontWeight: 600,
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            ＋ Add Another Item
          </button>
        )}
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════════

  const vegCount    = items.filter(p => p.dietary === 'VEG').length
  const nonVegCount = items.filter(p => p.dietary === 'NON_VEG').length
  const availCount  = items.filter(p => p.available).length

  return (
    <>
    <div style={{
      display: 'flex', gap: 0, height: 'calc(100vh - 180px)', overflow: 'hidden',
      border: '1px solid var(--border)', borderRadius: 12,
      background: 'var(--bg-card)',
    }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflowY: 'auto',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categories</div>
        </div>

        {/* ALL */}
        <button onClick={() => setSelCat('ALL')} style={{
          width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', cursor: 'pointer',
          background: selCat === 'ALL' ? 'var(--bg-card)' : 'transparent',
          color: selCat === 'ALL' ? 'var(--accent)' : 'var(--text)',
          fontWeight: selCat === 'ALL' ? 700 : 400, fontSize: 13,
          borderLeft: selCat === 'ALL' ? '3px solid var(--accent)' : '3px solid transparent',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>All Items</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: selCat === 'ALL' ? 'var(--accent)' : 'var(--bg-card)',
            color: selCat === 'ALL' ? '#fff' : 'var(--text-muted)',
            border: selCat === 'ALL' ? 'none' : '1px solid var(--border)',
          }}>{items.length}</span>
        </button>

        {/* Hierarchical: parent categories → subcategories — draggable to reorder */}
        {(() => {
          const catById = Object.fromEntries(categories.map(c => [String(c.id), c]))

          // Ordered parents
          const parentIds = catParentOrder || categories.filter(c => !c.parentId).map(c => String(c.id))
          const parents   = parentIds.map(id => catById[id]).filter(Boolean)

          // Persist new rank order to API after a drop
          function persistParentOrder(ordered) {
            ordered.forEach((cat, idx) => {
              api.put(`/categories/${cat.id}`, { ...cat, rank: idx + 1 }).catch(() => {})
            })
          }
          function persistSubOrder(parentId, ordered) {
            ordered.forEach((cat, idx) => {
              api.put(`/categories/${cat.id}`, { ...cat, rank: idx + 1 }).catch(() => {})
            })
          }

          // ── Parent drag handlers ─────────────────────────────────
          function onParentDragStart(e, id) {
            setDragItem({ type: 'parent', id: String(id) })
            e.dataTransfer.effectAllowed = 'move'
          }
          function onParentDragOver(e, id) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (!dragItem || dragItem.type !== 'parent') return
            setDragOverItem({ type: 'parent', id: String(id) })
          }
          function onParentDrop(e, targetId) {
            e.preventDefault()
            if (!dragItem || dragItem.type !== 'parent') return
            const fromId = dragItem.id
            const toId   = String(targetId)
            if (fromId === toId) { setDragItem(null); setDragOverItem(null); return }
            const newOrder = [...parentIds]
            const fi = newOrder.indexOf(fromId)
            const ti = newOrder.indexOf(toId)
            if (fi === -1 || ti === -1) return
            newOrder.splice(fi, 1)
            newOrder.splice(ti, 0, fromId)
            setCatParentOrder(newOrder)
            persistParentOrder(newOrder.map(id => catById[id]).filter(Boolean))
            setDragItem(null); setDragOverItem(null)
          }

          // ── Sub drag handlers ────────────────────────────────────
          function onSubDragStart(e, id, parentId) {
            e.stopPropagation()
            setDragItem({ type: 'sub', id: String(id), parentId: String(parentId) })
            e.dataTransfer.effectAllowed = 'move'
          }
          function onSubDragOver(e, id, parentId) {
            e.preventDefault(); e.stopPropagation()
            if (!dragItem || dragItem.type !== 'sub' || dragItem.parentId !== String(parentId)) return
            setDragOverItem({ type: 'sub', id: String(id), parentId: String(parentId) })
          }
          function onSubDrop(e, targetId, parentId) {
            e.preventDefault(); e.stopPropagation()
            if (!dragItem || dragItem.type !== 'sub' || dragItem.parentId !== String(parentId)) return
            const fromId = dragItem.id
            const toId   = String(targetId)
            if (fromId === toId) { setDragItem(null); setDragOverItem(null); return }
            const pid    = String(parentId)
            const curOrder = catSubOrder[pid] || categories.filter(c => String(c.parentId) === pid).map(c => String(c.id))
            const newOrder = [...curOrder]
            const fi = newOrder.indexOf(fromId)
            const ti = newOrder.indexOf(toId)
            if (fi === -1 || ti === -1) return
            newOrder.splice(fi, 1)
            newOrder.splice(ti, 0, fromId)
            setCatSubOrder(prev => ({ ...prev, [pid]: newOrder }))
            persistSubOrder(parentId, newOrder.map(id => catById[id]).filter(Boolean))
            setDragItem(null); setDragOverItem(null)
          }

          return parents.map(parent => {
            const pid            = String(parent.id)
            const subIds         = catSubOrder[pid] || categories.filter(c => String(c.parentId) === pid).map(c => String(c.id))
            const subs           = subIds.map(id => catById[id]).filter(Boolean)
            const isCollapsed    = collapsedCats.has(pid)
            const parentActive   = String(selCat) === pid
            const isDraggingThis = dragItem?.type === 'parent' && dragItem?.id === pid
            const isDragOverThis = dragOverItem?.type === 'parent' && dragOverItem?.id === pid
            const allSubIds      = subs.map(s => s.id)
            const parentTotal    = (catCount[parent.id] || 0) + allSubIds.reduce((s, id) => s + (catCount[id] || 0), 0)

            return (
              <div
                key={parent.id}
                draggable
                onDragStart={e => onParentDragStart(e, parent.id)}
                onDragOver={e  => onParentDragOver(e, parent.id)}
                onDrop={e      => onParentDrop(e, parent.id)}
                onDragEnd={() => { setDragItem(null); setDragOverItem(null) }}
                style={{
                  opacity:   isDraggingThis ? 0.4 : 1,
                  borderTop: isDragOverThis ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'opacity 0.15s, border-color 0.1s',
                }}
              >
                {/* Parent row */}
                <div style={{
                  width: '100%', padding: '8px 8px 8px 10px', textAlign: 'left', border: 'none',
                  background: parentActive ? 'var(--bg-card)' : 'transparent',
                  color: parentActive ? 'var(--accent)' : 'var(--text)',
                  fontWeight: 700, fontSize: 13,
                  borderLeft: parentActive ? '3px solid var(--accent)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 2, cursor: 'default',
                }}>
                  {/* Drag handle */}
                  <span title="Drag to reorder" style={{
                    color: 'var(--text-muted)', fontSize: 11, cursor: 'grab', flexShrink: 0,
                    padding: '2px 3px', userSelect: 'none', lineHeight: 1,
                  }}>⠿</span>

                  {/* Collapse toggle — only show if has subcategories */}
                  {subs.length > 0 && (
                    <button onClick={() => toggleCollapse(pid)} style={{
                      border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 2px',
                      color: 'var(--text-muted)', fontSize: 10, flexShrink: 0, lineHeight: 1,
                      display: 'flex', alignItems: 'center',
                      transition: 'transform 0.2s',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}>▾</span>
                    </button>
                  )}

                  {/* Category name — click to select */}
                  <button onClick={() => setSelCat(parent.id)} style={{
                    flex: 1, textAlign: 'left', border: 'none', background: 'transparent',
                    color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                    minWidth: 0, padding: 0,
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      📁 {parent.name}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                      background: parentActive ? 'var(--accent)' : 'var(--bg-card)',
                      color: parentActive ? '#fff' : 'var(--text-muted)',
                      border: parentActive ? 'none' : '1px solid var(--border)',
                    }}>{parentTotal}</span>
                  </button>
                </div>

                {/* Subcategories — hidden when collapsed */}
                {!isCollapsed && subs.map(sub => {
                  const sid           = String(sub.id)
                  const subActive     = String(selCat) === sid
                  const isDragThisSub = dragItem?.type === 'sub' && dragItem?.id === sid
                  const isDragOverSub = dragOverItem?.type === 'sub' && dragOverItem?.id === sid
                  return (
                    <div
                      key={sub.id}
                      draggable
                      onDragStart={e => onSubDragStart(e, sub.id, parent.id)}
                      onDragOver={e  => onSubDragOver(e, sub.id, parent.id)}
                      onDrop={e      => onSubDrop(e, sub.id, parent.id)}
                      onDragEnd={() => { setDragItem(null); setDragOverItem(null) }}
                      style={{
                        opacity:   isDragThisSub ? 0.4 : 1,
                        borderTop: isDragOverSub ? '2px solid var(--accent)' : '2px solid transparent',
                        display: 'flex', alignItems: 'center',
                        background: subActive ? 'var(--bg-card)' : 'transparent',
                        borderLeft: subActive ? '3px solid var(--accent)' : '3px solid transparent',
                      }}
                    >
                      <span title="Drag to reorder" style={{
                        color: 'var(--text-muted)', fontSize: 10, cursor: 'grab',
                        padding: '2px 3px 2px 22px', userSelect: 'none', flexShrink: 0,
                      }}>⠿</span>
                      <button onClick={() => setSelCat(sub.id)} style={{
                        flex: 1, padding: '6px 8px 6px 2px', textAlign: 'left', border: 'none', cursor: 'pointer',
                        background: 'transparent',
                        color: subActive ? 'var(--accent)' : 'var(--text-muted)',
                        fontWeight: subActive ? 700 : 400, fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          └ {sub.name}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, flexShrink: 0,
                          background: subActive ? 'var(--accent)' : 'transparent',
                          color: subActive ? '#fff' : 'var(--text-muted)',
                          border: subActive ? 'none' : '1px solid var(--border)',
                        }}>{catCount[sub.id] || 0}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })
        })()}

        {/* Divider + Stats */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Stats</div>
          {[
            { label: 'Total', value: items.length, color: 'var(--text)' },
            { label: '🟢 Veg', value: vegCount, color: '#10b981' },
            { label: '🔴 Non-Veg', value: nonVegCount, color: '#ef4444' },
            { label: '✅ Available', value: availCount, color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)', flexShrink: 0,
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 140, maxWidth: 280 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items…"
              style={{
                width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }} />
          </div>

          {/* Diet filter chips */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { k: 'ALL', label: 'All', c: 'var(--text-muted)', bc: 'var(--border)' },
              { k: 'VEG', label: '🟢 Veg', c: '#10b981', bc: '#10b98140' },
              { k: 'NON_VEG', label: '🔴 Non-Veg', c: '#ef4444', bc: '#ef444440' },
              { k: 'EGG', label: '🟡 Egg', c: '#f59e0b', bc: '#f59e0b40' },
            ].map(f => (
              <button key={f.k} onClick={() => setDietFilter(f.k)} style={{
                padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${dietFilter === f.k ? f.bc : 'var(--border)'}`,
                background: dietFilter === f.k ? `${f.c}15` : 'transparent',
                color: dietFilter === f.k ? f.c : 'var(--text-muted)',
              }}>{f.label}</button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Action dropdown */}
          <div ref={actionRef} style={{ position: 'relative' }}>
            <button onClick={() => setActionOpen(o => !o)} disabled={actionBusy} style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: actionOpen ? 'var(--bg-secondary)' : 'transparent',
              color: 'var(--text)', fontSize: 12, fontWeight: 600,
              cursor: actionBusy ? 'not-allowed' : 'pointer', opacity: actionBusy ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {actionBusy ? '⏳' : 'Actions ▾'}
              {selected.size > 0 && (
                <span style={{
                  background: 'var(--accent)', color: '#fff', borderRadius: 10,
                  padding: '0 6px', fontSize: 10, fontWeight: 800,
                }}>{selected.size}</span>
              )}
            </button>

            {actionOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                width: 280, maxHeight: 400, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <input value={actionSearch} onChange={e => setActionSearch(e.target.value)}
                    placeholder="Search actions…" autoFocus
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'var(--bg-page)',
                      color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
                    }} />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {visibleActions.map((a, idx) =>
                    a.sep ? (
                      <div key={idx} style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
                    ) : (
                      <button key={a.label} onClick={() => handleAction(a)} style={{
                        width: '100%', padding: '9px 14px', textAlign: 'left', border: 'none',
                        background: 'transparent', cursor: a.soon ? 'default' : 'pointer',
                        fontSize: 13, color: a.danger ? '#ef4444' : a.soon ? 'var(--text-muted)' : 'var(--text)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontWeight: a.danger ? 700 : 400,
                      }}
                      onMouseEnter={e => { if (!a.soon) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                        <span>{a.label}</span>
                        {a.soon && (
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                            Soon
                          </span>
                        )}
                        {a.danger && <span style={{ fontSize: 11 }}>🗑</span>}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setShowCsvModal(true)} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>📥 Import / Export</button>

          <div data-add-dropdown="true" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={goAdd} style={{
                padding: '7px 16px', border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.3)',
              }}>＋ Add Items</button>
              <button onClick={() => setAddDropdown(v => !v)} style={{
                padding: '7px 10px', border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer',
              }}>▾</button>
            </div>
            {addDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 160, overflow: 'hidden',
              }}>
                <button onClick={() => { goAdd(); setAddDropdown(false) }} style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: 'var(--text)', fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                }}>＋ Add Items</button>
                <button onClick={() => {
                  setAddDropdown(false)
                  setComboView(true)
                  setComboStep(1)
                  setComboForm(blankCombo(categories, rid, selCat !== 'ALL' ? selCat : null))
                }} style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: 'var(--text)', fontSize: 13,
                }}>🔀 Add Combo</button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <SkeletonTable rows={7} cols={6} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', width: 48, textAlign: 'center' }}>
                    <input type="checkbox"
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                      checked={allSelected} onChange={toggleSelectAll}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 15, height: 15 }} />
                  </th>
                  {[
                    { label: 'Item', flex: true },
                    { label: 'Category', w: 140 },
                    { label: 'Price', w: 90 },
                    { label: 'Availability', w: 130 },
                    { label: 'Actions', w: 110 },
                  ].map(h => (
                    <th key={h.label} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                      color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.05em',
                      textTransform: 'uppercase', width: h.w,
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--text)' }}>No items found</div>
                      <div style={{ fontSize: 13, marginBottom: 16 }}>
                        {search || dietFilter !== 'ALL' ? 'Filter change karo ya search clear karo' : '"+ Add Items" se pehla item add karo'}
                      </div>
                      {!search && dietFilter === 'ALL' && (
                        <button onClick={goAdd} style={{
                          padding: '9px 20px', borderRadius: 8, border: 'none',
                          background: 'var(--accent)', color: '#fff', fontWeight: 700,
                          fontSize: 13, cursor: 'pointer',
                        }}>＋ Add Items</button>
                      )}
                    </td>
                  </tr>
                ) : groups.map((group, gi) => {
                  if (!group.isGroup) {
                    const p = group.items[0]
                    const isSelected = selected.has(p.id)
                    return (
                      <tr key={p.id} style={{
                        borderBottom: '1px solid var(--border)',
                        background: isSelected ? 'rgba(99,102,241,0.05)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                        {/* Checkbox */}
                        <td style={{ padding: '10px 14px', textAlign: 'center', width: 48 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                            <div style={{
                              width: 3, height: 28, borderRadius: 2, marginRight: 8, flexShrink: 0,
                              background: p.available ? '#10b981' : '#ef4444',
                            }} />
                            <input type="checkbox" checked={isSelected} onChange={() => toggleOne(p.id)}
                              style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 15, height: 15 }} />
                          </div>
                        </td>

                        {/* Name + badges */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FoodDot type={p.dietary || 'VEG'} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{p.name}</span>
                                {p._isCombo && (
                                  <span style={{
                                    fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                    color: '#f97316', border: '1px solid #f9731640', background: '#f9731610',
                                    flexShrink: 0,
                                  }}>🔀 COMBO · {p.comboType || 'FIXED'}</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                                {p._isCombo && p.lineItems?.length > 0 && (
                                  <span title={p.lineItems.map(li => li.product?.name || `#${li.productId}`).join(', ')} style={{
                                    fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                                    color: '#f97316', border: '1px solid #f9731640', cursor: 'help',
                                    background: '#f9731608',
                                  }}>{p.lineItems.length} items</span>
                                )}
                                {!p._isCombo && (p.productVariants?.length > 0 || p.variant) && (
                                  <span title={p.productVariants?.map(pv => `${pv.variant?.name} ₹${pv.price}`).join(', ')} style={{
                                    fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                                    color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'help',
                                    background: 'rgba(99,102,241,0.08)',
                                  }}>V · {p.productVariants?.length || 1}</span>
                                )}
                                {!p._isCombo && p.addonGroups?.length > 0 && (
                                  <span title={p.addonGroups?.map(a => a.name).join(', ')} style={{
                                    fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                                    color: '#3b82f6', border: '1px solid #3b82f640', cursor: 'help',
                                    background: '#3b82f608',
                                  }}>A · {p.addonGroups.length}</span>
                                )}
                                {p.shortCode && (
                                  <span style={{
                                    fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 600,
                                    color: 'var(--text-muted)', border: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)',
                                  }}>{p.shortCode}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '10px 14px', width: 140 }}>
                          <span style={{
                            fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                            background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                            border: '1px solid var(--border)', whiteSpace: 'nowrap',
                          }}>{catMap[p.categoryId] || '—'}</span>
                        </td>

                        {/* Price */}
                        <td style={{ padding: '10px 14px', width: 90 }}>
                          {p._isCombo ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#f97316' }}>₹{p.price || 0}</div>
                              {p.originalPrice > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{p.originalPrice}</div>}
                            </div>
                          ) : (p.productVariants?.length > 0) ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>
                                ₹{Math.min(...p.productVariants.map(pv => pv.price))}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+ variants</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>
                              ₹{p.price || 0}
                            </span>
                          )}
                        </td>

                        {/* Availability */}
                        <td style={{ padding: '10px 14px', width: 130 }}>
                          <button onClick={() => toggle(p)} disabled={toggling === p.id} style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            cursor: toggling === p.id ? 'not-allowed' : 'pointer', border: 'none',
                            background: p.available ? '#10b98118' : '#ef444418',
                            color: p.available ? '#10b981' : '#ef4444',
                            opacity: toggling === p.id ? 0.5 : 1, whiteSpace: 'nowrap',
                          }}>
                            {toggling === p.id ? '…' : p.available ? '● In Stock' : '○ Out of Stock'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 12px', width: 110 }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {!p._isCombo && (
                              <button onClick={() => goEdit(p)} title="Edit" style={{
                                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)',
                                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>✏️</button>
                            )}
                            {p._isCombo && (
                              <button onClick={() => goEditCombo(p)} title="Edit Combo" style={{
                                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)',
                                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>✏️</button>
                            )}
                            {!p._isCombo && (
                              <button onClick={() => setViewItem(p)} title="View Details" style={{
                                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)',
                                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>📋</button>
                            )}
                            <button onClick={() => del(p)} title="Delete" style={{
                              width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)',
                              background: 'transparent', color: '#ef4444', cursor: 'pointer',
                              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  // Grouped rows
                  const gkey = `g-${gi}`, isExp = expanded.has(gkey)
                  const prices = group.items.map(p => p.price)
                  return [
                    <tr key={gkey} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      background: 'var(--bg-secondary)' }}
                      onClick={() => setExpanded(s => {
                        const ns = new Set(s); ns.has(gkey) ? ns.delete(gkey) : ns.add(gkey); return ns
                      })}>
                      <td style={{ padding: '10px 14px', textAlign: 'center', width: 48 }}>
                        <input type="checkbox"
                          ref={el => { if (el) { const ids = group.items.map(p => p.id); el.indeterminate = ids.some(id => selected.has(id)) && !ids.every(id => selected.has(id)) }}}
                          checked={group.items.map(p => p.id).every(id => selected.has(id))}
                          onChange={() => toggleGroup(group.items.map(p => p.id))}
                          onClick={e => e.stopPropagation()}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 15, height: 15 }} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, transform: isExp ? 'rotate(90deg)' : 'none',
                            transition: '0.15s', color: 'var(--text-muted)' }}>▶</span>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{group.baseName}</span>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                            background: 'var(--accent)', color: '#fff',
                          }}>{group.items.length} items</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {group.items.map(p => p.name.replace(group.baseName, '').trim()).filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', width: 140 }}>
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                          background: 'var(--bg-card)', color: 'var(--text-muted)',
                          border: '1px solid var(--border)' }}>
                          {catMap[group.items[0]?.categoryId] || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', width: 90 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>
                          ₹{Math.min(...prices)}–{Math.max(...prices)}
                        </span>
                      </td>
                      <td colSpan={2} />
                    </tr>,
                    ...(isExp ? group.items.map((p, pi) => {
                      const isSelected = selected.has(p.id)
                      return (
                        <tr key={`${gkey}-${p.id}`} style={{
                          borderBottom: '1px solid var(--border)',
                          background: isSelected ? 'rgba(99,102,241,0.05)' : pi % 2 ? 'var(--bg-secondary)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = pi % 2 ? 'var(--bg-secondary)' : 'transparent' }}>
                          <td style={{ padding: '9px 14px', textAlign: 'center', width: 48, paddingLeft: 28 }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleOne(p.id)}
                              style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 15, height: 15 }} />
                          </td>
                          <td style={{ padding: '9px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
                              <span style={{ color: 'var(--border)', fontSize: 16 }}>└</span>
                              <FoodDot type={p.dietary || 'VEG'} />
                              <div>
                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{p.name}</span>
                                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                  {(p.productVariants?.length > 0 || p.variant) && (
                                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                                      color: 'var(--accent)', border: '1px solid var(--accent)',
                                      background: 'rgba(99,102,241,0.08)' }}>V</span>
                                  )}
                                  {p.addonGroups?.length > 0 && (
                                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                                      color: '#3b82f6', border: '1px solid #3b82f640', background: '#3b82f608' }}>A</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '9px 14px', width: 140 }} />
                          <td style={{ padding: '9px 14px', width: 90 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>₹{p.price || 0}</span>
                          </td>
                          <td style={{ padding: '9px 14px', width: 130 }}>
                            <button onClick={() => toggle(p)} disabled={toggling === p.id} style={{
                              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              cursor: toggling === p.id ? 'not-allowed' : 'pointer', border: 'none',
                              background: p.available ? '#10b98118' : '#ef444418',
                              color: p.available ? '#10b981' : '#ef4444',
                            }}>{toggling === p.id ? '…' : p.available ? '● In Stock' : '○ Out of Stock'}</button>
                          </td>
                          <td style={{ padding: '9px 12px', width: 110 }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => goEdit(p)} style={{
                                width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>✏️</button>
                              <button onClick={() => del(p)} style={{
                                width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)',
                                background: 'transparent', color: '#ef4444', cursor: 'pointer',
                                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      )
                    }) : [])
                  ]
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom status bar */}
        <div style={{
          padding: '7px 16px', borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)', flexShrink: 0,
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>V</span> = Variants</span>
          <span><span style={{ color: '#3b82f6', fontWeight: 700 }}>A</span> = Addons</span>
          <span>Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text)' }}>{items.length}</strong> items</span>
          {selected.size > 0 && (
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--accent)' }}>
              ✓ {selected.size} selected
            </span>
          )}
        </div>
      </div>
    </div>

    {/* ── FLOATING BULK ACTION BAR ─────────────────────────────────────────── */}
    {selected.size > 0 && (
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '10px 16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', gap: 8, zIndex: 300,
        flexWrap: 'wrap', maxWidth: '90vw',
      }}>
        <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 13, marginRight: 4 }}>
          {selected.size} item{selected.size > 1 ? 's' : ''} selected
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--border)', marginRight: 4 }} />
        {[
          { label: '✅ In Stock', fn: () => bulkSetAvailability(true), color: '#10b981', bg: '#10b98112', border: '#10b98140' },
          { label: '❌ Out of Stock', fn: () => bulkSetAvailability(false), color: '#f59e0b', bg: '#f59e0b12', border: '#f59e0b40' },
          { label: '🟢 Veg', fn: () => bulkSetDietary('VEG'), color: '#10b981', bg: '#10b98112', border: '#10b98130' },
          { label: '🔴 Non-Veg', fn: () => bulkSetDietary('NON_VEG'), color: '#ef4444', bg: '#ef444412', border: '#ef444430' },
          { label: '🗑 Delete', fn: bulkDelete, color: '#ef4444', bg: '#ef444412', border: '#ef444440' },
        ].map(b => (
          <button key={b.label} onClick={b.fn} disabled={actionBusy} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: actionBusy ? 'not-allowed' : 'pointer',
            border: `1px solid ${b.border}`, background: b.bg, color: b.color,
            opacity: actionBusy ? 0.6 : 1,
          }}>{b.label}</button>
        ))}
        <button onClick={() => setSelected(new Set())} style={{
          padding: '6px 12px', borderRadius: 8, fontSize: 12,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-muted)', cursor: 'pointer',
        }}>✕ Clear</button>
      </div>
    )}

    {/* ── GST TYPE MODAL ───────────────────────────────────────────────────── */}
    {gstModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => e.target === e.currentTarget && setGstModal(false)}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14, padding: '24px 28px', width: 320,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>
            Update GST Tag
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {selected.size} items ka GST type update hoga
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button onClick={() => bulkSetGstType('SERVICES')} style={{
              flex: 1, padding: '14px 8px', borderRadius: 10,
              border: '1px solid #10b98140', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: '#10b98110', color: '#10b981',
            }}>🧾 Services</button>
            <button onClick={() => bulkSetGstType('GOODS')} style={{
              flex: 1, padding: '14px 8px', borderRadius: 10,
              border: '1px solid #3b82f640', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: '#3b82f610', color: '#3b82f6',
            }}>📦 Goods</button>
          </div>
          <button onClick={() => setGstModal(false)} style={{
            width: '100%', padding: '9px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13,
            color: 'var(--text-muted)', background: 'transparent',
          }}>Cancel</button>
        </div>
      </div>
    )}

    {/* ── BUSY OVERLAY ─────────────────────────────────────────────────────── */}
    {actionBusy && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14, padding: '28px 36px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
        }}>
          <div style={{ width: 36, height: 36, border: '4px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Bulk update ho raha hai…</div>
        </div>
      </div>
    )}

    {/* ── PRODUCT DETAIL MODAL ─────────────────────────────────────────────── */}
    {viewItem && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={e => e.target === e.currentTarget && setViewItem(null)}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 520,
          maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border)',
        }}>
          {/* Modal header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FoodDot type={viewItem.dietary || 'VEG'} size={18} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{viewItem.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  ID #{viewItem.id} · {catMap[viewItem.categoryId] || '—'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700,
                background: viewItem.available ? '#10b98115' : '#ef444415',
                color: viewItem.available ? '#10b981' : '#ef4444',
                border: `1px solid ${viewItem.available ? '#10b98130' : '#ef444430'}` }}>
                {viewItem.available ? '● In Stock' : '○ Out of Stock'}
              </span>
              <button onClick={() => setViewItem(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
                  color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
            </div>
          </div>

          <div style={{ padding: '18px 20px' }}>
            {/* Price / Variants */}
            {(viewItem.productVariants || []).length > 0 ? (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', marginBottom: 10 }}>Variants & Prices</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {viewItem.productVariants.map((pv, pi) => {
                    const vName = pv.variant?.name || variants.find(v => v.id === pv.variantId)?.name || `Variant ${pv.variantId}`
                    return (
                      <div key={pv.variantId ?? pi} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 10,
                        border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{vName}</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>₹{pv.price}</span>
                        {pi === 0 && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>★ Base</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase' }}>Price</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981' }}>₹{viewItem.price || 0}</div>
              </div>
            )}

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 18 }}>
              {[
                ['Category',   catMap[viewItem.categoryId] || '—'],
                ['Dietary',    viewItem.dietary || 'VEG'],
                ['GST Type',   viewItem.gstType || '—'],
                ['Short Code', viewItem.shortCode || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', background: 'var(--bg-secondary)',
                  borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
                    textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>

            {viewItem.description && (
              <div style={{ marginBottom: 18, padding: '12px 14px',
                background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
                  textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{viewItem.description}</div>
              </div>
            )}

            {(viewItem.addonGroups || []).length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', marginBottom: 8 }}>Addon Groups</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {viewItem.addonGroups.map(ag => (
                    <span key={ag.id} style={{
                      fontSize: 12, padding: '5px 14px', borderRadius: 20,
                      background: '#3b82f610', border: '1px solid #3b82f630',
                      color: '#3b82f6', fontWeight: 600,
                    }}>{ag.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setViewItem(null); goEdit(viewItem) }} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}>✏️ Edit</button>
              <button onClick={() => { toggle(viewItem); setViewItem(v => ({ ...v, available: !v.available })) }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)',
                }}>
                {viewItem.available ? '❌ Mark Unavailable' : '✅ Mark Available'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showCsvModal && (
      <MenuCsvImport
        onClose={() => setShowCsvModal(false)}
        onImported={() => { setShowCsvModal(false); load() }}
      />
    )}

    {comboView && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 760,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Modal header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-secondary)', flexShrink: 0,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{editingComboId ? '✏️ Edit Combo' : '🔀 New Combo'}</div>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 700,
                    background: comboStep >= s ? 'var(--accent)' : 'var(--border)',
                    color: comboStep >= s ? '#fff' : 'var(--text-muted)',
                  }}>{s}</div>
                  {s < 3 && <div style={{ width: 24, height: 2, background: comboStep > s ? 'var(--accent)' : 'var(--border)' }} />}
                </div>
              ))}
            </div>
            <button onClick={() => { setComboView(false); setComboStep(1); setEditingComboId(null) }} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)',
            }}>✕</button>
          </div>

          {/* Modal body — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

            {/* ── STEP 1: Basic Details ── */}
            {comboStep === 1 && comboForm && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 20 }}>
                  Step 1 — Basic Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 14, marginBottom: 14 }}>
                  <FLabel label="Combo Name *">
                    <input value={comboForm.name} onChange={e => setComboForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Enter combo name" autoFocus
                      style={{ ...fi, border: `1px solid ${comboForm.name ? 'var(--border)' : '#ef4444'}` }} />
                  </FLabel>
                  <FLabel label="Short Code">
                    <input value={comboForm.shortCode} onChange={e => setComboForm(f => ({ ...f, shortCode: e.target.value }))}
                      placeholder="e.g. CB1" style={fi} />
                  </FLabel>
                  <FLabel label="Online Display Name">
                    <input value={comboForm.displayName} onChange={e => setComboForm(f => ({ ...f, displayName: e.target.value }))}
                      placeholder="Blank = same as name" style={fi} />
                  </FLabel>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <FLabel label="Category">
                    {(() => {
                      const parentCats  = categories.filter(c => !c.parentId)
                      const selCatObj   = categories.find(c => String(c.id) === String(comboForm.categoryId))
                      const selParentId = selCatObj?.parentId ? String(selCatObj.parentId) : String(comboForm.categoryId || '')
                      const subCats     = categories.filter(c => String(c.parentId) === selParentId)
                      const subValue    = selCatObj?.parentId ? String(comboForm.categoryId) : ''
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <select value={selParentId} style={fs}
                            onChange={e => setComboForm(f => ({ ...f, categoryId: e.target.value }))}>
                            <option value="">— Select Category —</option>
                            {parentCats.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                          {subCats.length > 0 && (
                            <select value={subValue} style={{ ...fs, fontSize: 12 }}
                              onChange={e => setComboForm(f => ({ ...f, categoryId: e.target.value }))}>
                              <option value="">— Select Subcategory —</option>
                              {subCats.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                            </select>
                          )}
                        </div>
                      )
                    })()}
                  </FLabel>
                  <FLabel label="GST Type">
                    <select value={comboForm.gstType} onChange={e => setComboForm(f => ({ ...f, gstType: e.target.value }))} style={fs}>
                      <option value="SERVICES">🧾 Services</option>
                      <option value="GOODS">📦 Goods</option>
                    </select>
                  </FLabel>
                  <FLabel label="Dietary">
                    <select value={comboForm.dietary} onChange={e => setComboForm(f => ({ ...f, dietary: e.target.value }))} style={fs}>
                      <option value="VEG">🟢 Veg</option>
                      <option value="NON_VEG">🔴 Non-Veg</option>
                      <option value="EGG">🟡 Egg</option>
                    </select>
                  </FLabel>
                </div>
                <FLabel label="Description (optional)">
                  <textarea value={comboForm.description} onChange={e => setComboForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Short description shown on menu (optional)" rows={3}
                    style={{ ...fi, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                </FLabel>
              </div>
            )}

            {/* ── STEP 2: Combo Type Selection ── */}
            {comboStep === 2 && comboForm && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 20 }}>
                  Step 2 — Combo Type Selection
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { type: 'FIXED', icon: '📋', title: 'Fixed Combo', desc: 'Single set price for a pre-defined selection of items.' },
                    { type: 'CUSTOMISABLE', icon: '⚙️', title: 'Customisable', desc: 'Price updates dynamically based on user choices.' },
                  ].map(opt => {
                    const sel = comboForm.comboType === opt.type
                    return (
                      <div key={opt.type} onClick={() => setComboForm(f => ({ ...f, comboType: opt.type }))} style={{
                        padding: 20, borderRadius: 12, cursor: 'pointer', userSelect: 'none',
                        border: `2px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                        background: sel ? 'var(--accent)10' : 'var(--bg-secondary)',
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 10 }}>{opt.icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: sel ? 'var(--accent)' : 'var(--text)', marginBottom: 6 }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: Items & Pricing ── */}
            {comboStep === 3 && comboForm && (() => {
              const isFixed = comboForm.comboType === 'FIXED'
              const totalStd = comboForm.lineItems.reduce((s, li) => s + (li.standardPrice || 0) * (li.qty || 1), 0)
              const savings = totalStd - (Number(comboForm.price) || 0)

              const addLineItem = (productId) => {
                const p = items.find(x => String(x.id) === String(productId))
                if (!p) return
                if (comboForm.lineItems.some(li => String(li.productId) === String(productId))) {
                  toast.error('Item already added'); return
                }
                setComboForm(f => ({
                  ...f,
                  lineItems: [...f.lineItems, { productId: p.id, qty: 1, standardPrice: p.price || 0, offerPrice: 0 }],
                  _pendingProductId: '',
                }))
              }

              return (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 20 }}>
                    Step 3 — Items And Pricing
                  </div>

                  {/* Price summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <FLabel label={isFixed ? 'Item Offer Price (₹) *' : 'Combo Base Price (₹) *'}>
                      <input type="number" value={comboForm.price} min="0"
                        onChange={e => setComboForm(f => ({ ...f, price: e.target.value }))}
                        style={{ ...fi, border: `1px solid ${Number(comboForm.price) >= 0 ? 'var(--border)' : '#ef4444'}` }} />
                    </FLabel>
                    <div style={{ padding: '0 4px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Total Standard Price</div>
                      <div style={{ padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        ₹{totalStd.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: '0 4px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                        {isFixed ? 'Difference / Savings' : 'Total Combo Price'}
                      </div>
                      <div style={{ padding: '9px 14px', background: isFixed ? '#10b98118' : 'var(--bg-secondary)', borderRadius: 8, border: `1px solid ${isFixed ? '#10b98140' : 'var(--border)'}`, fontSize: 15, fontWeight: 700, color: isFixed ? '#10b981' : 'var(--text)' }}>
                        {isFixed ? `₹${Math.max(0, savings).toFixed(2)}` : `₹${(Number(comboForm.price) + comboForm.lineItems.reduce((s, li) => s + (li.offerPrice || 0) * (li.qty || 1), 0)).toFixed(2)}`}
                      </div>
                    </div>
                  </div>

                  {/* Customisable info */}
                  {!isFixed && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: '#3b82f618', border: '1px solid #3b82f630', marginBottom: 16, fontSize: 12, color: '#3b82f6' }}>
                      Each item in the combo can have its different offered price. The total combo price = base price + item offer prices.
                    </div>
                  )}

                  {/* Line items table */}
                  {comboForm.lineItems.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Select Item</th>
                          {isFixed && <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, width: 120 }}>Quantity</th>}
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, width: 140 }}>Item Standard Price</th>
                          {!isFixed && <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, width: 140 }}>Item Offer Price</th>}
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, width: 50 }}>—</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comboForm.lineItems.map((li, idx) => {
                          const prod = items.find(x => String(x.id) === String(li.productId))
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{prod?.name || `Product #${li.productId}`}</div>
                                {prod?.shortCode && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{prod.shortCode}</div>}
                              </td>
                              {isFixed && (
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    <button onClick={() => setComboForm(f => ({ ...f, lineItems: f.lineItems.map((x, i) => i === idx ? { ...x, qty: Math.max(1, (x.qty || 1) - 1) } : x) }))}
                                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>−</button>
                                    <span style={{ width: 30, textAlign: 'center', fontWeight: 700 }}>{li.qty || 1}</span>
                                    <button onClick={() => setComboForm(f => ({ ...f, lineItems: f.lineItems.map((x, i) => i === idx ? { ...x, qty: (x.qty || 1) + 1 } : x) }))}
                                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>+</button>
                                  </div>
                                </td>
                              )}
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                                ₹{(li.standardPrice || 0).toFixed(2)}
                              </td>
                              {!isFixed && (
                                <td style={{ padding: '8px 12px' }}>
                                  <input type="number" value={li.offerPrice ?? 0} min="0"
                                    onChange={e => setComboForm(f => ({ ...f, lineItems: f.lineItems.map((x, i) => i === idx ? { ...x, offerPrice: e.target.value } : x) }))}
                                    style={{ ...fi, textAlign: 'right', width: 120 }} />
                                </td>
                              )}
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <button onClick={() => setComboForm(f => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18 }}>×</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Add new item row */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={comboForm._pendingProductId || ''} onChange={e => setComboForm(f => ({ ...f, _pendingProductId: e.target.value }))} style={{ ...fs, flex: 1 }}>
                      <option value="">Select Item to Add</option>
                      {items.filter(p => !comboForm.lineItems.some(li => String(li.productId) === String(p.id))).map(p => (
                        <option key={p.id} value={p.id}>{p.name}{p.price > 0 ? ` — ₹${p.price}` : ''}</option>
                      ))}
                    </select>
                    <button onClick={() => {
                      if (!comboForm._pendingProductId) { toast.error('Item select karo'); return }
                      addLineItem(comboForm._pendingProductId)
                    }} style={{
                      padding: '9px 16px', borderRadius: 8, border: 'none',
                      background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', flexShrink: 0,
                    }}>+ Add New Item</button>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Modal footer */}
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-secondary)', flexShrink: 0,
          }}>
            <button onClick={() => { setComboView(false); setComboStep(1) }} style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <div style={{ display: 'flex', gap: 10 }}>
              {comboStep > 1 && (
                <button onClick={() => setComboStep(s => s - 1)} style={{
                  padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                }}>← Back</button>
              )}
              {comboStep < 3 ? (
                <button onClick={() => {
                  if (comboStep === 1 && !comboForm?.name?.trim()) { toast.error('Combo naam required hai'); return }
                  setComboStep(s => s + 1)
                }} style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>Next →</button>
              ) : (
                <button onClick={handleSaveCombo} disabled={comboSaving} style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: comboSaving ? 'not-allowed' : 'pointer', opacity: comboSaving ? 0.7 : 1,
                }}>{comboSaving ? 'Saving…' : '✅ Save Combo'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
