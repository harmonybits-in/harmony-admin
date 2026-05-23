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
import AggregatorSettings      from './pages/AggregatorSettings'
import GstReports           from './pages/GstReports'
import KitchenDisplay       from './pages/KitchenDisplay'
import DirectAggregator     from './pages/DirectAggregator'
import AuditLog             from './pages/AuditLog'
import Expenses             from './pages/Expenses'
import PromotionRules       from './pages/PromotionRules'
import Refunds              from './pages/Refunds'
import Reservations         from './pages/Reservations'
import CashRegister         from './pages/CashRegister'
import Item86               from './pages/Item86'
import Roster              from './pages/Roster'
import SmsMarketing        from './pages/SmsMarketing'
import FoodCostReport      from './pages/FoodCostReport'
import PnlReport           from './pages/PnlReport'
import GiftCards                from './pages/GiftCards'
import FranchiseRoyalty         from './pages/FranchiseRoyalty'
import CustomerFacingDisplay    from './pages/CustomerFacingDisplay'
import QrOrder                  from './pages/QrOrder'
import AggregatorReconciliation from './pages/AggregatorReconciliation'
import OndcConfig        from './pages/OndcConfig'
import EdcTerminals      from './pages/EdcTerminals'
import MenuSync          from './pages/MenuSync'
import CustomerSegments  from './pages/CustomerSegments'
import KotPrinterConfig from './pages/KotPrinterConfig'
import StockTransfer    from './pages/StockTransfer'
import StockAudit       from './pages/StockAudit'
import DeliveryZones    from './pages/DeliveryZones'
import PreOrders        from './pages/PreOrders'
import CashFlowReport      from './pages/CashFlowReport'
import MenuEngineering     from './pages/MenuEngineering'
import QrPaymentConfig     from './pages/QrPaymentConfig'
import PushNotifications   from './pages/PushNotifications'
import StaffPerformance    from './pages/StaffPerformance'
import ReviewManagement    from './pages/ReviewManagement'
import PredictiveAnalytics from './pages/PredictiveAnalytics'
import Marketplace         from './pages/Marketplace'
import SelfOrderingKiosk  from './pages/SelfOrderingKiosk'
import TipsTracking      from './pages/TipsTracking'
import UpiLoyalty        from './pages/UpiLoyalty'
import MenuImageUpload   from './pages/MenuImageUpload'
import ComboBuilder      from './pages/ComboBuilder'
import NutritionInfo     from './pages/NutritionInfo'
import DigitalMenuBoard  from './pages/DigitalMenuBoard'
import CashDrawerMgmt    from './pages/CashDrawerMgmt'
import CourseManagement  from './pages/CourseManagement'
import DunzoIntegration  from './pages/DunzoIntegration'
import ExpiryTracking    from './pages/ExpiryTracking'
import VendorComparison  from './pages/VendorComparison'
import StaffTraining     from './pages/StaffTraining'
import AbandonedCart     from './pages/AbandonedCart'
import NpsPage           from './pages/NpsPage'
import ReportsHub        from './pages/ReportsHub'

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
        {/* Public pages — no auth */}
        <Route path="/cfd/:restaurantId"             element={<CustomerFacingDisplay />} />
        <Route path="/qr/:restaurantId/t/:tableId"   element={<QrOrder />} />
        <Route path="/qr/:restaurantId"              element={<QrOrder />} />
        <Route path="/kiosk/:restaurantId"           element={<SelfOrderingKiosk />} />
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
          <Route path="aggregator"            element={<AggregatorSettings />} />
          <Route path="gst-reports"        element={<GstReports />} />
          <Route path="kitchen-display"    element={<KitchenDisplay />} />
          <Route path="direct-aggregator"  element={<DirectAggregator />} />
          <Route path="audit-log"          element={<AuditLog />} />
          <Route path="expenses"           element={<Expenses />} />
          <Route path="promotion-rules"    element={<PromotionRules />} />
          <Route path="refunds"            element={<Refunds />} />
          <Route path="reservations"      element={<Reservations />} />
          <Route path="cash-register"     element={<CashRegister />} />
          <Route path="item-86"           element={<Item86 />} />
          <Route path="roster"            element={<Roster />} />
          <Route path="sms-marketing"     element={<SmsMarketing />} />
          <Route path="food-cost-report"  element={<FoodCostReport />} />
          <Route path="pnl-report"        element={<PnlReport />} />
          <Route path="gift-cards"        element={<GiftCards />} />
          <Route path="franchise-royalty"           element={<FranchiseRoyalty />} />
          <Route path="aggregator-reconciliation"   element={<AggregatorReconciliation />} />
          <Route path="ondc-config"         element={<OndcConfig />} />
          <Route path="edc-terminals"       element={<EdcTerminals />} />
          <Route path="menu-sync"           element={<MenuSync />} />
          <Route path="customer-segments"   element={<CustomerSegments />} />
          <Route path="kot-printer-config"   element={<KotPrinterConfig />} />
          <Route path="stock-transfer"      element={<StockTransfer />} />
          <Route path="stock-audit"         element={<StockAudit />} />
          <Route path="delivery-zones"      element={<DeliveryZones />} />
          <Route path="pre-orders"          element={<PreOrders />} />
          <Route path="cash-flow-report"    element={<CashFlowReport />} />
          <Route path="menu-engineering"    element={<MenuEngineering />} />
          <Route path="qr-payment-config"   element={<QrPaymentConfig />} />
          <Route path="push-notifications"  element={<PushNotifications />} />
          <Route path="staff-performance"      element={<StaffPerformance />} />
          <Route path="review-management"      element={<ReviewManagement />} />
          <Route path="predictive-analytics"   element={<PredictiveAnalytics />} />
          <Route path="marketplace"            element={<Marketplace />} />
          <Route path="tips"              element={<TipsTracking />} />
          <Route path="upi-loyalty"       element={<UpiLoyalty />} />
          <Route path="menu-images"       element={<MenuImageUpload />} />
          <Route path="combo-builder"     element={<ComboBuilder />} />
          <Route path="nutrition"         element={<NutritionInfo />} />
          <Route path="cash-drawer"       element={<CashDrawerMgmt />} />
          <Route path="courses"           element={<CourseManagement />} />
          <Route path="dunzo"             element={<DunzoIntegration />} />
          <Route path="expiry-tracking"   element={<ExpiryTracking />} />
          <Route path="vendor-comparison" element={<VendorComparison />} />
          <Route path="staff-training"    element={<StaffTraining />} />
          <Route path="abandoned-carts"   element={<AbandonedCart />} />
          <Route path="nps"               element={<NpsPage />} />
          <Route path="reports-hub"       element={<ReportsHub />} />
        </Route>
        <Route path="/menu-board/:restaurantId" element={<DigitalMenuBoard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
