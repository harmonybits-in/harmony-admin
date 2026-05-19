// src/pages/PurchaseOrder.jsx
import { useState } from 'react'
import AddPOForm from '../components/inventory/AddPOForm'
import POList from '../components/inventory/POList'

export default function PurchaseOrder() {
  const [view, setView] = useState('list')
  if (view === 'add') return (
    <AddPOForm
      onSave={()=>setView('list')}
      onCancel={()=>setView('list')}
    />
  )
  return <POList onAdd={()=>setView('add')}/>
}
