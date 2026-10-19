import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UseMyLocationButton } from './UseMyLocationButton'

describe('UseMyLocationButton', () => {
  it('muestra la etiqueta e icono y dispara onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<UseMyLocationButton onClick={onClick} />)

    const button = screen.getByRole('button', { name: /Usar mi ubicación/i })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('indica estado pendiente y se deshabilita', () => {
    render(<UseMyLocationButton onClick={vi.fn()} isPending />)

    const button = screen.getByRole('button', {
      name: /Obteniendo ubicación/i,
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
