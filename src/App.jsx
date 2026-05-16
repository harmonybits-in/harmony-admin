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
import Discounts           from './pages/Discounts'
import Coupons             from './pages/Coupons'
import TaxConfig           from './pages/TaxConfig'
import AttendanceReports   from './pages/AttendanceReports'
import DuePayments         from './pages/DuePayments'
import StaffPayments       from './pages/StaffPayments'
import DeliveryOrders      from './pages/DeliveryOrders'
import LoyaltyPoints       from './pages/LoyaltyPoints'
import OnlineOrders        from './pages/OnlineOrders'
import TableManagement     from './pages/TableManagement'
import MenuConfig          from './pages/MenuConfig'
import MenuCategories      from './pages/MenuCategories'
import CustomerFeedback    from './pages/CustomerFeedback'
import WhatsAppNotifications from './pages/WhatsAppNotifications'
import CsvImport                from './pages/CsvImport'
import QrAttendance             from './pages/QrAttendance'
import RawMaterialCategories    from './pages/RawMaterialCategories'
import DeviceManagement         from './pages/DeviceManagement'
import Referrals                from './pages/Referrals'
import ServiceAgreement         from './pages/ServiceAgreement'
import Leave                   from './pages/Leave.jsx'
import Chatbot                 from './pages/Chatbot'
import ChatWidget               from './pages/ChatWidget'

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
        <Route path="/chat/:restaurantId" element={<ChatWidget />} />
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
          <Route path="discounts"    element={<Discounts />} />
          <Route path="coupons"      element={<Coupons />} />
          <Route path="tax-config"        element={<TaxConfig />} />
          <Route path="attendance"        element={<AttendanceReports />} />
          <Route path="due-payments"      element={<DuePayments />} />
          <Route path="staff-payments"    element={<StaffPayments />} />
          <Route path="delivery"          element={<DeliveryOrders />} />
          <Route path="loyalty"           element={<LoyaltyPoints />} />
          <Route path="online-orders"     element={<OnlineOrders />} />
          <Route path="tables"            element={<TableManagement />} />
          <Route path="menu-config"       element={<MenuConfig />} />
          <Route path="menu-categories"   element={<MenuCategories />} />
          <Route path="feedback"          element={<CustomerFeedback />} />
          <Route path="whatsapp"          element={<WhatsAppNotifications />} />
          <Route path="csv-import"        element={<CsvImport />} />
          <Route path="qr-attendance"          element={<QrAttendance />} />
          <Route path="rm-categories"          element={<RawMaterialCategories />} />
          <Route path="device-management"      element={<DeviceManagement />} />
          <Route path="referrals"              element={<Referrals />} />
          <Route path="service-agreement"      element={<ServiceAgreement standalone />} />
          <Route path="leave"                  element={<Leave />} />
          <Route path="chatbot"               element={<Chatbot />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
