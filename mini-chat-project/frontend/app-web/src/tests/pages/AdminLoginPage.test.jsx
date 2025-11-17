import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AdminLoginPage from '../../pages/AdminLoginPage'
import * as api from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  verifySession: vi.fn(),
  adminLogin: vi.fn()
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock verifySession to reject (no active session)
    api.verifySession.mockRejectedValue(new Error('No session'))
  })

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render page title', async () => {
    renderWithRouter(<AdminLoginPage />)
    await waitFor(() => {
      expect(screen.getByText(/panel.*administrador/i)).toBeInTheDocument()
    })
  })

  it('should render username input', async () => {
    renderWithRouter(<AdminLoginPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/tu-usuario/i)).toBeInTheDocument()
    })
  })

  it('should render password input', async () => {
    renderWithRouter(<AdminLoginPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument()
    })
  })

  it('should render login button', async () => {
    renderWithRouter(<AdminLoginPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
    })
  })

  it('should allow typing in username field', async () => {
    renderWithRouter(<AdminLoginPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/tu-usuario/i)).toBeInTheDocument()
    })
    const input = screen.getByPlaceholderText(/tu-usuario/i)
    fireEvent.change(input, { target: { value: 'admin' } })
    expect(input).toHaveValue('admin')
  })

  it('should allow typing in password field', async () => {
    renderWithRouter(<AdminLoginPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument()
    })
    const input = screen.getByPlaceholderText(/••••/)
    fireEvent.change(input, { target: { value: 'password123' } })
    expect(input).toHaveValue('password123')
  })

  it('password input should be type password', async () => {
    renderWithRouter(<AdminLoginPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument()
    })
    const input = screen.getByPlaceholderText(/••••/)
    expect(input).toHaveAttribute('type', 'password')
  })
})
