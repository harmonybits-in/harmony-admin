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
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
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
  getAll:  (rid, params = '') => api.get(`/bills?restaurantId=${rid}&${params}`),
  getById: (id) => api.get(`/bills/${id}`),
  today:   (rid) => api.get(`/bills/today?restaurantId=${rid}`),
  summary: (rid, from, to) => api.get(`/bills/summary?restaurantId=${rid}&from=${from}&to=${to}`),
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
