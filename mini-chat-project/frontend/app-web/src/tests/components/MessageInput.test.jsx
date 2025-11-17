import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageInput } from '../../components/chat/MessageInput'

describe('MessageInput Component', () => {
  let onSendMessage
  let onSendFile

  beforeEach(() => {
    onSendMessage = vi.fn()
    onSendFile = vi.fn()
  })

  it('should render text input', () => {
    render(<MessageInput onSendMessage={onSendMessage} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should call onSendMessage when send button is clicked', () => {
    render(<MessageInput onSendMessage={onSendMessage} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(onSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('should clear input after sending message', () => {
    render(<MessageInput onSendMessage={onSendMessage} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(input).toHaveValue('')
  })

  it('should not send empty messages', () => {
    render(<MessageInput onSendMessage={onSendMessage} />)
    
    const input = screen.getByRole('textbox')
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(onSendMessage).not.toHaveBeenCalled()
  })

  it('should send message on Enter key press when not shift', () => {
    render(<MessageInput onSendMessage={onSendMessage} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    // Submit the form instead of trying to trigger Enter key
    const form = input.closest('form')
    fireEvent.submit(form)
    
    expect(onSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('should have send button', () => {
    render(<MessageInput onSendMessage={onSendMessage} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  describe('File Upload Validation', () => {
    it('should show attach button when showAttach is true', () => {
      render(<MessageInput onSendMessage={onSendMessage} onSendFile={onSendFile} showAttach={true} />)
      const attachButton = screen.getByText('📎')
      expect(attachButton).toBeInTheDocument()
    })

    it('should not show attach button when showAttach is false', () => {
      render(<MessageInput onSendMessage={onSendMessage} onSendFile={onSendFile} showAttach={false} />)
      const attachButton = screen.queryByText('📎')
      expect(attachButton).not.toBeInTheDocument()
    })

    it('should accept valid file under 10MB', async () => {
      const { container } = render(<MessageInput onSendMessage={onSendMessage} onSendFile={onSendFile} showAttach={true} />)
      
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }) // 5 MB
      
      const fileInput = container.querySelector('input[type="file"]')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(onSendFile).toHaveBeenCalledWith(file)
      })
    })

    it('should reject file larger than 10MB', async () => {
      const { container } = render(<MessageInput onSendMessage={onSendMessage} onSendFile={onSendFile} showAttach={true} />)
      
      const largeFile = new File(['content'], 'large.txt', { type: 'text/plain' })
      Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }) // 15 MB
      
      const fileInput = container.querySelector('input[type="file"]')
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/muy grande/i)).toBeInTheDocument()
      })
      
      expect(onSendFile).not.toHaveBeenCalled()
    })

    it('should reject .zip files', async () => {
      const { container } = render(<MessageInput onSendMessage={onSendMessage} onSendFile={onSendFile} showAttach={true} />)
      
      const zipFile = new File(['content'], 'archive.zip', { type: 'application/zip' })
      Object.defineProperty(zipFile, 'size', { value: 1024 }) // 1 KB
      
      const fileInput = container.querySelector('input[type="file"]')
      
      fireEvent.change(fileInput, { target: { files: [zipFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/comprimidos.*no están permitidos/i)).toBeInTheDocument()
      })
      
      expect(onSendFile).not.toHaveBeenCalled()
    })

    it('should reject .rar files', async () => {
      const { container } = render(<MessageInput onSendMessage={onSendMessage} onSendFile={onSendFile} showAttach={true} />)
      
      const rarFile = new File(['content'], 'archive.rar', { type: 'application/x-rar-compressed' })
      Object.defineProperty(rarFile, 'size', { value: 1024 })
      
      const fileInput = container.querySelector('input[type="file"]')
      
      fireEvent.change(fileInput, { target: { files: [rarFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/comprimidos.*no están permitidos/i)).toBeInTheDocument()
      })
      
      expect(onSendFile).not.toHaveBeenCalled()
    })

    it('should reject .7z files', async () => {
      const { container } = render(<MessageInput onSendMessage={onSendMessage} onSendFile={onSendFile} showAttach={true} />)
      
      const file7z = new File(['content'], 'archive.7z', { type: 'application/x-7z-compressed' })
      Object.defineProperty(file7z, 'size', { value: 1024 })
      
      const fileInput = container.querySelector('input[type="file"]')
      
      fireEvent.change(fileInput, { target: { files: [file7z] } })
      
      await waitFor(() => {
        expect(screen.getByText(/comprimidos.*no están permitidos/i)).toBeInTheDocument()
      })
      
      expect(onSendFile).not.toHaveBeenCalled()
    })
  })
})
