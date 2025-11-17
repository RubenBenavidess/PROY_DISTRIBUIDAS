import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatRoomPage from '../../pages/ChatRoomPage'
import * as roomStore from '../../store/roomStore'
import * as socketService from '../../services/socketService'

vi.mock('../../store/roomStore')
vi.mock('../../services/socketService')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

describe('ChatRoomPage', () => {
  const mockRoomInfo = {
    id: 'room1',
    title: 'General',
    type: 'text/media',
    pin: '1234'
  }

  const mockMessages = [
    {
      id: 1,
      username: 'User1',
      content: 'Hello!',
      timestamp: '2024-01-01T10:00:00Z',
      contentType: 'text'
    },
    {
      id: 2,
      username: 'User2',
      content: 'Hi there!',
      timestamp: '2024-01-01T10:01:00Z',
      contentType: 'text'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    socketService.socketService = {
      listen: vi.fn(),
      stopListening: vi.fn(),
      leaveRoom: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendFile: vi.fn().mockResolvedValue(undefined)
    }
    
    roomStore.useRoomStore.mockImplementation((selector) => {
      const state = {
        roomInfo: mockRoomInfo,
        messages: mockMessages,
        nickname: 'TestUser',
        hashedNickname: 'abc123def456',
        sessionId: 'session-123',
        isConnected: true,
        addMessage: vi.fn(),
        clearRoom: vi.fn()
      }
      return selector ? selector(state) : state
    })
  })

  it('should render chat room with messages', () => {
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Hello!')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('should render room title', () => {
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('should show attach button for text/media rooms', () => {
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    // MessageInput should receive showAttach=true
    const attachButton = screen.getByText('📎')
    expect(attachButton).toBeInTheDocument()
  })

  it('should not show attach button for text-only rooms', () => {
    roomStore.useRoomStore.mockImplementation((selector) => {
      const state = {
        roomInfo: { ...mockRoomInfo, type: 'text' },
        messages: mockMessages,
        nickname: 'TestUser',
        hashedNickname: 'abc123def456',
        sessionId: 'session-123',
        isConnected: true,
        addMessage: vi.fn(),
        clearRoom: vi.fn()
      }
      return selector ? selector(state) : state
    })
    
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    // MessageInput should NOT receive showAttach for text-only rooms
    const attachButtons = screen.queryAllByText('📎')
    expect(attachButtons).toHaveLength(0)
  })

  it('should listen to socket events on mount', async () => {
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(socketService.socketService.listen).toHaveBeenCalledWith('new-message', expect.any(Function))
      expect(socketService.socketService.listen).toHaveBeenCalledWith('new-file', expect.any(Function))
    })
  })

  it('should cleanup on unmount', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    unmount()
    
    await waitFor(() => {
      expect(socketService.socketService.stopListening).toHaveBeenCalled()
    })
  })

  it('should send message when user types', async () => {
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    const input = screen.getByRole('textbox')
    const form = input.closest('form')
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(socketService.socketService.sendMessage).toHaveBeenCalledWith('Test message')
    })
  })

  it('should return null when roomInfo is not available', () => {
    roomStore.useRoomStore.mockImplementation((selector) => {
      const state = {
        roomInfo: null,
        messages: [],
        nickname: null,
        isConnected: false,
        addMessage: vi.fn(),
        clearRoom: vi.fn()
      }
      return selector ? selector(state) : state
    })
    
    const { container } = render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should handle new message from socket', async () => {
    const mockAddMessage = vi.fn()
    
    roomStore.useRoomStore.mockImplementation((selector) => {
      const state = {
        roomInfo: mockRoomInfo,
        messages: mockMessages,
        nickname: 'TestUser',
        hashedNickname: 'abc123def456',
        sessionId: 'session-123',
        isConnected: true,
        addMessage: mockAddMessage,
        clearRoom: vi.fn()
      }
      return selector ? selector(state) : state
    })
    
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(socketService.socketService.listen).toHaveBeenCalled()
    })
    
    // Get the callback registered with listen
    const listenCalls = socketService.socketService.listen.mock.calls
    const newMessageCall = listenCalls.find(call => call[0] === 'new-message')
    
    if (newMessageCall) {
      const newMessageHandler = newMessageCall[1]
      
      const newMessage = {
        id: 3,
        username: 'User3',
        content: 'New message!',
        timestamp: '2024-01-01T10:02:00Z',
        contentType: 'text'
      }
      
      newMessageHandler(newMessage)
      
      expect(mockAddMessage).toHaveBeenCalledWith(newMessage)
    }
  })

  it('should display user nickname', () => {
    render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    // The nickname is displayed in the aside with " (Tú)"
    expect(screen.getByText(/TestUser/)).toBeInTheDocument()
  })

  it('should scroll to bottom when new message arrives', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    // Update messages
    const newMessages = [...mockMessages, {
      id: 3,
      username: 'User3',
      content: 'Newest message',
      timestamp: '2024-01-01T10:02:00Z',
      contentType: 'text'
    }]
    
    roomStore.useRoomStore.mockImplementation((selector) => {
      const state = {
        roomInfo: mockRoomInfo,
        messages: newMessages,
        nickname: 'TestUser',
        isConnected: true,
        addMessage: vi.fn(),
        clearRoom: vi.fn()
      }
      return selector ? selector(state) : state
    })
    
    rerender(
      <MemoryRouter>
        <ChatRoomPage />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Newest message')).toBeInTheDocument()
    })
  })
})
