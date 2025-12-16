/**
 * Modal Component Types
 */

export interface ModalConfig {
  buttonText?: string      // Trigger button text (default: 'Open')
  title?: string           // Modal title
  size?: 'sm' | 'md' | 'lg' | 'xl'  // Modal size (default: 'md')
  closeOnOverlay?: boolean // Close when clicking overlay (default: true)
  closeOnEscape?: boolean  // Close on Escape key (default: true)
  showClose?: boolean      // Show close button (default: true)
}

export interface ModalData {
  config: ModalConfig
  content: string          // HTML content for the modal body
}
