// src/pages/StockPurchase.jsx
import { useState } from 'react'
import AddPurchaseForm from '../components/inventory/AddPurchaseForm'
import PurchaseList from '../components/inventory/PurchaseList'

export default function StockPurchase() {
  const [view, setView] = useState('list')
  if (view === 'add') return (
    <AddPurchaseForm
      onSave={()=>setView('list')}
      onCancel={()=>setView('list')}
    />
  )
  return <PurchaseList onAdd={()=>setView('add')}/>
}
