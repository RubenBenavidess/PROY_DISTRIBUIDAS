import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RoomAccessGuard from '../../components/auth/RoomAccessGuard'
import * as roomStore from '../../store/roomStore'

vi.mock('../../store/roomStore')

describe('RoomAccessGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to join page when not connected', () => {
    roomStore.useRoomStore.mockImplementation((selector) => 
      selector ? selector({ isConnected: false }) : false
    )
    
    render(
      <MemoryRouter initialEntries={['/room/123']}>
        <Routes>
          <Route path="/join" element={<div>Join Page</div>} />
          <Route element={<RoomAccessGuard />}>
            <Route path="/room/:roomId" element={<div>Chat Room</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    
    expect(screen.getByText('Join Page')).toBeInTheDocument()
  })

  it('should render room when connected', () => {
    roomStore.useRoomStore.mockImplementation((selector) => 
      selector ? selector({ isConnected: true }) : true
    )
    
    render(
      <MemoryRouter initialEntries={['/room/123']}>
        <Routes>
          <Route path="/join" element={<div>Join Page</div>} />
          <Route element={<RoomAccessGuard />}>
            <Route path="/room/:roomId" element={<div>Chat Room</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    
    expect(screen.getByText('Chat Room')).toBeInTheDocument()
  })
})
