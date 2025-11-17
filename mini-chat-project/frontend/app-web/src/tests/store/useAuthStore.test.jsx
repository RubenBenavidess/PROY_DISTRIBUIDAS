import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../../store/authStore'
import * as api from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  adminLogin: vi.fn()
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    
    // Reset the store
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.logout()
    })
  })

  it('should initialize with null token and not authenticated', () => {
    const { result } = renderHook(() => useAuthStore())
    
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should mark as authenticated when login succeeds', async () => {
    const mockToken = 'mock-jwt-token'
    api.adminLogin.mockResolvedValue({ success: true, token: mockToken })
    
    const { result } = renderHook(() => useAuthStore())
    
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.token).toBe(mockToken)
  })

  it('should clear token on logout', async () => {
    const mockToken = 'mock-jwt-token'
    api.adminLogin.mockResolvedValue({ success: true, token: mockToken })
    
    const { result } = renderHook(() => useAuthStore())
    
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    
    expect(result.current.isAuthenticated).toBe(true)
    
    act(() => {
      result.current.logout()
    })
    
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should persist token in localStorage', async () => {
    const mockToken = 'test-jwt-token'
    api.adminLogin.mockResolvedValue({ success: true, token: mockToken })
    
    const { result } = renderHook(() => useAuthStore())
    
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    
    // Check that the state was updated (localStorage is mocked)
    expect(result.current.token).toBe(mockToken)
    expect(result.current.isAuthenticated).toBe(true)
    
    // Verify localStorage.setItem was called
    expect(localStorage.setItem).toHaveBeenCalled()
  })

  it('should handle multiple login/logout cycles', async () => {
    const mockToken1 = 'token1'
    const mockToken2 = 'token2'
    
    const { result } = renderHook(() => useAuthStore())
    
    // First login
    api.adminLogin.mockResolvedValue({ success: true, token: mockToken1 })
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.token).toBe(mockToken1)
    
    // Logout
    act(() => {
      result.current.logout()
    })
    expect(result.current.isAuthenticated).toBe(false)
    
    // Second login
    api.adminLogin.mockResolvedValue({ success: true, token: mockToken2 })
    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pass' })
    })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.token).toBe(mockToken2)
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
    
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})
