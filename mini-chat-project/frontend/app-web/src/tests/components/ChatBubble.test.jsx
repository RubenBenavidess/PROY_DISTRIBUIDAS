import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatBubble } from '../../components/chat/ChatBubble'

describe('ChatBubble Component', () => {
  const defaultProps = {
    message: {
      username: 'TestUser',
      content: 'Hello World',
      timestamp: new Date().toISOString(),
      contentType: 'text'
    },
    isMe: false
  }

  it('should render message text', () => {
    render(<ChatBubble {...defaultProps} />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should render username when isMe is false', () => {
    render(<ChatBubble {...defaultProps} />)
    // ChatBubble shows "Usuario TestUs" for hashed usernames
    expect(screen.getByText(/Usuario TestUs/i)).toBeInTheDocument()
  })

  it('should render timestamp', () => {
    const { container } = render(<ChatBubble {...defaultProps} />)
    const timestamp = container.querySelector('.message-time')
    expect(timestamp).toBeInTheDocument()
  })

  it('should render avatar with first letter of username', () => {
    render(<ChatBubble {...defaultProps} />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('should apply other-bubble class when isMe is false', () => {
    const { container } = render(<ChatBubble {...defaultProps} />)
    const bubble = container.querySelector('.bubble')
    expect(bubble).toHaveClass('other-bubble')
  })

  it('should apply me-bubble class when isMe is true', () => {
    const { container } = render(<ChatBubble {...defaultProps} isMe={true} />)
    const bubble = container.querySelector('.bubble')
    expect(bubble).toHaveClass('me-bubble')
  })

  it('should apply me class to row when isMe is true', () => {
    const { container} = render(<ChatBubble {...defaultProps} isMe={true} />)
    const row = container.querySelector('.chat-message-row')
    expect(row).toHaveClass('me')
  })

  it('should handle long messages', () => {
    const longMessage = {
      ...defaultProps.message,
      content: 'A'.repeat(500)
    }
    render(<ChatBubble message={longMessage} isMe={false} />)
    expect(screen.getByText('A'.repeat(500))).toBeInTheDocument()
  })

  it('should handle file messages', () => {
    const fileMessage = {
      ...defaultProps.message,
      contentType: 'file',
      filename: 'document.pdf',
      content: 'file content'
    }
    render(<ChatBubble message={fileMessage} isMe={false} />)
    expect(screen.getByText(/document\.pdf/i)).toBeInTheDocument()
  })
})
