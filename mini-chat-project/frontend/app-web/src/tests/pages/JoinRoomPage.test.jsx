import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import JoinRoomPage from '../../pages/JoinRoomPage'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('JoinRoomPage', () => {
  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render page title', () => {
    renderWithRouter(<JoinRoomPage />)
    expect(screen.getByText(/unirse.*sala/i)).toBeInTheDocument()
  })

  it('should render room ID input', () => {
    renderWithRouter(<JoinRoomPage />)
    expect(screen.getByPlaceholderText(/ID de la sala/i)).toBeInTheDocument()
  })

  it('should render PIN input', () => {
    renderWithRouter(<JoinRoomPage />)
    expect(screen.getByPlaceholderText(/PIN.*dígitos/i)).toBeInTheDocument()
  })

  it('should render nickname input', () => {
    renderWithRouter(<JoinRoomPage />)
    expect(screen.getByPlaceholderText(/alias.*chat/i)).toBeInTheDocument()
  })

  it('should render join button', () => {
    renderWithRouter(<JoinRoomPage />)
    expect(screen.getByRole('button', { name: /entrar.*chat/i })).toBeInTheDocument()
  })

  it('should allow typing in room ID field', () => {
    renderWithRouter(<JoinRoomPage />)
    const input = screen.getByPlaceholderText(/ID de la sala/i)
    fireEvent.change(input, { target: { value: 'ROOM123' } })
    expect(input).toHaveValue('ROOM123')
  })

  it('should allow typing in nickname field', () => {
    renderWithRouter(<JoinRoomPage />)
    const input = screen.getByPlaceholderText(/alias.*chat/i)
    fireEvent.change(input, { target: { value: 'TestUser' } })
    expect(input).toHaveValue('TestUser')
  })

  it('should have submit button', () => {
    renderWithRouter(<JoinRoomPage />)
    const button = screen.getByRole('button', { name: /entrar.*chat/i })
    expect(button).toBeInTheDocument()
  })
})
