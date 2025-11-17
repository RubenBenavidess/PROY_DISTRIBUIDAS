import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AdminLoginPage from '../../pages/AdminLoginPage'

vi.mock('../../store/useAuthStore', () => ({
  default: vi.fn(() => ({
    login: vi.fn(),
    token: null,
    isAuthenticated: () => false
  }))
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('AdminLoginPage', () => {
  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render page title', () => {
    renderWithRouter(<AdminLoginPage />)
    expect(screen.getByText(/panel.*administrador|admin/i)).toBeInTheDocument()
  })

  it('should render username input', () => {
    renderWithRouter(<AdminLoginPage />)
    expect(screen.getByPlaceholderText(/usuario/i)).toBeInTheDocument()
  })

  it('should render password input', () => {
    renderWithRouter(<AdminLoginPage />)
    expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument()
  })

  it('should render login button', () => {
    renderWithRouter(<AdminLoginPage />)
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
  })

  it('should allow typing in username field', () => {
    renderWithRouter(<AdminLoginPage />)
    const input = screen.getByPlaceholderText(/usuario/i)
    fireEvent.change(input, { target: { value: 'admin' } })
    expect(input).toHaveValue('admin')
  })

  it('should allow typing in password field', () => {
    renderWithRouter(<AdminLoginPage />)
    const input = screen.getByPlaceholderText(/••••/)
    fireEvent.change(input, { target: { value: 'password123' } })
    expect(input).toHaveValue('password123')
  })

  it('password input should be type password', () => {
    renderWithRouter(<AdminLoginPage />)
    const input = screen.getByPlaceholderText(/••••/)
    expect(input).toHaveAttribute('type', 'password')
  })
})
