// src/store/authStore.js
import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  token:        localStorage.getItem('harmoney_token') || '',
  user:         JSON.parse(localStorage.getItem('harmoney_user') || 'null'),
  restaurantId: Number(localStorage.getItem('harmoney_rid') || '1'),
  planType:     localStorage.getItem('harmoney_plan') || 'FREE',

  login: (token, user, rid) => {
    const plan = user?.planType || 'FREE'
    localStorage.setItem('harmoney_token', token)
    localStorage.setItem('harmoney_user', JSON.stringify(user))
    localStorage.setItem('harmoney_rid', rid)
    localStorage.setItem('harmoney_plan', plan)
    set({ token, user, restaurantId: Number(rid), planType: plan })
  },

  setPlanType: (plan) => {
    localStorage.setItem('harmoney_plan', plan)
    set({ planType: plan })
  },

  logout: () => {
    localStorage.removeItem('harmoney_token')
    localStorage.removeItem('harmoney_user')
    localStorage.removeItem('harmoney_rid')
    localStorage.removeItem('harmoney_plan')
    set({ token: '', user: null, restaurantId: 1, planType: 'FREE' })
  },

  isLoggedIn: () => !!localStorage.getItem('harmoney_token'),
}))
