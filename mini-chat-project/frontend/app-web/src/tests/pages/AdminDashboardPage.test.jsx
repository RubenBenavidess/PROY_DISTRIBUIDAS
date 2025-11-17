import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboardPage from '../../pages/AdminDashboardPage'
import * as api from '../../services/api'
import * as authStore from '../../store/authStore'

vi.mock('../../services/api')
vi.mock('../../store/authStore')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

describe('AdminDashboardPage', () => {
  const mockRooms = [
    {
      id: 'room1',
      _id: 'room1',
      title: 'General',
      pin: '1234',
      type: 'text/media',
      participants: 5
    },
    {
      id: 'room2',
      _id: 'room2',
      title: 'Random',
      pin: '5678',
      type: 'text',
      participants: 3
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    authStore.useAuthStore.mockImplementation((selector) => {
      if (selector) {
        return selector({ logout: vi.fn() })
      }
      return { logout: vi.fn() }
    })
  })

  it('should render dashboard header', async () => {
    api.getAllRooms.mockResolvedValue(mockRooms)
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Gestión de Salas')).toBeInTheDocument()
    expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument()
  })

  it('should load and display rooms', async () => {
    api.getAllRooms.mockResolvedValue(mockRooms)
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument()
      expect(screen.getByText('Random')).toBeInTheDocument()
    })
  })

  it('should show loading state', () => {
    api.getAllRooms.mockImplementation(() => new Promise(() => {}))
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Cargando salas...')).toBeInTheDocument()
  })

  it('should show error when fetching rooms fails', async () => {
    api.getAllRooms.mockRejectedValue(new Error('Network error'))
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should open create room modal', async () => {
    api.getAllRooms.mockResolvedValue(mockRooms)
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('+ Crear')).toBeInTheDocument()
    })
    
    const createButton = screen.getByText('+ Crear')
    fireEvent.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Crear Nueva Sala')).toBeInTheDocument()
    })
  })

  it('should create new room', async () => {
    api.getAllRooms.mockResolvedValue(mockRooms)
    const newRoom = {
      id: 'room3',
      _id: 'room3',
      title: 'New Room',
      pin: '9999',
      type: 'text',
      participants: 0
    }
    api.createRoom.mockResolvedValue(newRoom)
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('+ Crear')).toBeInTheDocument()
    })
    
    // Open modal
    fireEvent.click(screen.getByText('+ Crear'))
    
    await waitFor(() => {
      expect(screen.getByText('Crear Nueva Sala')).toBeInTheDocument()
    })
    
    // Fill form - using the actual placeholder text
    const input = screen.getByPlaceholderText('Ej: Sala de Reunión')
    fireEvent.change(input, { target: { value: 'New Room' } })
    
    // Submit
    const submitButton = screen.getByText('Crear Sala')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(api.createRoom).toHaveBeenCalledWith({
        title: 'New Room',
        type: 'text'
      })
    })
  })

  it('should select a room when clicked', async () => {
    api.getAllRooms.mockResolvedValue(mockRooms)
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument()
    })
    
    const roomItem = screen.getByText('General').closest('.room-list-item')
    fireEvent.click(roomItem)
    
    // Should show selected state
    expect(roomItem).toHaveClass('selected')
  })

  it('should call logout when logout button clicked', async () => {
    const mockLogout = vi.fn()
    authStore.useAuthStore.mockImplementation((selector) => {
      if (selector) {
        return selector({ logout: mockLogout })
      }
      return { logout: mockLogout }
    })
    
    api.getAllRooms.mockResolvedValue(mockRooms)
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    const logoutButton = screen.getByText('Cerrar Sesión')
    fireEvent.click(logoutButton)
    
    expect(mockLogout).toHaveBeenCalled()
  })

  it('should display room count', async () => {
    api.getAllRooms.mockResolvedValue(mockRooms)
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(`Salas Activas (${mockRooms.length})`)).toBeInTheDocument()
    })
  })

  it('should handle empty room list', async () => {
    api.getAllRooms.mockResolvedValue([])
    
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Salas Activas (0)')).toBeInTheDocument()
    })
  })
})
