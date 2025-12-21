<script lang="ts">
  import type { TabsData } from './types'

  interface Props {
    data: TabsData
  }

  let { data }: Props = $props()

  // Config is captured at mount - component is recreated if data changes
  const config = data.config
  const tabs = data.tabs
  const contents = data.contents
  const variant = config.variant ?? 'default'
  const fullWidth = config.fullWidth ?? false

  let activeTab = $state(config.defaultTab ?? 0)

  function selectTab(index: number) {
    const tab = tabs[index]
    if (tab && !tab.disabled) {
      activeTab = index
    }
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectTab(index)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (index + 1) % tabs.length
      selectTab(nextIndex)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (index - 1 + tabs.length) % tabs.length
      selectTab(prevIndex)
    }
  }
</script>

<div class="tabs-container" class:variant-pills={variant === 'pills'} class:variant-underline={variant === 'underline'}>
  <!-- Tab Headers -->
  <div class="tabs-header" class:full-width={fullWidth} role="tablist">
    {#each tabs as tab, index}
      <button
        class="tab-button"
        class:active={activeTab === index}
        class:disabled={tab.disabled}
        role="tab"
        aria-selected={activeTab === index}
        aria-controls={`tabpanel-${index}`}
        tabindex={activeTab === index ? 0 : -1}
        onclick={() => selectTab(index)}
        onkeydown={(e) => handleKeyDown(e, index)}
        disabled={tab.disabled}
      >
        {#if tab.icon}
          <span class="tab-icon">{tab.icon}</span>
        {/if}
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </div>

  <!-- Tab Content -->
  <div class="tabs-content">
    {#each contents as content, index}
      <div
        class="tab-panel"
        class:active={activeTab === index}
        role="tabpanel"
        id={`tabpanel-${index}`}
        aria-labelledby={`tab-${index}`}
        hidden={activeTab !== index}
      >
        {@html content}
      </div>
    {/each}
  </div>
</div>

<style>
  .tabs-container {
    margin: 1.5rem 0;
  }

  .tabs-header {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid #4B5563;
    margin-bottom: 1rem;
  }

  .tabs-header.full-width {
    width: 100%;
  }

  .tabs-header.full-width .tab-button {
    flex: 1;
    justify-content: center;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #9CA3AF;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: -1px;
  }

  .tab-button:hover:not(.disabled) {
    color: #F3F4F6;
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-button.active {
    color: #667eea;
    border-bottom-color: #667eea;
  }

  .tab-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tab-icon {
    font-size: 1rem;
  }

  .tab-label {
    white-space: nowrap;
  }

  /* Pills variant */
  .variant-pills .tabs-header {
    border-bottom: none;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .variant-pills .tab-button {
    border-radius: 9999px;
    border: 1px solid #4B5563;
    margin-bottom: 0;
  }

  .variant-pills .tab-button.active {
    background: #667eea;
    border-color: #667eea;
    color: white;
  }

  .variant-pills .tab-button:hover:not(.disabled):not(.active) {
    border-color: #9CA3AF;
  }

  /* Underline variant */
  .variant-underline .tabs-header {
    border-bottom: none;
    gap: 2rem;
  }

  .variant-underline .tab-button {
    padding: 0.75rem 0;
    border-bottom-width: 3px;
  }

  /* Content */
  .tabs-content {
    min-height: 100px;
  }

  .tab-panel {
    display: none;
    animation: fadeIn 0.2s ease;
  }

  .tab-panel.active {
    display: block;
  }

  .tab-panel[hidden] {
    display: none;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive */
  @media (max-width: 640px) {
    .tabs-header {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .tabs-header::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
    }
  }
</style>
