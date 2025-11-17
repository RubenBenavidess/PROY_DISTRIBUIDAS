import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../../store/authStore'
import * as api from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn()
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset the store
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setAuthenticated(false)
    })
  })

  it('should initialize with not authenticated', () => {
    const { result } = renderHook(() => useAuthStore())
    
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should mark as authenticated when login succeeds', async () => {
    api.adminLogin.mockResolvedValue({ success: true })
    
    const { result } = renderHook(() => useAuthStore())
    
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should clear authentication on logout', async () => {
    api.adminLogin.mockResolvedValue({ success: true })
    api.adminLogout.mockResolvedValue({ success: true })
    
    const { result } = renderHook(() => useAuthStore())
    
    // First login
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    
    expect(result.current.isAuthenticated).toBe(true)
    
    // Then logout
    await act(async () => {
      await result.current.logout()
    })
    
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should allow setting authentication state directly', () => {
    const { result } = renderHook(() => useAuthStore())
    
    act(() => {
      result.current.setAuthenticated(true)
    })
    
    expect(result.current.isAuthenticated).toBe(true)
    
    act(() => {
      result.current.setAuthenticated(false)
    })
    
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle multiple login/logout cycles', async () => {
    api.adminLogin.mockResolvedValue({ success: true })
    api.adminLogout.mockResolvedValue({ success: true })
    
    const { result } = renderHook(() => useAuthStore())
    
    // First login
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    expect(result.current.isAuthenticated).toBe(true)
    
    // Logout
    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.isAuthenticated).toBe(false)
    
    // Second login
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should handle login failure', async () => {
    api.adminLogin.mockRejectedValue(new Error('Invalid credentials'))
    
    const { result } = renderHook(() => useAuthStore())
    
    await act(async () => {
      try {
        await result.current.login({ username: 'wrong', password: 'wrong' })
      } catch (error) {
        // Expected to throw
      }
    })
    
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle logout failure gracefully', async () => {
    api.adminLogin.mockResolvedValue({ success: true })
    api.adminLogout.mockRejectedValue(new Error('Server error'))
    
    const { result } = renderHook(() => useAuthStore())
    
    // Login first
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    expect(result.current.isAuthenticated).toBe(true)
    
    // Logout should clear state even if API fails
    await act(async () => {
      await result.current.logout()
    })
    
    expect(result.current.isAuthenticated).toBe(false)
  })
})
