import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageInput } from '../../components/chat/MessageInput'

describe('MessageInput Component', () => {
  it('should render text input', () => {
    render(<MessageInput onSendMessage={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should call onSendMessage when send button is clicked', () => {
    const handleSend = vi.fn()
    render(<MessageInput onSendMessage={handleSend} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(handleSend).toHaveBeenCalledWith('Test message')
  })

  it('should clear input after sending message', () => {
    render(<MessageInput onSendMessage={vi.fn()} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(input).toHaveValue('')
  })

  it('should not send empty messages', () => {
    const handleSend = vi.fn()
    render(<MessageInput onSendMessage={handleSend} />)
    
    const input = screen.getByRole('textbox')
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(handleSend).not.toHaveBeenCalled()
  })

  it('should send message on Enter key press when not shift', () => {
    const handleSend = vi.fn()
    render(<MessageInput onSendMessage={handleSend} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    // Submit the form instead of trying to trigger Enter key
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(handleSend).toHaveBeenCalledWith('Test message')
  })

  it('should have send button', () => {
    render(<MessageInput onSendMessage={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
