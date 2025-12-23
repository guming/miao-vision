<script lang="ts">
/**
 * Image Component
 *
 * Display images in reports with various styling options
 */

import type { ImageConfig } from './types'

type Props = ImageConfig

let {
  src,
  alt = '',
  title,
  caption,
  width,
  height,
  link,
  align = 'center',
  fit = 'contain',
  rounded = false,
  shadow = false
}: Props = $props()

let loaded = $state(false)
let error = $state(false)

function handleLoad() {
  loaded = true
}

function handleError() {
  error = true
  console.error(`Failed to load image: ${src}`)
}

// Compute styles
const imageStyles = $derived(() => {
  const styles: string[] = []

  if (width) {
    const widthValue = typeof width === 'number' ? `${width}px` : width
    styles.push(`width: ${widthValue}`)
  }

  if (height) {
    const heightValue = typeof height === 'number' ? `${height}px` : height
    styles.push(`height: ${heightValue}`)
  }

  if (fit) {
    styles.push(`object-fit: ${fit}`)
  }

  return styles.join('; ')
})

const containerClasses = $derived(() => {
  const classes = ['image-component']
  classes.push(`align-${align}`)
  if (rounded) classes.push('rounded')
  if (shadow) classes.push('shadow')
  return classes.join(' ')
})
</script>

<div class={containerClasses()}>
  {#if title}
    <h4 class="image-title">{title}</h4>
  {/if}

  <div class="image-wrapper">
    {#if error}
      <div class="image-error">
        <span class="error-icon">⚠️</span>
        <p>Failed to load image</p>
        <small>{src}</small>
      </div>
    {:else}
      {#if !loaded}
        <div class="image-loading">
          <div class="spinner"></div>
        </div>
      {/if}

      {#if link}
        <a href={link} target="_blank" rel="noopener noreferrer" class="image-link">
          <img
            {src}
            {alt}
            style={imageStyles()}
            onload={handleLoad}
            onerror={handleError}
            class:loaded
          />
        </a>
      {:else}
        <img
          {src}
          {alt}
          style={imageStyles()}
          onload={handleLoad}
          onerror={handleError}
          class:loaded
        />
      {/if}
    {/if}
  </div>

  {#if caption}
    <p class="image-caption">{caption}</p>
  {/if}
</div>

<style>
  .image-component {
    width: 100%;
    margin: 1.5rem 0;
  }

  .image-component.align-left {
    text-align: left;
  }

  .image-component.align-center {
    text-align: center;
  }

  .image-component.align-right {
    text-align: right;
  }

  .image-title {
    margin: 0 0 0.75rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .image-wrapper {
    position: relative;
    display: inline-block;
    max-width: 100%;
  }

  img {
    display: block;
    max-width: 100%;
    height: auto;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  img.loaded {
    opacity: 1;
  }

  .image-component.rounded img {
    border-radius: 8px;
  }

  .image-component.shadow img {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .image-link {
    display: inline-block;
    cursor: pointer;
  }

  .image-link:hover img {
    opacity: 0.9;
  }

  .image-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 8px;
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
    to {
      transform: rotate(360deg);
    }
  }

  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
    background: var(--bg-secondary, #f9fafb);
    border: 1px dashed var(--border-color, #e5e7eb);
    border-radius: 8px;
  }

  .error-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .image-error p {
    margin: 0 0 0.5rem 0;
    color: var(--error-color, #ef4444);
    font-weight: 500;
  }

  .image-error small {
    color: var(--text-secondary, #6b7280);
    font-size: 0.75rem;
    word-break: break-all;
  }

  .image-caption {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    font-style: italic;
  }
</style>
