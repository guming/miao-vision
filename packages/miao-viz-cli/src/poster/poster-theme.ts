import type { SvgTheme } from '../themes/types'

export interface PosterTheme {
  background: string
  ink: string
  muted: string
  accent: string
  grid: string
  paper: string
  font: string
  displayFont: string
  svg: SvgTheme
}

export const posterEditorialTheme: PosterTheme = {
  background: '#f8f2df',
  paper: '#fffaf0',
  ink: '#171513',
  muted: '#665e53',
  accent: '#ff4b2b',
  grid: '#dfd5bd',
  font: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  displayFont: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  svg: {
    palette: ['#ff4b2b'],
    background: '#f8f2df',
    axisColor: '#8f8068',
    labelColor: '#665e53'
  }
}
