<script lang="ts">
/**
 * PointMap Component
 *
 * Displays markers on a map using latitude/longitude coordinates
 */

import { onMount, onDestroy } from 'svelte'
import type { Map as LeafletMap } from 'leaflet'
import type { PointMapConfig, PointData } from './types'

type Props = PointMapConfig & {
  data: ReadonlyArray<Record<string, unknown>>
}

let {
  // Required props
  latitude,
  longitude,
  data,

  // Optional props
  name,
  value,
  title,
  color,
  icon,
  // markerColor = 'blue',
  // markerSize = 'medium',
  height = 500,
  zoom = 10,
  center,
  // cluster = false,
  // clusterRadius = 80,
  showTooltip = true,
  tooltipTemplate,
  tilesUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}: Props = $props()

// Map container
let mapContainer: HTMLDivElement | undefined = $state()
let map: LeafletMap | null = $state(null)

// Processed data
let points = $state<PointData[]>([])

// Loading state
let loading = $state(true)
let error = $state<string | null>(null)

/**
 * Process data to extract points
 */
function processData() {
  try {
    console.log('[PointMap] Processing data:', { dataLength: data.length, latitude, longitude })
    const processedPoints: PointData[] = []

    data.forEach((row) => {
      const lat = Number(row[latitude])
      const lon = Number(row[longitude])

      if (!isNaN(lat) && !isNaN(lon)) {
        const point: PointData = {
          latitude: lat,
          longitude: lon
        }

        if (name && row[name]) {
          point.name = String(row[name])
        }

        if (value && row[value] !== undefined) {
          point.value = row[value]
        }

        if (color && row[color]) {
          point.color = String(row[color])
        }

        if (icon && row[icon]) {
          point.icon = String(row[icon])
        }

        processedPoints.push(point)
      }
    })

    console.log('[PointMap] Processed points:', processedPoints.length)

    if (processedPoints.length === 0) {
      error = 'No valid coordinate data found'
      console.error('[PointMap] No valid points found')
      return
    }

    points = processedPoints
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to process data'
    console.error('[PointMap] Data processing error:', err)
  }
}

/**
 * Initialize Leaflet map
 */
async function initMap() {
  try {
    console.log('[PointMap] Starting map initialization')
    if (!mapContainer) {
      error = 'Map container not available'
      console.error('[PointMap] Map container not found')
      return
    }

    console.log('[PointMap] Loading Leaflet library')
    // Dynamic import Leaflet to avoid SSR issues
    const L = (await import('leaflet')).default
    console.log('[PointMap] Leaflet loaded successfully')

    // Import Leaflet CSS
    if (typeof document !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
      console.log('[PointMap] Leaflet CSS loaded')
    }

    // Calculate center if not provided
    let mapCenter: [number, number]
    if (center) {
      mapCenter = center
    } else if (points.length > 0) {
      // Calculate centroid of all points
      const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length
      const avgLon = points.reduce((sum, p) => sum + p.longitude, 0) / points.length
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

    // Add markers
    addMarkers(L)

    loading = false
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to initialize map'
    loading = false
    console.error('PointMap initialization error:', err)
  }
}

/**
 * Add markers to map
 */
function addMarkers(L: any) {
  if (!map) return

  const newMarkers: any[] = []

  points.forEach((point) => {
    // Create marker
    const markerOptions: any = {}

    // Use default Leaflet markers (no extra icons library needed)
    const marker = L.marker([point.latitude, point.longitude], markerOptions)

    // Add tooltip
    if (showTooltip) {
      let tooltipContent = ''

      if (tooltipTemplate) {
        tooltipContent = tooltipTemplate
          .replace('{name}', point.name || '')
          .replace('{value}', point.value !== undefined ? String(point.value) : '')
          .replace('{latitude}', String(point.latitude))
          .replace('{longitude}', String(point.longitude))
      } else if (point.name) {
        tooltipContent = point.name
        if (point.value !== undefined) {
          tooltipContent += `: ${point.value}`
        }
      } else {
        tooltipContent = `${point.latitude}, ${point.longitude}`
      }

      marker.bindTooltip(tooltipContent)
    }

    // Add popup on click
    let popupContent = ''
    if (point.name) {
      popupContent += `<strong>${point.name}</strong><br>`
    }
    if (point.value !== undefined) {
      popupContent += `Value: ${point.value}<br>`
    }
    popupContent += `Coordinates: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`

    marker.bindPopup(popupContent)

    marker.addTo(map!)
    newMarkers.push(marker)
  })

  // Fit bounds to show all markers
  if (newMarkers.length > 0 && !center) {
    const group = L.featureGroup(newMarkers)
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

// Lifecycle
onMount(() => {
  console.log('[PointMap] Component mounted, data:', data)
  processData()
  if (!error) {
    console.log('[PointMap] No errors, waiting for container then initializing map')
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (mapContainer) {
        initMap()
      } else {
        console.error('[PointMap] Container still not available after timeout')
        error = 'Map container element not found'
      }
    }, 0)
  } else {
    console.error('[PointMap] Error after processData:', error)
  }
})

onDestroy(cleanup)
</script>

<div class="point-map-container">
  {#if title}
    <h3 class="point-map-title">{title}</h3>
  {/if}

  {#if loading}
    <div class="point-map-loading" style="height: {height}px;">
      <div class="spinner"></div>
      <p>Loading map...</p>
    </div>
  {:else if error}
    <div class="point-map-error" style="height: {height}px;">
      <p class="error-message">⚠️ {error}</p>
    </div>
  {:else}
    <div class="map-wrapper" bind:this={mapContainer} style="height: {height}px;"></div>
    <div class="point-count">
      {points.length} {points.length === 1 ? 'point' : 'points'}
    </div>
  {/if}
</div>

<style>
  .point-map-container {
    width: 100%;
    margin: 1rem 0;
  }

  .point-map-title {
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

  .point-map-loading,
  .point-map-error {
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

  .point-map-loading p {
    margin-top: 1rem;
    color: var(--text-secondary, #6b7280);
  }

  .error-message {
    color: var(--error-color, #ef4444);
    font-size: 1rem;
  }

  .point-count {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    text-align: right;
  }
</style>
