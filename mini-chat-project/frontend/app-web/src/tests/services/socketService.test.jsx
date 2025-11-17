import { describe, it, expect, vi, beforeEach } from 'vitest'
import { socketService } from '../../services/socketService'
import { io } from 'socket.io-client'

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn()
}))

describe('SocketService', () => {
  let mockSocket

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      id: 'mock-socket-id'
    }
    io.mockReturnValue(mockSocket)
    socketService.socket = null
  })

  describe('connect', () => {
    it('should connect to socket server', () => {
      socketService.connect()
      
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          path: '/api/socket.io/'
        })
      )
      expect(socketService.socket).toBe(mockSocket)
    })

    it('should set up connection event listeners', () => {
      socketService.connect()
      
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
    })
  })

  describe('disconnect', () => {
    it('should disconnect socket', () => {
      socketService.socket = mockSocket
      socketService.disconnect()
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(socketService.socket).toBeNull()
    })

    it('should handle disconnect when socket is null', () => {
      socketService.socket = null
      expect(() => socketService.disconnect()).not.toThrow()
    })
  })

  describe('listen', () => {
    it('should add event listener', () => {
      socketService.socket = mockSocket
      const callback = vi.fn()
      
      socketService.listen('test-event', callback)
      
      expect(mockSocket.on).toHaveBeenCalledWith('test-event', callback)
    })

    it('should connect if socket is null', () => {
      socketService.socket = null
      const callback = vi.fn()
      
      socketService.listen('test-event', callback)
      
      expect(io).toHaveBeenCalled()
    })
  })

  describe('stopListening', () => {
    it('should remove event listener', () => {
      socketService.socket = mockSocket
      const callback = vi.fn()
      
      socketService.stopListening('test-event', callback)
      
      expect(mockSocket.off).toHaveBeenCalledWith('test-event', callback)
    })

    it('should handle stopListening when socket is null', () => {
      socketService.socket = null
      expect(() => socketService.stopListening('test-event', vi.fn())).not.toThrow()
    })
  })

  describe('emit', () => {
    it('should emit event with data', () => {
      socketService.socket = mockSocket
      const data = { test: 'data' }
      
      socketService.emit('test-event', data)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', data)
    })

    it('should handle emit when socket is null', () => {
      socketService.socket = null
      expect(() => socketService.emit('test-event', {})).not.toThrow()
    })
  })

  describe('request', () => {
    it('should resolve on successful response', async () => {
      socketService.socket = mockSocket
      const mockResponse = { success: true, data: 'test' }
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        callback(mockResponse)
      })
      
      const result = await socketService.request('test-event', {})
      
      expect(result).toEqual(mockResponse)
    })

    it('should reject on error response', async () => {
      socketService.socket = mockSocket
      const mockResponse = { success: false, error: 'Test error' }
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        callback(mockResponse)
      })
      
      await expect(socketService.request('test-event', {})).rejects.toThrow('Test error')
    })

    it('should reject when no socket connection', async () => {
      socketService.socket = null
      
      await expect(socketService.request('test-event', {})).rejects.toEqual('No socket connection')
    })
  })

  describe('joinRoom', () => {
    it('should call request with join-room event', async () => {
      socketService.socket = mockSocket
      const roomData = { roomId: 'room1', pin: '1234', nickname: 'user1' }
      const mockResponse = { success: true, sessionId: 'session1' }
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        callback(mockResponse)
      })
      
      const result = await socketService.joinRoom(roomData)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('join-room', roomData, expect.any(Function))
      expect(result).toEqual(mockResponse)
    })
  })

  describe('sendMessage', () => {
    it('should call request with send-message event', async () => {
      socketService.socket = mockSocket
      const mockResponse = { success: true, messageId: '123' }
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        callback(mockResponse)
      })
      
      const result = await socketService.sendMessage('Hello')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('send-message', { content: 'Hello' }, expect.any(Function))
      expect(result).toEqual(mockResponse)
    })
  })

  describe('sendTyping', () => {
    it('should emit typing event', () => {
      socketService.socket = mockSocket
      
      socketService.sendTyping(true)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('typing', { isTyping: true })
    })
  })

  describe('getParticipants', () => {
    it('should request participants', async () => {
      socketService.socket = mockSocket
      const mockResponse = { success: true, participants: ['user1', 'user2'] }
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        callback(mockResponse)
      })
      
      const result = await socketService.getParticipants()
      
      expect(result).toEqual(mockResponse)
    })
  })

  describe('leaveRoom', () => {
    it('should request leave room', async () => {
      socketService.socket = mockSocket
      const mockResponse = { success: true }
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        callback(mockResponse)
      })
      
      const result = await socketService.leaveRoom()
      
      expect(result).toEqual(mockResponse)
    })
  })
})
