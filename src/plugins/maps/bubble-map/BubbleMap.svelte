<script lang="ts">
/**
 * BubbleMap Component
 *
 * Displays proportional bubble markers on a map
 */

import { onMount, onDestroy } from 'svelte'
import type { Map as LeafletMap } from 'leaflet'
import type { BubbleMapConfig, BubbleData } from './types'
import { fmt } from '@core/shared/format'

type Props = BubbleMapConfig & {
  data: ReadonlyArray<Record<string, unknown>>
}

let {
  // Required props
  latitude,
  longitude,
  size,
  data,

  // Optional props
  name,
  color,
  title,
  minSize = 5,
  maxSize = 30,
  fillOpacity = 0.6,
  strokeColor = '#ffffff',
  strokeWidth = 2,
  colorScheme = '#4287f5',
  height = 500,
  zoom = 10,
  center,
  showTooltip = true,
  tooltipTemplate,
  tilesUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}: Props = $props()

// Map container
let mapContainer: HTMLDivElement | undefined = $state()
let map: LeafletMap | null = $state(null)

// Processed data
let bubbles = $state<BubbleData[]>([])
let sizeRange = $state<[number, number]>([0, 100])

// Loading state
let loading = $state(true)
let error = $state<string | null>(null)

/**
 * Process data to extract bubbles
 */
function processData() {
  try {
    const processedBubbles: BubbleData[] = []
    const sizeValues: number[] = []

    data.forEach((row) => {
      const lat = Number(row[latitude])
      const lon = Number(row[longitude])
      const sizeVal = Number(row[size])

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(sizeVal)) {
        const bubble: BubbleData = {
          latitude: lat,
          longitude: lon,
          size: sizeVal
        }

        if (name && row[name]) {
          bubble.name = String(row[name])
        }

        if (color && row[color]) {
          bubble.color = String(row[color])
        }

        processedBubbles.push(bubble)
        sizeValues.push(sizeVal)
      }
    })

    if (processedBubbles.length === 0) {
      error = 'No valid data found'
      return
    }

    // Calculate size range
    const minVal = Math.min(...sizeValues)
    const maxVal = Math.max(...sizeValues)
    sizeRange = [minVal, maxVal]

    bubbles = processedBubbles
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to process data'
    console.error('BubbleMap data processing error:', err)
  }
}

/**
 * Calculate bubble radius based on value
 */
function calculateRadius(value: number): number {
  const [min, max] = sizeRange
  if (max === min) return maxSize

  // Scale linearly from minSize to maxSize
  const normalized = (value - min) / (max - min)
  return minSize + normalized * (maxSize - minSize)
}

/**
 * Initialize Leaflet map
 */
async function initMap() {
  try {
    if (!mapContainer) {
      error = 'Map container not available'
      return
    }

    // Dynamic import Leaflet to avoid SSR issues
    const L = (await import('leaflet')).default

    // Import Leaflet CSS
    if (typeof document !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Calculate center if not provided
    let mapCenter: [number, number]
    if (center) {
      mapCenter = center
    } else if (bubbles.length > 0) {
      const avgLat = bubbles.reduce((sum, b) => sum + b.latitude, 0) / bubbles.length
      const avgLon = bubbles.reduce((sum, b) => sum + b.longitude, 0) / bubbles.length
      mapCenter = [avgLat, avgLon]
    } else {
      mapCenter = [0, 0]
    }

    // Create map
    map = L.map(mapContainer, {
      zoomControl: true,
      attributionControl: true
    }).setView(mapCenter, zoom)

    // Add base tile layer
    L.tileLayer(tilesUrl, {
      attribution,
      maxZoom: 18
    }).addTo(map)

    // Add bubbles
    addBubbles(L)

    console.log('[BubbleMap] Map initialized successfully')
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to initialize map'
    console.error('[BubbleMap] Map initialization error:', err)
  }
}

/**
 * Add bubble circles to map
 */
function addBubbles(L: any) {
  if (!map) return

  const circles: any[] = []

  bubbles.forEach((bubble) => {
    const radius = calculateRadius(bubble.size)
    const bubbleColor = bubble.color || colorScheme

    // Create circle marker
    const circle = L.circle([bubble.latitude, bubble.longitude], {
      radius: radius * 100, // Convert to meters (approximate)
      fillColor: bubbleColor,
      fillOpacity,
      color: strokeColor,
      weight: strokeWidth
    })

    // Add tooltip
    if (showTooltip) {
      let tooltipContent = ''

      if (tooltipTemplate) {
        tooltipContent = tooltipTemplate
          .replace('{name}', bubble.name || '')
          .replace('{size}', fmt(bubble.size, 'number'))
          .replace('{latitude}', String(bubble.latitude))
          .replace('{longitude}', String(bubble.longitude))
      } else if (bubble.name) {
        tooltipContent = `${bubble.name}: ${fmt(bubble.size, 'number')}`
      } else {
        tooltipContent = fmt(bubble.size, 'number')
      }

      circle.bindTooltip(tooltipContent)
    }

    // Add popup on click
    let popupContent = ''
    if (bubble.name) {
      popupContent += `<strong>${bubble.name}</strong><br>`
    }
    popupContent += `Value: ${fmt(bubble.size, 'number')}<br>`
    popupContent += `Coordinates: ${bubble.latitude.toFixed(6)}, ${bubble.longitude.toFixed(6)}`

    circle.bindPopup(popupContent)

    circle.addTo(map!)
    circles.push(circle)
  })

  // Fit bounds to show all bubbles
  if (circles.length > 0 && !center) {
    const group = L.featureGroup(circles)
    map!.fitBounds(group.getBounds().pad(0.1))
  }
}

/**
 * Cleanup on destroy
 */
function cleanup() {
  if (map) {
    map.remove()
    map = null
  }
}

// Initialize map when container becomes available
$effect(() => {
  if (mapContainer && !map && !error && bubbles.length > 0) {
    console.log('[BubbleMap] Container available, initializing map')
    initMap()
  }
})

// Process data on mount
onMount(() => {
  console.log('[BubbleMap] Component mounted')
  processData()
  loading = false
})

onDestroy(cleanup)
</script>

<div class="bubble-map-container">
  {#if title}
    <h3 class="bubble-map-title">{title}</h3>
  {/if}

  {#if loading}
    <div class="bubble-map-loading" style="height: {height}px;">
      <div class="spinner"></div>
      <p>Loading map...</p>
    </div>
  {:else if error}
    <div class="bubble-map-error" style="height: {height}px;">
      <p class="error-message">⚠️ {error}</p>
    </div>
  {:else}
    <div class="map-wrapper" bind:this={mapContainer} style="height: {height}px;"></div>
    <div class="bubble-info">
      <span class="bubble-count">{bubbles.length} {bubbles.length === 1 ? 'bubble' : 'bubbles'}</span>
      <span class="size-range">
        Range: {fmt(sizeRange[0], 'number')} – {fmt(sizeRange[1], 'number')}
      </span>
    </div>
  {/if}
</div>

<style>
  .bubble-map-container {
    width: 100%;
    margin: 1rem 0;
  }

  .bubble-map-title {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .map-wrapper {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color, #e5e7eb);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .bubble-map-loading,
  .bubble-map-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 8px;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .bubble-map-loading p {
    margin-top: 1rem;
    color: var(--text-secondary, #6b7280);
  }

  .error-message {
    color: var(--error-color, #ef4444);
    font-size: 1rem;
  }

  .bubble-info {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .bubble-count {
    font-weight: 500;
  }

  .size-range {
    font-style: italic;
  }
</style>
