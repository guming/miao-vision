<script lang="ts">
  import type { ModalData } from './types'

  interface Props {
    data: ModalData
  }

  let { data }: Props = $props()

  const config = data.config
  const buttonText = config.buttonText ?? 'Open'
  const size = config.size ?? 'md'
  const closeOnOverlay = config.closeOnOverlay !== false
  const closeOnEscape = config.closeOnEscape !== false
  const showClose = config.showClose !== false

  let isOpen = $state(false)

  function openModal() {
    isOpen = true
    // Focus trap will be handled by the modal itself
    document.body.style.overflow = 'hidden'
  }

  function closeModal() {
    isOpen = false
    document.body.style.overflow = ''
  }

  function handleOverlayClick(event: MouseEvent) {
    if (closeOnOverlay && event.target === event.currentTarget) {
      closeModal()
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === 'Escape') {
      closeModal()
    }
  }

  // Size classes
  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }
</script>

<div class="modal-trigger">
  <button
    type="button"
    class="trigger-button"
    onclick={openModal}
  >
    {buttonText}
  </button>
</div>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-overlay"
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby={config.title ? 'modal-title' : undefined}
    tabindex="-1"
  >
    <div
      class="modal-container {sizeClasses[size]}"
    >
      {#if config.title || showClose}
        <div class="modal-header">
          {#if config.title}
            <h2 id="modal-title" class="modal-title">{config.title}</h2>
          {/if}
          {#if showClose}
            <button
              type="button"
              class="close-button"
              onclick={closeModal}
              aria-label="Close modal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          {/if}
        </div>
      {/if}

      <div class="modal-body">
        {@html data.content}
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="footer-button"
          onclick={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-trigger {
    display: inline-block;
  }

  .trigger-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #F3F4F6;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .trigger-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .trigger-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.3);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-container {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 12px;
    width: 100%;
    max-height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .max-w-sm { max-width: 24rem; }
  .max-w-lg { max-width: 32rem; }
  .max-w-2xl { max-width: 42rem; }
  .max-w-4xl { max-width: 56rem; }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #374151;
  }

  .modal-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #9CA3AF;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-button:hover {
    background: #374151;
    color: #F3F4F6;
  }

  .close-button svg {
    width: 20px;
    height: 20px;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    color: #D1D5DB;
    line-height: 1.6;
  }

  .modal-body :global(p) {
    margin: 0 0 1rem 0;
  }

  .modal-body :global(p:last-child) {
    margin-bottom: 0;
  }

  .modal-body :global(h3) {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .modal-body :global(ul),
  .modal-body :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .modal-body :global(li) {
    margin: 0.25rem 0;
  }

  .modal-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  .modal-body :global(th),
  .modal-body :global(td) {
    padding: 0.5rem;
    border: 1px solid #374151;
    text-align: left;
  }

  .modal-body :global(th) {
    background: #374151;
    font-weight: 500;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #374151;
  }

  .footer-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
    background: #374151;
    border: 1px solid #4B5563;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .footer-button:hover {
    background: #4B5563;
    color: #F3F4F6;
  }

  .footer-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(75, 85, 99, 0.3);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .modal-container {
      margin: 0.5rem;
      max-height: calc(100vh - 2rem);
    }

    .modal-header {
      padding: 0.875rem 1rem;
    }

    .modal-body {
      padding: 1rem;
    }

    .modal-footer {
      padding: 0.875rem 1rem;
    }
  }
</style>
