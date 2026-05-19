// src/pages/Inventory.jsx
import RawMaterials from './RawMaterials'
import UnitManagement from './UnitManagement'
import ItemRecipes          from './ItemRecipes'
import ProductionExecution  from './ProductionExecution'
import ProductionMaster     from './ProductionMaster'
import BarcodeGeneration    from './BarcodeGeneration'
import StockPurchase       from './StockPurchase'
import PurchaseOrder       from './PurchaseOrder'
import PurchaseReturn      from './PurchaseReturn'
import InvoiceTemplates    from './InvoiceTemplates'
import { AvailableStockPage, ClosingStockPage } from './ManageStock'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import InventoryDashboard    from '../components/inventory/InventoryDashboard'
import StockPage             from '../components/inventory/StockPage'
import SuppliersPage         from '../components/inventory/SuppliersPage'
import PurchaseOrdersPage    from '../components/inventory/PurchaseOrdersPage'
import LowStockPage          from '../components/inventory/LowStockPage'
import PlaceholderPage       from '../components/inventory/PlaceholderPage'

export default function Inventory() {
  const rid      = useAuthStore(s => s.restaurantId)
  const location = useLocation()

  // These routes have their own full-page layout — no wrapper header
  const fullPageRoutes = ['/inventory/masters/raw', '/inventory/masters/units', '/inventory/masters/recipes', '/inventory/production/execution', '/inventory/production/master', '/inventory/production/barcode', '/inventory/purchase/stock', '/inventory/purchase/orders', '/inventory/purchase/return', '/inventory/masters/invoice']
  const isFullPage = fullPageRoutes.some(r => location.pathname.startsWith(r))

  if (isFullPage) {
    return (
      <Routes>
        <Route path="masters/raw"   element={<RawMaterials/>}/>
        <Route path="masters/units"   element={<UnitManagement/>}/>
        <Route path="masters/recipes"      element={<ItemRecipes/>}/>
        <Route path="production/execution" element={<ProductionExecution/>}/>
        <Route path="production/master"    element={<ProductionMaster/>}/>
        <Route path="production/barcode"   element={<BarcodeGeneration/>}/>
        <Route path="purchase/stock"        element={<StockPurchase/>}/>
        <Route path="purchase/orders"       element={<PurchaseOrder/>}/>
        <Route path="purchase/return"       element={<PurchaseReturn/>}/>
        <Route path="masters/invoice"       element={<InvoiceTemplates/>}/>
      </Routes>
    )
  }

  return (
    <div style={{ minHeight:'100%' }}>
      {/* Page header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#111' }}>📦 Inventory</h1>
        <p style={{ fontSize:12, color:'#888', marginTop:4 }}>
          Stock, purchases, suppliers aur COGS track karo
        </p>
      </div>

      {/* Nested routes */}
      <Routes>
        <Route index                         element={<InventoryDashboard rid={rid}/>}/>
        <Route path="stock/available"       element={<AvailableStockPage/>}/>
        <Route path="stock/closing"         element={<ClosingStockPage/>}/>
        <Route path="stock"                  element={<StockPage rid={rid}/>}/>
        <Route path="stock/add"              element={<StockPage rid={rid}/>}/>
        <Route path="stock/low"              element={<LowStockPage rid={rid}/>}/>
        <Route path="purchase/stock"         element={<StockPurchase/>}/>
        <Route path="purchase/vendors"       element={<SuppliersPage rid={rid}/>}/>
        <Route path="purchase/orders"        element={<PurchaseOrder/>}/>
        <Route path="purchase/return"        element={<PurchaseReturn/>}/>
        <Route path="masters/invoice"        element={<InvoiceTemplates/>}/>
        <Route path="purchase/history"       element={<PlaceholderPage title="Purchase History" icon="📜"/>}/>
        <Route path="masters/raw"            element={<RawMaterials/>}/>
        <Route path="masters/recipes"        element={<ItemRecipes/>}/>
        <Route path="masters/suppliers"      element={<SuppliersPage rid={rid}/>}/>
        <Route path="masters/units"          element={<UnitManagement/>}/>
        <Route path="stock/opening"          element={<PlaceholderPage title="Opening Stock" icon="📋"/>}/>
        <Route path="consumption/sales"      element={<PlaceholderPage title="Sales Consumption" icon="📉"/>}/>
        <Route path="consumption/transfer"   element={<PlaceholderPage title="Transfer" icon="🔄"/>}/>
        <Route path="consumption/wastage"    element={<PlaceholderPage title="Wastage" icon="🗑️"/>}/>
        <Route path="consumption/return"     element={<PlaceholderPage title="Sales Return" icon="↩️"/>}/>
        <Route path="production"             element={<PlaceholderPage title="Production" icon="🏭"/>}/>
        <Route path="reports/stock"          element={<PlaceholderPage title="Current Stock Report" icon="☑️"/>}/>
        <Route path="reports/summary"        element={<PlaceholderPage title="Stock Summary" icon="📦"/>}/>
        <Route path="reports/consumption"    element={<PlaceholderPage title="Orderwise Consumption" icon="📋"/>}/>
        <Route path="reports/other"          element={<PlaceholderPage title="Other Reports" icon="🕐"/>}/>
        <Route path="reports"                element={<PlaceholderPage title="Inventory Reports" icon="📊"/>}/>
      </Routes>
    </div>
  )
}
