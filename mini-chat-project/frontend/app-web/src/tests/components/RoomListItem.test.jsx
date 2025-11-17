import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomListItem } from '../../components/admin/RoomListItem'

describe('RoomListItem', () => {
  const mockRoom = {
    _id: 'room1',
    title: 'General',
    pin: '1234',
    type: 'text/media',
    participants: 5
  }

  it('should render room information', () => {
    render(<RoomListItem room={mockRoom} isSelected={false} onClick={() => {}} />)
    
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('PIN: 1234')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show text/media icon for text/media rooms', () => {
    render(<RoomListItem room={mockRoom} isSelected={false} onClick={() => {}} />)
    
    expect(screen.getByText('📎')).toBeInTheDocument()
  })

  it('should show hashtag icon for text-only rooms', () => {
    const textRoom = { ...mockRoom, type: 'text' }
    render(<RoomListItem room={textRoom} isSelected={false} onClick={() => {}} />)
    
    expect(screen.getByText('#')).toBeInTheDocument()
  })

  it('should apply selected class when isSelected is true', () => {
    const { container } = render(
      <RoomListItem room={mockRoom} isSelected={true} onClick={() => {}} />
    )
    
    const item = container.querySelector('.room-list-item')
    expect(item).toHaveClass('selected')
  })

  it('should not apply selected class when isSelected is false', () => {
    const { container } = render(
      <RoomListItem room={mockRoom} isSelected={false} onClick={() => {}} />
    )
    
    const item = container.querySelector('.room-list-item')
    expect(item).not.toHaveClass('selected')
  })

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<RoomListItem room={mockRoom} isSelected={false} onClick={handleClick} />)
    
    const item = screen.getByText('General').closest('.room-list-item')
    fireEvent.click(item)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should show 0 participants when participants is undefined', () => {
    const roomNoParticipants = { ...mockRoom, participants: undefined }
    render(<RoomListItem room={roomNoParticipants} isSelected={false} onClick={() => {}} />)
    
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
