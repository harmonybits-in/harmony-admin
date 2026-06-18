// src/api/client.js
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToken() {
  return localStorage.getItem('harmoney_token') || ''
}

// ── Auth failure guard — prevents multiple redirects from parallel requests ──
let _authRedirectPending = false

function forceLogout() {
  if (_authRedirectPending) return
  _authRedirectPending = true
  // Clear all auth state (mirrors authStore.logout)
  localStorage.removeItem('harmoney_token')
  localStorage.removeItem('harmoney_user')
  localStorage.removeItem('harmoney_rid')
  localStorage.removeItem('harmoney_plan')
  // Flag for Login page to show "session expired" banner
  sessionStorage.setItem('auth_expired', '1')
  window.location.href = '/login'
}

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...opts.headers,
    },
  })

  // 401 = token missing/invalid/expired → session dead, force logout
  // 403 = valid token but insufficient permissions → throw error, do NOT logout
  if (res.status === 401) {
    forceLogout()
    return null
  }
  if (res.status === 403) {
    throw new Error('You do not have permission to perform this action.')
  }

  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const ct = res.headers.get('content-type') || ''
      const body = ct.includes('application/json') ? await res.json() : await res.text()
      msg = body?.message || body?.error || (typeof body === 'string' && body) || msg
    } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

// ── Dashboard ────────────────────────────────────────────────────
export const dashboardApi = {
  today:        (rid) => api.get(`/dashboard/today?restaurantId=${rid}`),
  revenueChart: (rid) => api.get(`/dashboard/revenue-chart?restaurantId=${rid}`),
  salesByType:  (rid, from, to) => api.get(`/dashboard/sales-by-type?restaurantId=${rid}&from=${from}&to=${to}`),
  expenses:     (rid, from, to) => api.get(`/dashboard/expenses?restaurantId=${rid}&from=${from}&to=${to}`),
  itemSales:    (rid, from, to) => api.get(`/dashboard/item-wise-sales?restaurantId=${rid}&from=${from}&to=${to}&limit=5`),
  staffReport:  (rid, date) => api.get(`/dashboard/staff-report?restaurantId=${rid}&date=${date}`),
}

// ── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  login: (body) => api.post('/auth/login', body),
}

// ── Bills ────────────────────────────────────────────────────────
export const billApi = {
  getAll:      (rid, params = '') => api.get(`/bills?restaurantId=${rid}&${params}`),
  getById:     (id) => api.get(`/bills/${id}`),
  today:       (rid) => api.get(`/bills/today?restaurantId=${rid}`),
  summary:     (rid, from, to) => api.get(`/bills/summary?restaurantId=${rid}&from=${from}&to=${to}`),
  sendWhatsApp:(id) => api.post(`/bills/${id}/whatsapp`),
}

// ── Staff ────────────────────────────────────────────────────────
export const staffApi = {
  getAll:                (rid, params = '') => api.get(`/staff?restaurantId=${rid}&${params}`),
  create:                (body) => api.post('/staff', body),
  update:                (id, body) => api.put(`/staff/${id}`, body),
  deactivate:            (id) => api.delete(`/staff/${id}`),
  setAttendancePermission: (id, allowed) => api.patch(`/staff/${id}/attendance-permission?allowed=${allowed}`),
  setPasscode:             (id, passcode) => api.patch(`/staff/${id}/passcode`, { passcode }),
  sendCredentials:         (id, passcode, restaurantName) => api.post(`/staff/${id}/send-credentials`, { passcode, restaurantName }),
}

// ── Staff Custom Roles ───────────────────────────────────────────
export const staffRoleApi = {
  getAll:       (rid) => api.get(`/staff-roles?restaurantId=${rid}`),
  getActive:    (rid) => api.get(`/staff-roles?restaurantId=${rid}&active=true`),
  create:       (body) => api.post('/staff-roles', body),
  update:       (id, body) => api.put(`/staff-roles/${id}`, body),
  toggleActive: (id, active) => api.patch(`/staff-roles/${id}/active?active=${active}`),
  delete:       (id) => api.delete(`/staff-roles/${id}`),
}

// ── Customers ────────────────────────────────────────────────────
export const customerApi = {
  getAll:     (rid, params = '') => api.get(`/customers?restaurantId=${rid}&${params}`),
  getByPhone: (phone, rid)       => api.get(`/customers/${phone}?restaurantId=${rid}`),
  getBills:   (customerId, page = 0) => api.get(`/bills?customerId=${customerId}&page=${page}&size=10`),
  getFeedback:(phone)            => api.get(`/feedback?customerPhone=${phone}`),
}

// ── Feedback ─────────────────────────────────────────────────────
export const feedbackApi = {
  getAll:   (rid)          => api.get(`/feedback`),
  respond:  (id, response) => api.patch(`/feedback/${id}/respond`, { response }),
  aiReply:  (id)           => api.post(`/feedback/${id}/ai-reply`, {}),
}

// ── Menu ─────────────────────────────────────────────────────────
export const menuApi = {
  // Products
  getProducts:      (rid, params='') => api.get(`/products?restaurantId=${rid}&${params}&size=200`),
  createProduct:    (body) => api.post('/products', body),
  updateProduct:    (id, body) => api.put(`/products/${id}`, body),
  deleteProduct:    (id) => api.delete(`/products/${id}`),
  toggleAvailability: (id, available) => api.patch(`/products/${id}/availability`, { available }),
  searchProducts:   (rid, q) => api.get(`/products/search?restaurantId=${rid}&query=${q}`),

  // Categories
  getCategories:    (rid) => api.get(`/categories/restaurant/${rid}`),
  createCategory:   (body) => api.post('/categories', body),
  updateCategory:   (id, body) => api.put(`/categories/${id}`, body),
  deleteCategory:   (id) => api.delete(`/categories/${id}`),
}

// ── Inventory ────────────────────────────────────────────────────
export const inventoryApi = {
  getAll:     (rid) => api.get(`/inventory?restaurantId=${rid}`),
  addPurchase:          (body) => api.post('/inventory/purchases', body),
  createPurchaseOrder:  (body) => api.post('/inventory/purchase-orders', body),
  createSupplier:       (body) => api.post('/inventory/suppliers', body),
  updateSupplier:       (id, body) => api.put(`/inventory/suppliers/${id}`, body),
  updatePurchaseStatus: (id, status, rid) => api.patch(`/inventory/purchase-orders/${id}/status?status=${status}&restaurantId=${rid}`),
  getLowStock:          (rid) => api.get(`/inventory/low-stock?restaurantId=${rid}`),
  getSuppliers: (rid) => api.get(`/inventory/suppliers?restaurantId=${rid}`),
  getPurchaseOrders: (rid) => api.get(`/inventory/purchase-orders?restaurantId=${rid}`),
}

// ── Subscription (Owner app) ──────────────────────────────────────
export const subscriptionApi = {
  getStatus:    (rid)        => api.get(`/subscription/${rid}`),
  activateTrial:(rid)        => api.post(`/subscription/${rid}/trial`, {}),
  createOrder:  (rid, plan)  => api.post(`/subscription/${rid}/order`, { plan }),
  verifyPayment:(body)       => api.post('/subscription/verify', body),
  validate:     (rid)        => api.get(`/subscription/${rid}/validate`),
}

// ── Expenses ──────────────────────────────────────────────────────
export const expenseApi = {
  getAll:     (rid, { from, to, category, page = 0, size = 20 } = {}) => {
    let url = `/expenses?page=${page}&size=${size}`
    if (from)     url += `&from=${from}`
    if (to)       url += `&to=${to}`
    if (category) url += `&category=${category}`
    return api.get(url)
  },
  getSummary: (rid, { from, to } = {}) => {
    let url = `/expenses/summary`
    const params = []
    if (from) params.push(`from=${from}`)
    if (to)   params.push(`to=${to}`)
    if (params.length) url += '?' + params.join('&')
    return api.get(url)
  },
  create: (rid, body) => api.post('/expenses', body),
  update: (rid, id, body) => api.put(`/expenses/${id}`, body),
  delete: (rid, id) => api.delete(`/expenses/${id}`),
}

// ── Refunds & Credit Notes ────────────────────────────────────────
export const refundApi = {
  getAll:      (params = '') => api.get(`/refunds?${params}`),
  getOne:      (id)          => api.get(`/refunds/${id}`),
  create:      (body)        => api.post('/refunds', body),
  approve:     (id, expiry)  => api.patch(`/refunds/${id}/approve${expiry ? `?creditNoteExpiry=${expiry}` : ''}`),
  reject:      (id, reason)  => api.patch(`/refunds/${id}/reject`, { reason }),
  getCreditNotes: (params='') => api.get(`/refunds/credit-notes?${params}`),
  validateCN:  (code)        => api.get(`/refunds/credit-notes/validate/${code}`),
  applyCN:     (id, amount)  => api.patch(`/refunds/credit-notes/${id}/apply`, { applyAmount: amount }),
}

// ── Promotions Engine ─────────────────────────────────────────────
export const promotionRuleApi = {
  getAll:       ()           => api.get('/promotions'),
  create:       (body)       => api.post('/promotions', body),
  update:       (id, body)   => api.put(`/promotions/${id}`, body),
  delete:       (id)         => api.delete(`/promotions/${id}`),
  toggleActive: (id, active) => api.patch(`/promotions/${id}/active?active=${active}`),
  evaluate:     (orderAmount) => api.post('/promotions/evaluate', { orderAmount }),
}

export const expenseCategoryApi = {
  getAll:  ()          => api.get('/expense-categories'),
  create:  (name)      => api.post('/expense-categories', { name }),
  delete:  (id)        => api.delete(`/expense-categories/${id}`),
}

// ── Audit Log ─────────────────────────────────────────────────────
export const auditApi = {
  getLogs: (rid, { action, entityType, page = 0 } = {}) => {
    let url = `/audit/${rid}?page=${page}`
    if (action)     url += `&action=${action}`
    if (entityType) url += `&entityType=${entityType}`
    return api.get(url)
  },
}

// ── Admin (SUPER_ADMIN) ───────────────────────────────────────────
export const adminApi = {
  getDashboard:    ()             => api.get('/admin/dashboard'),
  getRestaurants:  ()             => api.get('/admin/restaurants'),
  getRestaurant:   (id)           => api.get(`/admin/restaurants/${id}`),
  createRestaurant:(body)         => api.post('/admin/restaurants', body),
  updateRestaurant:(id, body)     => api.put(`/admin/restaurants/${id}`, body),
  toggleActive:    (id, val)      => api.patch(`/admin/restaurants/${id}/active?active=${val}`),
  getStats:        (id)           => api.get(`/admin/restaurants/${id}/stats`),
  getSubscription: (id)           => api.get(`/admin/restaurants/${id}/subscription`),
  activateSub:     (id, planId, days) => api.post(`/admin/restaurants/${id}/subscription/activate`, { planId, days }),
  extendSub:       (id, days)     => api.post(`/admin/restaurants/${id}/subscription/extend`, { planId: 'EXTEND', days }),
  deactivateSub:   (id)           => api.delete(`/admin/restaurants/${id}/subscription`),
  getFeatureAddons:(id)           => api.get(`/admin/restaurants/${id}/feature-addons`),
  grantAddon:      (id, addonId, days) => api.post(`/admin/restaurants/${id}/feature-addons/${addonId}/grant?days=${days}`),
}

// ── Leave Management ─────────────────────────────────────────────
export const leaveApi = {
  getPolicy:      (rid)            => api.get(`/leave/policy?restaurantId=${rid}`),
  updatePolicy:   (rid, body)      => api.put(`/leave/policy?restaurantId=${rid}`, body),
  getRequests:    (rid, params)    => api.get(`/leave/requests?restaurantId=${rid}${params||''}`),
  applyLeave:     (body)           => api.post('/leave/requests', body),
  approve:        (id, notes)      => api.patch(`/leave/requests/${id}/approve`, { notes }),
  reject:         (id, notes)      => api.patch(`/leave/requests/${id}/reject`, { notes }),
  cancel:         (id)             => api.patch(`/leave/requests/${id}/cancel`),
  getCalendar:    (rid, year, mon) => api.get(`/leave/calendar?restaurantId=${rid}&year=${year}&month=${mon}`),
  getBalance:     (rid, year)      => api.get(`/leave/balance?restaurantId=${rid}&year=${year}`),
  getPendingCount:(rid)            => api.get(`/leave/pending-count?restaurantId=${rid}`),
}

// ── Plans ─────────────────────────────────────────────────────────
export const plansApi = {
  getActive: () => api.get('/plans'),
  getAll:    () => api.get('/plans/all'),
}

// ── Discounts ─────────────────────────────────────────────────────
export const discountApi = {
  getAll:  (rid)        => api.get(`/discounts?restaurantId=${rid}`),
  create:  (body)       => api.post('/discounts', body),
  update:  (id, body)   => api.put(`/discounts/${id}`, body),
  delete:  (id)         => api.delete(`/discounts/${id}`),
}

// ── Coupons ───────────────────────────────────────────────────────
export const couponApi = {
  getAll:       (rid, activeOnly = false) => api.get(`/coupons?restaurantId=${rid}&activeOnly=${activeOnly}`),
  create:       (body)                    => api.post('/coupons', body),
  update:       (id, body)               => api.put(`/coupons/${id}`, body),
  toggleActive: (id, active)             => api.patch(`/coupons/${id}/active?active=${active}`),
  delete:       (id)                     => api.delete(`/coupons/${id}`),
}

// ── Chatbot ───────────────────────────────────────────────────────
export const chatbotApi = {
  getConfig:         (rid)             => api.get(`/chatbot/${rid}/config`),
  updateConfig:      (rid, body)       => api.put(`/chatbot/${rid}/config`, body),
  getPublicConfig:   (rid)             => api.get(`/chatbot/${rid}/config/public`),
  sendMessage:       (rid, body)       => api.post(`/chatbot/${rid}/message`, body),
  getSessions:       (rid, page = 0)   => api.get(`/chatbot/${rid}/sessions?page=${page}`),
  getSessionMessages:(rid, sessionId)  => api.get(`/chatbot/${rid}/sessions/${sessionId}`),
  getStats:          (rid)             => api.get(`/chatbot/${rid}/stats`),
  // Add-on packs
  getAddonPacks:     (rid)             => api.get(`/chatbot/${rid}/addon/packs`),
  createAddonOrder:  (rid, packType)   => api.post(`/chatbot/${rid}/addon/order`, { packType }),
  verifyAddon:       (body)            => api.post('/chatbot/addon/verify', body),
  getAddonHistory:   (rid)             => api.get(`/chatbot/${rid}/addon/history`),
}

// ── Referral ───────────────────────────────────────────────────────
export const referralApi = {
  getStats: (rid)  => api.get(`/referral/${rid}/stats`),
  apply:    (rid, referralCode) => api.post('/referral/apply', { referralCode, newRestaurantId: rid }),
}

// ── Feature Add-on Shop ────────────────────────────────────────────
export const featureAddonApi = {
  getAddons:   (rid)                        => api.get(`/feature-addons/${rid}`),
  getActive:   (rid)                        => api.get(`/feature-addons/${rid}/active`),
  createOrder: (rid, addonId, billingCycle) => api.post(`/feature-addons/${rid}/order`, { addonId, billingCycle }),
  verify:      (body)                       => api.post('/feature-addons/verify', body),
}

// ── Aggregator (Zomato/Swiggy via UrbanPiper) ─────────────────────
export const aggregatorApi = {
  getConfig:  (rid)        => api.get(`/aggregator/${rid}/config`),
  saveConfig: (rid, body)  => api.put(`/aggregator/${rid}/config`, body),
}

// ── GST Reports ────────────────────────────────────────────────────
export const gstApi = {
  monthly: (rid, year, month) => api.get(`/gst/${rid}/monthly?year=${year}&month=${month}`),
  range:   (rid, from, to)   => api.get(`/gst/${rid}/range?from=${from}&to=${to}`),
}

// ── Kitchen Display ────────────────────────────────────────────────
export const kitchenApi = {
  getOrders:    (rid)                  => api.get(`/kitchen?restaurantId=${rid}`),
  accept:       (orderId, chefName)    => api.post(`/kitchen/accept?orderId=${orderId}&chefName=${encodeURIComponent(chefName)}`),
  updateStatus: (orderId, status)      => api.post(`/kitchen/status?orderId=${orderId}&status=${status}`),
}

// ── Direct Aggregator (Zomato/Swiggy direct) ──────────────────────
export const directAggregatorApi = {
  getConfig:  (rid)       => api.get(`/direct-aggregator/${rid}/config`),
  saveConfig: (rid, body) => api.put(`/direct-aggregator/${rid}/config`, body),
}

// ── Reservations ──────────────────────────────────────────────────
export const reservationApi = {
  getByDate:    (date)           => api.get(`/reservations?date=${date}`),
  getUpcoming:  (page=0,size=20) => api.get(`/reservations?page=${page}&size=${size}`),
  getSummary:   (date)           => api.get(`/reservations/summary?date=${date}`),
  create:       (body)           => api.post('/reservations', body),
  update:       (id, body)       => api.put(`/reservations/${id}`, body),
  changeStatus: (id, status)     => api.patch(`/reservations/${id}/status`, { status }),
  cancel:       (id)             => api.delete(`/reservations/${id}`),
}

// ── SMS Marketing ─────────────────────────────────────────────────
export const smsApi = {
  list:    (page = 0, size = 20)        => api.get(`/sms-campaigns?page=${page}&size=${size}`),
  create:  (body)                        => api.post('/sms-campaigns', body),
  preview: (segment, param)              => api.get(`/sms-campaigns/preview?segment=${segment}${param != null ? '&segmentParam=' + param : ''}`),
  send:    (id)                          => api.post(`/sms-campaigns/${id}/send`, {}),
  remove:  (id)                          => api.delete(`/sms-campaigns/${id}`),
  config:  ()                            => api.get('/sms-campaigns/config'),
}

// ── General Reports ────────────────────────────────────────────────
export const reportApi = {
  salesSummary:    (from, to)           => api.get(`/reports/sales/summary?from=${from}&to=${to}`),
  salesDaily:      (from, to)           => api.get(`/reports/sales/daily?from=${from}&to=${to}`),
  salesHourly:     (from, to)           => api.get(`/reports/sales/hourly?from=${from}&to=${to}`),
  topItems:        (from, to, limit=20) => api.get(`/reports/items?from=${from}&to=${to}&limit=${limit}`),
  staffAttendance: (from, to)           => api.get(`/reports/staff/attendance?from=${from}&to=${to}`),
  staffPerformance:(from, to)           => api.get(`/reports/staff/performance?from=${from}&to=${to}`),
  pnl:             (from, to)           => api.get(`/reports/pnl?from=${from}&to=${to}`),
  foodCost:        (from, to)           => api.get(`/reports/food-cost?from=${from}&to=${to}`),
  foodCostCalculator: (from, to, aggregatorPct = 0) =>
    api.get(`/reports/food-cost-calculator?from=${from}&to=${to}&aggregatorPct=${aggregatorPct}`),
}

// ── Gift Cards ────────────────────────────────────────────────────
export const giftCardApi = {
  issue:        (body)               => api.post('/gift-cards', body),
  balance:      (code)               => api.get(`/gift-cards/${code}/balance`),
  redeem:       (code, amount)       => api.post(`/gift-cards/${code}/redeem`, { amount }),
  list:         (page=0, size=20)    => api.get(`/gift-cards?page=${page}&size=${size}`),
  cancel:       (id)                 => api.delete(`/gift-cards/${id}`),
}

// ── CFD ───────────────────────────────────────────────────────────
export const cfdApi = {
  update: (items, subtotal, discount, total) =>
    api.post('/cfd/update', { items, subtotal, discount, total }),
  clear: () => api.delete('/cfd/clear'),
}

// ── Aggregator Reconciliation ─────────────────────────────────────
export const reconciliationApi = {
  list:         ()                    => api.get('/aggregator-reconciliation'),
  byPlatform:   (platform)            => api.get(`/aggregator-reconciliation/platform/${platform}`),
  markReviewed: (id, notes)           => api.patch(`/aggregator-reconciliation/${id}/reviewed`, { notes }),
  upload: (platform, period, file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('platform', platform)
    fd.append('period', period)
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (typeof window !== 'undefined' && window.__VITE_API_URL__)
      || import.meta.env.VITE_API_URL
      || 'http://localhost:2026'
    return fetch(`${base}/api/v1/aggregator-reconciliation/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }).then(async r => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.statusText) }
      return r.json()
    })
  },
}

// ── ONDC Config ──────────────────────────────────────────────────
export const ondcApi = {
  getConfig:  ()     => api.get('/ondc/admin/config'),
  saveConfig: (body) => api.post('/ondc/admin/config', body),
}

// ── EDC Terminals ────────────────────────────────────────────────
export const edcApi = {
  getTerminals:    ()          => api.get('/edc/terminals'),
  createTerminal:  (body)      => api.post('/edc/terminals', body),
  updateTerminal:  (id, body)  => api.put(`/edc/terminals/${id}`, body),
  deleteTerminal:  (id)        => api.delete(`/edc/terminals/${id}`),
  initiatePayment: (id, body)  => api.post(`/edc/terminals/${id}/initiate`, body),
  getTransactions: ()          => api.get('/edc/transactions'),
}

// ── Menu Sync (SUPER_ADMIN) ───────────────────────────────────────
export const menuSyncApi = {
  getRestaurants:  ()                         => api.get('/admin/menu-sync/restaurants'),
  preview:         (sourceId)                 => api.get(`/admin/menu-sync/preview/${sourceId}`),
  syncMenu:        (sourceId, targetId)       => api.post(`/admin/menu-sync/${sourceId}/to/${targetId}`),
}

// ── Customer Segmentation ─────────────────────────────────────────
export const segmentApi = {
  runSegmentation: ()    => api.post('/customers/segment/run'),
  getStats:        (rid) => api.get(`/customers/segment/stats?restaurantId=${rid}`),
}

// ── Franchise Royalty ─────────────────────────────────────────────
export const franchiseApi = {
  configure:    (body)               => api.put('/franchise/configure', body),
  getConfig:    ()                   => api.get('/franchise/config'),
  generate:     (period)             => api.post(`/franchise/generate?period=${period}`),
  markPaid:     (id, notes)          => api.patch(`/franchise/${id}/paid`, { notes }),
  history:      (page=0, size=12)    => api.get(`/franchise/history?page=${page}&size=${size}`),
  summary:      ()                   => api.get('/franchise/summary'),
  brandReports: (brandName)          => api.get(`/franchise/brand/${brandName}`),
}

// ── KOT Printers ─────────────────────────────────────────────────
export const kotPrinterApi = {
  list:   ()          => api.get('/kot-printers'),
  create: (body)      => api.post('/kot-printers', body),
  update: (id, body)  => api.put(`/kot-printers/${id}`, body),
  delete: (id)        => api.delete(`/kot-printers/${id}`),
}

// ── Social Media Marketing ────────────────────────────────────────
export const socialApi = {
  getConfig:   (restaurantId) => api.get(`/social/config?restaurantId=${restaurantId}`),
  updateConfig:(restaurantId, data) => api.put(`/social/config?restaurantId=${restaurantId}`, data),
  getPosts:    (restaurantId) => api.get(`/social/posts?restaurantId=${restaurantId}`),
  createPost:  (restaurantId, data) => api.post(`/social/posts?restaurantId=${restaurantId}`, data),
  publishPost: (restaurantId, postId) => api.post(`/social/posts/${postId}/publish?restaurantId=${restaurantId}`, {}),
  deletePost:  (restaurantId, postId) => api.delete(`/social/posts/${postId}?restaurantId=${restaurantId}`),
}

// ── Delivery Zones ────────────────────────────────────────────────
export const deliveryZoneApi = {
  list:   ()          => api.get('/delivery-zones'),
  create: (body)      => api.post('/delivery-zones', body),
  update: (id, body)  => api.put(`/delivery-zones/${id}`, body),
  delete: (id)        => api.delete(`/delivery-zones/${id}`),
  check:  (distanceKm) => api.post('/delivery-zones/check', { distanceKm }),
}

// ── Pre-Orders ────────────────────────────────────────────────────
export const preOrderApi = {
  list:         (status)      => api.get(`/pre-orders${status ? `?status=${status}` : ''}`),
  create:       (body)        => api.post('/pre-orders', body),
  updateStatus: (id, status)  => api.put(`/pre-orders/${id}/status`, { status }),
  cancel:       (id)          => api.delete(`/pre-orders/${id}`),
}

// ── Stock Transfer ────────────────────────────────────────────────
export const stockTransferApi = {
  list:         ()          => api.get('/stock-transfers'),
  create:       (body)      => api.post('/stock-transfers', body),
  updateStatus: (id, status) => api.put(`/stock-transfers/${id}/status`, { status }),
}

// ── Stock Audit ───────────────────────────────────────────────────
export const stockAuditApi = {
  list:        ()                    => api.get('/stock-audits'),
  create:      (body)                => api.post('/stock-audits', body),
  get:         (id)                  => api.get(`/stock-audits/${id}`),
  updateItem:  (id, itemId, physicalQty) => api.put(`/stock-audits/${id}/items/${itemId}`, { physicalQty }),
  complete:    (id)                  => api.post(`/stock-audits/${id}/complete`),
  cancel:      (id)                  => api.delete(`/stock-audits/${id}`),
}

// ── QR Payment (PayTM / PhonePe) ──────────────────────────────────
export const qrPaymentApi = {
  list:        ()          => api.get('/qr-payment/configs'),
  save:        (body)      => api.post('/qr-payment/configs', body),
  delete:      (id)        => api.delete(`/qr-payment/configs/${id}`),
  generateQr:  (body)      => api.post('/qr-payment/generate-qr', body),
}

// ── Push Notifications ────────────────────────────────────────────
export const pushApi = {
  getTokens:  ()          => api.get('/push/tokens'),
  getLogs:    ()          => api.get('/push/logs'),
  send:       (body)      => api.post('/push/send', body),
  deleteToken:(token)     => api.delete(`/push/tokens/${encodeURIComponent(token)}`),
}

// ── Reports (new) ─────────────────────────────────────────────────
export const reportsExtApi = {
  cashFlow:        (from, to) => api.get(`/reports/cash-flow?from=${from}&to=${to}`),
  menuEngineering: (from, to) => api.get(`/reports/menu-engineering?from=${from}&to=${to}`),
  staffPerformance:(from, to) => api.get(`/reports/staff/performance?from=${from}&to=${to}`),
}

// ── Review Management ─────────────────────────────────────────────
export const reviewApi = {
  list:     (platform, rating) => api.get(`/reviews${platform ? `?platform=${platform}` : ''}${rating ? `${platform ? '&' : '?'}rating=${rating}` : ''}`),
  add:      (body)             => api.post('/reviews', body),
  reply:    (id, reply)        => api.put(`/reviews/${id}/reply`, { reply }),
  delete:   (id)               => api.delete(`/reviews/${id}`),
  stats:    ()                 => api.get('/reviews/stats'),
  sync:     (platform)         => api.post(`/reviews/sync/${platform}`),
}

// ── Predictive Analytics ──────────────────────────────────────────
export const predictiveApi = {
  sales:         (days = 7) => api.get(`/analytics/predictions/sales?days=${days}`),
  busyHours:     ()         => api.get('/analytics/predictions/busy-hours'),
  inventoryRisk: ()         => api.get('/analytics/predictions/inventory-risk'),
}

// ── Combo Builder ─────────────────────────────────────────────────
export const comboApi = {
  list:   ()                  => api.get('/combos'),
  create: (body)              => api.post('/combos', body),
  update: (id, body)          => api.put(`/combos/${id}`, body),
  delete: (id)                => api.delete(`/combos/${id}`),
}

// ── Cash Drawer ───────────────────────────────────────────────────
export const cashDrawerApi = {
  current:   ()                    => api.get('/cash-drawer/current'),
  open:      (body)                => api.post('/cash-drawer/open', body),
  close:     (body)                => api.post('/cash-drawer/close', body),
  sessions:  ()                    => api.get('/cash-drawer/sessions'),
  entries:   (sessionId)           => api.get(`/cash-drawer/sessions/${sessionId}/entries`),
  addEntry:  (sid, body)           => api.post(`/cash-drawer/sessions/${sid}/entries`, body),
  reconcile: (sessionId)           => api.get(`/cash-drawer/sessions/${sessionId}/reconcile`),
}

// ── Course Management ─────────────────────────────────────────────
export const courseApi = {
  list:   ()              => api.get('/courses'),
  create: (body)          => api.post('/courses', body),
  update: (id, body)      => api.put(`/courses/${id}`, body),
  delete: (id)            => api.delete(`/courses/${id}`),
}

// ── Dunzo Integration ─────────────────────────────────────────────
export const dunzoApi = {
  getConfig:      ()       => api.get('/dunzo/config'),
  updateConfig:   (body)   => api.put('/dunzo/config', body),
  getDeliveries:  ()       => api.get('/dunzo/deliveries'),
  createDelivery: (body)   => api.post('/dunzo/deliveries', body),
}

// ── Expiry Tracking ───────────────────────────────────────────────
export const expiryApi = {
  all:        ()            => api.get('/inventory/batches'),
  expiring:   (days)        => api.get(`/inventory/batches/expiring?days=${days}`),
  byMaterial: (matId)       => api.get(`/inventory/batches/material/${matId}`),
  add:        (body)        => api.post('/inventory/batches', body),
  update:     (id, body)    => api.put(`/inventory/batches/${id}`, body),
  expire:     (id)          => api.post(`/inventory/batches/${id}/expire`),
}

// ── Vendor Price Comparison ───────────────────────────────────────
export const vendorApi = {
  all:     ()       => api.get('/vendors/prices'),
  compare: (matId)  => api.get(`/vendors/prices/compare/${matId}`),
  vendors: ()       => api.get('/vendors/prices/vendors'),
  add:     (body)   => api.post('/vendors/prices', body),
}

// ── Staff Training ────────────────────────────────────────────────
export const trainingApi = {
  modules:        ()              => api.get('/training/modules'),
  createModule:   (body)          => api.post('/training/modules', body),
  updateModule:   (id, body)      => api.put(`/training/modules/${id}`, body),
  deleteModule:   (id)            => api.delete(`/training/modules/${id}`),
  staffProgress:  (staffId)       => api.get(`/training/progress/staff/${staffId}`),
  updateProgress: (body)          => api.post('/training/progress', body),
}

// ── Abandoned Cart ────────────────────────────────────────────────
export const abandonedCartApi = {
  stats:   ()              => api.get('/abandoned-carts/stats'),
  list:    (pending)       => api.get(`/abandoned-carts?pending=${pending}`),
  create:  (body)          => api.post('/abandoned-carts', body),
  recover: (id)            => api.post(`/abandoned-carts/${id}/recover`),
  remind:  (id)            => api.post(`/abandoned-carts/${id}/remind`),
}

// ── NPS ───────────────────────────────────────────────────────────
export const npsApi = {
  stats:   ()      => api.get('/nps/stats'),
  entries: ()      => api.get('/nps/entries'),
  submit:  (body)  => api.post('/nps/submit', body),
}

// ── UPI Loyalty ───────────────────────────────────────────────────
export const upiLoyaltyApi = {
  getConfig:    ()        => api.get('/upi-loyalty/config'),
  updateConfig: (body)    => api.put('/upi-loyalty/config', body),
  balance:      (phone)   => api.get(`/upi-loyalty/balance?phone=${encodeURIComponent(phone)}`),
  transactions: (phone)   => api.get(`/upi-loyalty/transactions${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`),
  earn:         (body)    => api.post('/upi-loyalty/earn', body),
  redeem:       (body)    => api.post('/upi-loyalty/redeem', body),
}

// ── Extended Reports ──────────────────────────────────────────────
export const extReportsApi = {
  paymentModes:     (from, to) => api.get(`/reports/payment-modes?from=${from}&to=${to}`),
  waiterSales:      (from, to) => api.get(`/reports/waiter-sales?from=${from}&to=${to}`),
  tableRevenue:     (from, to) => api.get(`/reports/table-revenue?from=${from}&to=${to}`),
  discounts:        (from, to) => api.get(`/reports/discounts?from=${from}&to=${to}`),
  gstSummary:       (from, to) => api.get(`/reports/gst-summary?from=${from}&to=${to}`),
  customerInsights: (from, to) => api.get(`/reports/customer-insights?from=${from}&to=${to}`),
  stockValuation:   ()         => api.get('/reports/stock-valuation'),
  tips:             (from, to) => api.get(`/reports/tips?from=${from}&to=${to}`),
}

// ── Token Queue ───────────────────────────────────────────────────
export const tokenQueueApi = {
  getQueue:     (rid)        => api.get(`/tokens/`),
  issue:        (rid, body)  => api.post('/tokens/issue', body),
  callNext:     (rid)        => api.post('/tokens/call-next', {}),
  callNumber:   (rid, num)   => api.post(`/tokens/call/${num}`, {}),
  complete:     (rid, num)   => api.post(`/tokens/${num}/complete`, {}),
  skip:         (rid, num)   => api.post(`/tokens/${num}/skip`, {}),
  reset:        (rid)        => api.post('/tokens/reset', {}),
  updateConfig: (rid, body)  => api.put('/tokens/config', body),
  history:      (rid)        => api.get('/tokens/history'),
}

// ── KOT Print Jobs ────────────────────────────────────────────────
export const kotPrintJobApi = {
  pending: (rid)           => api.get('/kot-print-jobs/pending'),
  history: (rid)           => api.get('/kot-print-jobs/history'),
  done:    (rid, id)       => api.put(`/kot-print-jobs/${id}/done`, {}),
  failed:  (rid, id, body) => api.put(`/kot-print-jobs/${id}/failed`, body),
  trigger: (rid, body)     => api.post('/kot-print-jobs/trigger', body),
}

// ── Export API ───────────────────────────────────────────────────
export const exportApi = {
  bills: (from, to) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    return fetch(`${base}/export/bills?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  },
  menu: () => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    return fetch(`${base}/export/menu`, { headers: { Authorization: `Bearer ${token}` } })
  },
  customers: () => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    return fetch(`${base}/export/customers`, { headers: { Authorization: `Bearer ${token}` } })
  },
  rawMaterials: () => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    return fetch(`${base}/export/raw-materials`, { headers: { Authorization: `Bearer ${token}` } })
  },
  staff: () => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    return fetch(`${base}/export/staff`, { headers: { Authorization: `Bearer ${token}` } })
  },
}

// ── Data Import API ───────────────────────────────────────────────
export const dataImportApi = {
  importRawMaterials: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData()
    fd.append('file', file)
    fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/raw-materials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
  },
  importCustomers: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData()
    fd.append('file', file)
    fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/customers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
  },
  importCategories: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData(); fd.append('file', file); fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/categories`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  },
  importRmCategories: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData(); fd.append('file', file); fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/rm-categories`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  },
  importUnits: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData(); fd.append('file', file); fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/units`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  },
  importTables: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData(); fd.append('file', file); fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/tables`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  },
  importAreas: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData(); fd.append('file', file); fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/areas`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  },
  importProducts: (file, restaurantId) => {
    const token = localStorage.getItem('harmoney_token') || ''
    const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
    const fd = new FormData(); fd.append('file', file); fd.append('restaurantId', restaurantId)
    return fetch(`${base}/import/products`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  },
}

// ── Google Food Ordering ──────────────────────────────────────────
export const googleFoodApi = {
  getConfig:    (rid)       => api.get('/google-food/config'),
  updateConfig: (rid, body) => api.put('/google-food/config', body),
  getOrders:    (rid)       => api.get('/google-food/orders'),
}

// ── Cameras ───────────────────────────────────────────────────────
export const cameraApi = {
  list:   (rid)           => api.get('/cameras/'),
  create: (rid, body)     => api.post('/cameras/', body),
  update: (rid, id, body) => api.put(`/cameras/${id}`, body),
  delete: (rid, id)       => api.delete(`/cameras/${id}`),
}

// ── Table Operations ──────────────────────────────────────────────
export const tableOpsApi = {
  merge: (rid, fromId, toId) => api.post(`/tables/merge?fromTableId=${fromId}&toTableId=${toId}`, {}),
  split: (rid, id)           => api.post(`/tables/${id}/split`, {}),
}

// ── FSSAI Compliance ──────────────────────────────────────────────
export const fssaiApi = {
  dashboard:       ()          => api.get('/fssai/dashboard'),
  getDashboard:    ()          => api.get('/fssai/dashboard'),
  getLicense:      ()          => api.get('/fssai/license'),
  saveLicense:     (body)      => api.put('/fssai/license', body),
  getTempLogs:     (days = 7)  => api.get(`/fssai/temperature?days=${days}`),
  logTemp:         (body)      => api.post('/fssai/temperature', body),
  logTemperature:  (body)      => api.post('/fssai/temperature', body),
  getCleaningLogs: (days = 7)  => api.get(`/fssai/cleaning?days=${days}`),
  logCleaning:     (body)      => api.post('/fssai/cleaning', body),
  getChecklist:    ()          => api.get('/fssai/audit/checklist'),
  startAudit:      (body)      => api.post('/fssai/audit/start', body),
  updateAudit:     (id, items) => api.put(`/fssai/audit/${id}`, items),
  completeAudit:   (id)        => api.post(`/fssai/audit/${id}/complete`, {}),
  getAudit:        (id)        => api.get(`/fssai/audit/${id}`),
  getAuditSession: (id)        => api.get(`/fssai/audit/${id}`),
  getAuditHistory: ()          => api.get('/fssai/audit/history'),
  getStaffHealth:  ()          => api.get('/fssai/staff-health'),
  saveStaffHealth: (body)      => api.post('/fssai/staff-health', body),
}
