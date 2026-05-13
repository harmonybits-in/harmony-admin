// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout         from './components/Layout'
import ToastContainer from './components/ToastContainer'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Bills          from './pages/Bills'
import Staff          from './pages/Staff'
import Customers      from './pages/Customers'
import Inventory      from './pages/Inventory'
import Payroll        from './pages/Payroll'
import Reports        from './pages/Reports'
import Settings       from './pages/Settings'
import MenuManagement       from './pages/MenuManagement'
import RestaurantManagement from './pages/RestaurantManagement'
import RiderTracking        from './pages/RiderTracking'
import Subscription        from './pages/Subscription'
import Promotions          from './pages/Promotions'
import TaxConfig           from './pages/TaxConfig'
import AttendanceReports   from './pages/AttendanceReports'
import DuePayments         from './pages/DuePayments'
import StaffPayments       from './pages/StaffPayments'
import DeliveryOrders      from './pages/DeliveryOrders'
import LoyaltyPoints       from './pages/LoyaltyPoints'
import OnlineOrders        from './pages/OnlineOrders'

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuthStore()
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index            element={<Dashboard />} />
          <Route path="bills"     element={<Bills />} />
          <Route path="menu"      element={<MenuManagement />} />
          <Route path="staff"     element={<Staff />} />
          <Route path="customers" element={<Customers />} />
          <Route path="inventory/*" element={<Inventory />} />
          <Route path="payroll"   element={<Payroll />} />
          <Route path="reports"   element={<Reports />} />
          <Route path="settings"  element={<Settings />} />
          <Route path="restaurants" element={<RestaurantManagement />} />
          <Route path="riders"      element={<RiderTracking />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="promotions"   element={<Promotions />} />
          <Route path="tax-config"        element={<TaxConfig />} />
          <Route path="attendance"        element={<AttendanceReports />} />
          <Route path="due-payments"      element={<DuePayments />} />
          <Route path="staff-payments"    element={<StaffPayments />} />
          <Route path="delivery"          element={<DeliveryOrders />} />
          <Route path="loyalty"           element={<LoyaltyPoints />} />
          <Route path="online-orders"     element={<OnlineOrders />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
