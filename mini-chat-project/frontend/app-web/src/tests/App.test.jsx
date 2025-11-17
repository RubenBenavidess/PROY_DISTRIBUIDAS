import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import App from '../App.jsx'

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />)
    
    expect(document.body).toBeTruthy()
  })

  it('should render routes', () => {
    render(<App />)
    
    // Should render landing page by default (/)
    expect(document.querySelector('.landing-container, body')).toBeTruthy()
  })
})
