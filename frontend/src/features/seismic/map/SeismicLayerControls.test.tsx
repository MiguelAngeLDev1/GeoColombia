import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeismicLayerControls } from './SeismicLayerControls'

describe('SeismicLayerControls', () => {
  it('renderiza desactivado y dispara toggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(<SeismicLayerControls enabled={false} onToggle={onToggle} />)

    const checkbox = screen.getByLabelText(/Sismos recientes/)
    expect(checkbox).not.toBeChecked()
    expect(
      screen.getByText(/Últimos eventos del listado SGC/),
    ).toBeInTheDocument()
    await user.click(checkbox)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
