import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRoomStore } from '../../store/roomStore'

describe('useRoomStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    const { result } = renderHook(() => useRoomStore())
    act(() => {
      result.current.clearRoom()
    })
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useRoomStore())
    
    expect(result.current.roomInfo).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.participants).toEqual([])
    expect(result.current.nickname).toBeNull()
    expect(result.current.sessionId).toBeNull()
    expect(result.current.isConnected).toBe(false)
  })

  it('should set initial data', () => {
    const { result } = renderHook(() => useRoomStore())
    
    const mockData = {
      roomInfo: { id: 'room123', name: 'Test Room' },
      messages: [{ id: 1, content: 'Hello' }],
      nickname: 'TestUser',
      sessionId: 'session123'
    }
    
    act(() => {
      result.current.setInitialData(mockData)
    })
    
    expect(result.current.roomInfo).toEqual(mockData.roomInfo)
    expect(result.current.messages).toEqual(mockData.messages)
    expect(result.current.nickname).toBe('TestUser')
    expect(result.current.sessionId).toBe('session123')
    expect(result.current.isConnected).toBe(true)
  })

  it('should add message', () => {
    const { result } = renderHook(() => useRoomStore())
    
    const newMessage = { id: 1, content: 'Hello', username: 'User1' }
    
    act(() => {
      result.current.addMessage(newMessage)
    })
    
    expect(result.current.messages).toContainEqual(newMessage)
    expect(result.current.messages).toHaveLength(1)
  })

  it('should set participants', () => {
    const { result } = renderHook(() => useRoomStore())
    
    const participants = [
      { id: 1, username: 'User1' },
      { id: 2, username: 'User2' }
    ]
    
    act(() => {
      result.current.setParticipants(participants)
    })
    
    expect(result.current.participants).toEqual(participants)
  })

  it('should clear room', () => {
    const { result } = renderHook(() => useRoomStore())
    
    // First set some data
    const mockData = {
      roomInfo: { id: 'room123', name: 'Test Room' },
      messages: [{ id: 1, content: 'Hello' }],
      nickname: 'TestUser',
      sessionId: 'session123'
    }
    
    act(() => {
      result.current.setInitialData(mockData)
    })
    
    expect(result.current.isConnected).toBe(true)
    
    // Then clear it
    act(() => {
      result.current.clearRoom()
    })
    
    expect(result.current.roomInfo).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.participants).toEqual([])
    expect(result.current.nickname).toBeNull()
    expect(result.current.sessionId).toBeNull()
    expect(result.current.isConnected).toBe(false)
  })
})
