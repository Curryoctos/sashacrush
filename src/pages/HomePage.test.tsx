import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from '@/pages/HomePage'

describe('HomePage', () => {
  it('renders the SashaCrush title and portal links', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'SashaCrush' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Admin \/ Owner/i })).toHaveAttribute(
      'href',
      '/admin',
    )
    expect(screen.getByRole('link', { name: /Seller \/ Land Owner/i })).toHaveAttribute(
      'href',
      '/seller',
    )
  })
})
