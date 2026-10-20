import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AlertLayerControls } from './AlertLayerControls'

describe('AlertLayerControls', () => {
  it('renderiza las tres capas desactivadas por defecto y permite activar/desactivar', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    const { rerender } = render(
      <AlertLayerControls
        enabled={{
          hydrological: false,
          landslides: false,
          fires: false,
        }}
        onToggle={onToggle}
      />,
    )

    const hydro = screen.getByLabelText('Alertas hidrológicas')
    const slides = screen.getByLabelText('Amenaza por deslizamientos')
    const fires = screen.getByLabelText('Amenaza por incendios')

    expect(hydro).not.toBeChecked()
    expect(slides).not.toBeChecked()
    expect(fires).not.toBeChecked()

    await user.click(hydro)
    expect(onToggle).toHaveBeenCalledWith('hydrological')

    rerender(
      <AlertLayerControls
        enabled={{
          hydrological: true,
          landslides: false,
          fires: false,
        }}
        onToggle={onToggle}
      />,
    )

    expect(screen.getByLabelText('Alertas hidrológicas')).toBeChecked()

    await user.click(screen.getByLabelText('Alertas hidrológicas'))
    expect(onToggle).toHaveBeenCalledWith('hydrological')
  })
})
