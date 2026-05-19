// src/api/client.js
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToken() {
  return localStorage.getItem('harmoney_token') || ''
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
  if (res.status === 401) {
    localStorage.removeItem('harmoney_token')
    window.location.href = '/login'
    return null
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

// ── General Reports ────────────────────────────────────────────────
export const reportApi = {
  salesSummary:    (from, to)           => api.get(`/reports/sales/summary?from=${from}&to=${to}`),
  salesDaily:      (from, to)           => api.get(`/reports/sales/daily?from=${from}&to=${to}`),
  salesHourly:     (from, to)           => api.get(`/reports/sales/hourly?from=${from}&to=${to}`),
  topItems:        (from, to, limit=20) => api.get(`/reports/items?from=${from}&to=${to}&limit=${limit}`),
  staffAttendance: (from, to)           => api.get(`/reports/staff/attendance?from=${from}&to=${to}`),
  staffPerformance:(from, to)           => api.get(`/reports/staff/performance?from=${from}&to=${to}`),
  pnl:             (from, to)           => api.get(`/reports/pnl?from=${from}&to=${to}`),
}
