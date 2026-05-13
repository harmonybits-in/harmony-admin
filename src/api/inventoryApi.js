// src/api/inventoryApi.js
// Inventory Management — complete API client
// Base: /api/v1/inv
// Auth: Bearer token from authStore

import { useAuthStore } from '../store/authStore'

const BASE = '/api/v1/inv'

function token() {
  return useAuthStore.getState().token
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(err || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

const get    = (path)        => req('GET',    path)
const post   = (path, body)  => req('POST',   path, body)
const put    = (path, body)  => req('PUT',    path, body)
const patch  = (path, body)  => req('PATCH',  path, body)
const del    = (path)        => req('DELETE', path)

// ── Raw Materials ─────────────────────────────────────────────────
export const rawMaterialApi = {
  getAll: (rid, { category, search, page = 0, size = 50 } = {}) => {
    const params = new URLSearchParams({ restaurantId: rid, page, size })
    if (category) params.set('category', category)
    if (search)   params.set('search', search)
    return get(`/raw-materials?${params}`)
  },

  getOne: (id) => get(`/raw-materials/${id}`),

  create: (data) => post('/raw-materials', data),

  update: (id, data) => put(`/raw-materials/${id}`, data),

  delete: (id) => del(`/raw-materials/${id}`),

  toggleActive: (id, active) =>
    patch(`/raw-materials/${id}/active?active=${active}`),

  toggleFavourite: (id, favourite) =>
    patch(`/raw-materials/${id}/favourite?favourite=${favourite}`),
}

// ── Units ─────────────────────────────────────────────────────────
export const unitApi = {
  getAll: (rid, search) => {
    const params = new URLSearchParams({ restaurantId: rid })
    if (search) params.set('search', search)
    return get(`/units?${params}`)
  },

  create: (data) => post('/units', data),

  update: (id, data) => put(`/units/${id}`, data),

  delete: (id) => del(`/units/${id}`),
}

// ── Suppliers ─────────────────────────────────────────────────────
export const supplierApi = {
  getAll: (rid) => get(`/suppliers?restaurantId=${rid}`),

  create: (data) => post('/suppliers', data),

  update: (id, data) => put(`/suppliers/${id}`, data),

  delete: (id) => del(`/suppliers/${id}`),
}

// ── Stock Purchases ───────────────────────────────────────────────
export const purchaseApi = {
  getAll: (rid, { startDate, endDate, status, from, page = 0, size = 20 } = {}) => {
    const params = new URLSearchParams({ restaurantId: rid, page, size })
    if (startDate) params.set('startDate', startDate)
    if (endDate)   params.set('endDate',   endDate)
    if (status)    params.set('status',    status)
    if (from)      params.set('from',      from)
    return get(`/purchases?${params}`)
  },

  getOne: (id) => get(`/purchases/${id}`),

  create: (data) => post('/purchases', data),

  update: (id, data) => put(`/purchases/${id}`, data),

  updateStatus: (id, status) =>
    patch(`/purchases/${id}/status?status=${status}`),

  getStats: (rid, startDate, endDate) => {
    const params = new URLSearchParams({ restaurantId: rid })
    if (startDate) params.set('startDate', startDate)
    if (endDate)   params.set('endDate',   endDate)
    return get(`/purchases/stats?${params}`)
  },
}

// ── Purchase Orders ───────────────────────────────────────────────
export const purchaseOrderApi = {
  getAll: (rid, { startDate, endDate, status, page = 0, size = 20 } = {}) => {
    const params = new URLSearchParams({ restaurantId: rid, page, size })
    if (startDate) params.set('startDate', startDate)
    if (endDate)   params.set('endDate',   endDate)
    if (status)    params.set('status',    status)
    return get(`/purchase-orders?${params}`)
  },

  create: (data) => post('/purchase-orders', data),

  update: (id, data) => put(`/purchase-orders/${id}`, data),

  updateStatus: (id, status) =>
    patch(`/purchase-orders/${id}/status?status=${status}`),
}

// ── Item Recipes ──────────────────────────────────────────────────
export const recipeApi = {
  getAll: (rid, { category, hasRecipe, page = 0, size = 50 } = {}) => {
    const params = new URLSearchParams({ restaurantId: rid, page, size })
    if (category  !== undefined) params.set('category',  category)
    if (hasRecipe !== undefined) params.set('hasRecipe', hasRecipe)
    return get(`/recipes?${params}`)
  },

  create: (data) => post('/recipes', data),

  update: (id, data) => put(`/recipes/${id}`, data),

  delete: (id) => del(`/recipes/${id}`),
}

// ── Raw Material Categories ──────────────────────────────────────
export const categoryApi = {
  // GET /api/v1/inv/categories?restaurantId=1
  getAll: (rid) =>
    get(`/categories?restaurantId=${rid}`),

  // POST /api/v1/inv/categories
  create: (rid, name, color) =>
    post('/categories', { name, color, restaurantId: rid }),

  // PUT /api/v1/inv/categories/{id}
  update: (id, name, color) =>
    put(`/categories/${id}`, { name, color }),

  // DELETE /api/v1/inv/categories/{id}
  delete: (id) =>
    del(`/categories/${id}`),
}

// ── Existing Inventory (stock) ────────────────────────────────────
// Reusing existing /api/v1/inventory endpoints
export const stockApi = {
  getAll:      (rid) => fetch(`/api/v1/inventory?restaurantId=${rid}`,
    { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),

  getLowStock: (rid) => fetch(`/api/v1/inventory/low-stock?restaurantId=${rid}`,
    { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),

  addStock:    (data) => req('POST', '/api/v1/inventory/add'.replace('/api/v1/inv',''), data),
  deductStock: (data) => req('POST', '/api/v1/inventory/deduct'.replace('/api/v1/inv',''), data),
}
