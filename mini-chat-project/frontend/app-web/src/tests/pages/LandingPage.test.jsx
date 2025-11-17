import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LandingPage from '../../pages/LandingPage'

describe('LandingPage', () => {
  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render page title', () => {
    renderWithRouter(<LandingPage />)
    expect(screen.getByText(/bienvenido|welcome|mini.*chat/i)).toBeInTheDocument()
  })

  it('should render user button', () => {
    renderWithRouter(<LandingPage />)
    expect(screen.getByRole('button', { name: /unirse|usuario|user/i })).toBeInTheDocument()
  })

  it('should render admin button', () => {
    renderWithRouter(<LandingPage />)
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument()
  })

  it('should have two navigation buttons', () => {
    renderWithRouter(<LandingPage />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
  })

  it('should render subtitle or description', () => {
    renderWithRouter(<LandingPage />)
    const container = screen.getByText(/bienvenido|welcome/i).parentElement
    expect(container).toBeInTheDocument()
  })
})
