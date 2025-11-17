import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../../components/ui/Input'

describe('Input Component', () => {
  it('should render input with label', () => {
    render(<Input label="Username" />)
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should display the value prop', () => {
    render(<Input label="Test" value="test value" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('test value')
  })

  it('should call onChange when user types', () => {
    const handleChange = vi.fn()
    render(<Input label="Test" value="" onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new value' } })
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('should render with placeholder', () => {
    render(<Input label="Test" placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('should pass type prop correctly', () => {
    render(<Input label="Password" type="password" />)
    const passwordInput = document.querySelector('input[type="password"]')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input label="Test" disabled />)
    const input = document.querySelector('.minimal-input')
    expect(input).toHaveAttribute('disabled')
  })

  it('should have correct CSS classes', () => {
    const { container } = render(<Input label="Test" />)
    expect(container.querySelector('.input-wrapper')).toBeInTheDocument()
    expect(container.querySelector('.minimal-input')).toBeInTheDocument()
  })
})
