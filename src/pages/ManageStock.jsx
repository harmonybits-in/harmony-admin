// src/pages/ManageStock.jsx
import AvailableStockPageComponent from '../components/inventory/AvailableStockPage'
import ClosingStockPageComponent from '../components/inventory/ClosingStockPage'

export { AvailableStockPageComponent as AvailableStockPage, ClosingStockPageComponent as ClosingStockPage }

export default function ManageStock() {
  return <AvailableStockPageComponent/>
}
