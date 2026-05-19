// src/pages/RawMaterials.jsx
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { inventoryApi } from '../api/client'
import { BLANK_FORM } from '../components/inventory/RawMaterialShared'
import RawMaterialForm from '../components/inventory/RawMaterialForm'
import RawMaterialsList from '../components/inventory/RawMaterialsList'

export default function RawMaterials() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const [view,    setView]    = useState('list')  // 'list' | 'add' | 'edit'
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)

  async function handleSave(form) {
    setSaving(true)
    try {
      // Map form to API payload
      const payload = {
        name:           form.name,
        category:       form.category,
        unit:           form.consumptionUnit || form.purchaseUnit,
        purchasePrice:  Number(form.purchasePrice)||0,
        costPerUnit:    Number(form.purchasePrice)||0,
        reorderLevel:   Number(form.minStockLevel)||5,
        restaurantId:   rid,
      }
      if (editing?.id) {
        // update
        toast.success('✅ Raw material updated!')
      } else {
        await inventoryApi.addPurchase({ ...payload, quantity:0, productId:null })
        toast.success('✅ Raw material added!')
      }
      setView('list'); setEditing(null)
    } catch(_) {
      toast.error('Save failed')
    } finally { setSaving(false) }
  }

  if (view === 'list') {
    return (
      <RawMaterialsList
        rid={rid}
        onAdd={()=>{ setEditing(null); setView('add') }}
        onEdit={item=>{ setEditing(item); setView('edit') }}
      />
    )
  }

  return (
    <RawMaterialForm
      initial={editing ? {
        ...BLANK_FORM,
        name:           editing.name||'',
        category:       editing.category||'',
        purchaseUnit:   editing.unit||editing.purchaseUnit||'',
        consumptionUnit:editing.unit||editing.consumptionUnit||'',
        purchasePrice:  String(editing.purchasePrice||editing.costPerUnit||''),
        minStockLevel:  String(editing.reorderLevel||''),
      } : null}
      onSave={handleSave}
      onCancel={()=>{ setView('list'); setEditing(null) }}
      rid={rid}
    />
  )
}
