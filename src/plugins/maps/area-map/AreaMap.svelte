<script lang="ts">
/**
 * AreaMap (Choropleth) Component
 *
 * Displays a choropleth map using Leaflet
 */

import { onMount, onDestroy } from 'svelte'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, Layer } from 'leaflet'
import type { AreaMapConfig, AreaData } from './types'
import { createColorScale } from './colors'
import { fmt } from '@core/shared/format'

type Props = AreaMapConfig & {
  data: ReadonlyArray<Record<string, unknown>>
}

let {
  // Required props
  areaId,
  value,
  geoJson,
  data,

  // Optional props
  areaName = areaId,
  title,
  geoJsonKey = 'id',
  colorScale = 'sequential',
  colorScheme = 'Blues',
  colorBuckets = 5,
  colors,
  format = 'number',
  height = 500,
  showLegend = true,
  legendPosition = 'topright',
  showTooltip = true,
  tooltipTemplate = '{areaName}: {formatted}',
  tilesUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}: Props = $props()

// Map container
let mapContainer: HTMLDivElement | undefined = $state()
let map: LeafletMap | null = $state(null)
let geoJsonLayer: LeafletGeoJSON | null = $state(null)

// Processed data
let areaDataMap = $state<Map<string, AreaData>>(new Map())
let colorScaleFunc = $state<(value: number) => string>(() => '#ccc')
let valueRange = $state<[number, number]>([0, 100])

// Loading state
let loading = $state(true)
let error = $state<string | null>(null)

/**
 * Process data and create color scale
 */
function processData() {
  try {
    // Extract values from query result
    const values: number[] = []
    const dataMap = new Map<string, AreaData>()

    data.forEach((row) => {
      const id = String(row[areaId])
      const name = String(row[areaName])
      const val = Number(row[value])

      if (id && !isNaN(val)) {
        values.push(val)
        dataMap.set(id, {
          id,
          name,
          value: val,
          formatted: fmt(val, format),
          color: '#ccc'
        })
      }
    })

    if (values.length === 0) {
      error = 'No valid data found'
      return
    }

    // Calculate value range
    const min = Math.min(...values)
    const max = Math.max(...values)
    valueRange = [min, max]

    // Create color scale
    const scaleConfig = {
      type: colorScale,
      scheme: colorScheme,
      buckets: colorBuckets,
      colors
    }
    colorScaleFunc = createColorScale(scaleConfig, min, max)

    // Assign colors to data
    dataMap.forEach((area) => {
      area.color = colorScaleFunc(area.value)
    })

    areaDataMap = dataMap
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to process data'
    console.error('AreaMap data processing error:', err)
  }
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

    // Create map
    map = L.map(mapContainer, {
      zoomControl: true,
      attributionControl: true
    }).setView([0, 0], 2)

    // Add base tile layer
    L.tileLayer(tilesUrl, {
      attribution,
      maxZoom: 18
    }).addTo(map)

    // Load and add GeoJSON
    await loadGeoJSON(L)

    console.log('[AreaMap] Map initialized successfully')
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to initialize map'
    console.error('[AreaMap] Map initialization error:', err)
  }
}

/**
 * Load GeoJSON data
 */
async function loadGeoJSON(L: any) {
  let geoJsonData: any

  // Fetch GeoJSON if it's a URL
  if (typeof geoJson === 'string') {
    const response = await fetch(geoJson)
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.statusText}`)
    }
    geoJsonData = await response.json()
  } else {
    geoJsonData = geoJson
  }

  // Create GeoJSON layer
  geoJsonLayer = L.geoJSON(geoJsonData, {
    style: (feature: any) => styleFeature(feature),
    onEachFeature: (feature: any, layer: Layer) => {
      if (showTooltip) {
        setupTooltip(layer, feature)
      }
      setupInteraction(layer, feature)
    }
  }).addTo(map!)

  // Fit bounds to GeoJSON
  if (geoJsonLayer) {
    map!.fitBounds(geoJsonLayer.getBounds())
  }

  // Add legend
  if (showLegend) {
    addLegend(L)
  }
}

/**
 * Style GeoJSON feature based on data
 */
function styleFeature(feature: any) {
  const featureId = feature.properties[geoJsonKey]
  const areaData = areaDataMap.get(String(featureId))

  return {
    fillColor: areaData?.color || '#ccc',
    fillOpacity: 0.7,
    color: '#ffffff',
    weight: 1,
    opacity: 1
  }
}

/**
 * Setup tooltip for a layer
 */
function setupTooltip(layer: Layer, feature: any) {
  const featureId = feature.properties[geoJsonKey]
  const areaData = areaDataMap.get(String(featureId))

  if (areaData) {
    let tooltipContent = tooltipTemplate
      .replace('{areaName}', areaData.name)
      .replace('{value}', String(areaData.value))
      .replace('{formatted}', areaData.formatted)

    ;(layer as any).bindTooltip(tooltipContent)
  }
}

/**
 * Setup hover interaction
 */
function setupInteraction(layer: Layer, feature: any) {
  const featureId = feature.properties[geoJsonKey]
  const areaData = areaDataMap.get(String(featureId))

  if (areaData) {
    ;(layer as any).on({
      mouseover: (e: any) => {
        const target = e.target
        target.setStyle({
          weight: 2,
          fillOpacity: 0.9
        })
        target.bringToFront()
      },
      mouseout: (e: any) => {
        geoJsonLayer?.resetStyle(e.target)
      }
    })
  }
}

/**
 * Add legend to map
 */
function addLegend(L: any) {
  const legend = L.control({ position: legendPosition })

  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'leaflet-legend')
    div.style.backgroundColor = 'white'
    div.style.padding = '10px'
    div.style.border = '2px solid rgba(0,0,0,0.2)'
    div.style.borderRadius = '4px'

    const step = (valueRange[1] - valueRange[0]) / colorBuckets
    const labels: string[] = []

    for (let i = 0; i < colorBuckets; i++) {
      const from = valueRange[0] + step * i
      const to = valueRange[0] + step * (i + 1)
      const color = colorScaleFunc((from + to) / 2)

      labels.push(
        `<div style="display: flex; align-items: center; margin: 2px 0;">
          <span style="background:${color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px; opacity: 0.7; border: 1px solid #999;"></span>
          <span style="font-size: 12px;">${fmt(from, format)} – ${fmt(to, format)}</span>
        </div>`
      )
    }

    div.innerHTML = labels.join('')
    return div
  }

  legend.addTo(map!)
}

/**
 * Cleanup on destroy
 */
function cleanup() {
  if (map) {
    map.remove()
    map = null
  }
  geoJsonLayer = null
}

// Initialize map when container becomes available
$effect(() => {
  if (mapContainer && !map && !error && areaDataMap.size > 0) {
    console.log('[AreaMap] Container available, initializing map')
    initMap()
  }
})

// Process data on mount
onMount(() => {
  console.log('[AreaMap] Component mounted')
  processData()
  loading = false
})

onDestroy(cleanup)
</script>

<div class="area-map-container">
  {#if title}
    <h3 class="area-map-title">{title}</h3>
  {/if}

  {#if loading}
    <div class="area-map-loading" style="height: {height}px;">
      <div class="spinner"></div>
      <p>Loading map...</p>
    </div>
  {:else if error}
    <div class="area-map-error" style="height: {height}px;">
      <p class="error-message">⚠️ {error}</p>
    </div>
  {:else}
    <div class="map-wrapper" bind:this={mapContainer} style="height: {height}px;"></div>
  {/if}
</div>

<style>
  .area-map-container {
    width: 100%;
    margin: 1rem 0;
  }

  .area-map-title {
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

  .area-map-loading,
  .area-map-error {
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

  .area-map-loading p {
    margin-top: 1rem;
    color: var(--text-secondary, #6b7280);
  }

  .error-message {
    color: var(--error-color, #ef4444);
    font-size: 1rem;
  }

  :global(.leaflet-legend) {
    font-family: inherit;
  }
</style>
