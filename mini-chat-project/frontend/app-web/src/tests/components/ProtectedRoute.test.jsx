import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import * as authStore from '../../store/authStore'

vi.mock('../../store/authStore')

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to login when not authenticated', () => {
    authStore.useAuthStore.mockImplementation((selector) => 
      selector ? selector({ isAuthenticated: false }) : false
    )
    
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('should render protected content when authenticated', () => {
    authStore.useAuthStore.mockImplementation((selector) => 
      selector ? selector({ isAuthenticated: true }) : true
    )
    
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
