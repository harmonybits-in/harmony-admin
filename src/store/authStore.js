// src/store/authStore.js
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('harmoney_token') || '',
  user:  JSON.parse(localStorage.getItem('harmoney_user') || 'null'),
  restaurantId: Number(localStorage.getItem('harmoney_rid') || '1'),

  login: (token, user, rid) => {
    localStorage.setItem('harmoney_token', token)
    localStorage.setItem('harmoney_user', JSON.stringify(user))
    localStorage.setItem('harmoney_rid', rid)
    set({ token, user, restaurantId: Number(rid) })
  },

  logout: () => {
    localStorage.removeItem('harmoney_token')
    localStorage.removeItem('harmoney_user')
    localStorage.removeItem('harmoney_rid')
    set({ token: '', user: null, restaurantId: 1 })
  },

  isLoggedIn: () => !!localStorage.getItem('harmoney_token'),
}))
