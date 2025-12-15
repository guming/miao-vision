/**
 * ComponentMount - Unified Component Mounting Layer
 *
 * Encapsulates Svelte 5's mount/unmount API with lifecycle management.
 * Provides consistent mounting behavior across all components.
 */

import { mount, unmount } from 'svelte'
import type { Component, ComponentProps } from 'svelte'

/**
 * Mounted component instance with lifecycle methods
 */
export interface MountedComponent<T = unknown> {
  /** The Svelte component instance */
  instance: T
  /** The container element */
  container: HTMLElement
  /** Unmount the component and clean up */
  unmount: () => void
  /** Update component props */
  update?: (props: Partial<Record<string, unknown>>) => void
}

/**
 * Mount options
 */
export interface MountOptions {
  /** CSS class name for the container */
  className?: string
  /** Element ID for the container */
  id?: string
  /** Additional inline styles */
  style?: string
  /** Callback before mounting */
  onBeforeMount?: (container: HTMLElement) => void
  /** Callback after mounting */
  onMounted?: (instance: unknown) => void
  /** Callback after unmounting */
  onUnmounted?: () => void
}

/**
 * ComponentMount class - handles Svelte component lifecycle
 */
export class ComponentMount {
  /** Track mounted components by ID for cleanup */
  private mounted = new Map<string, MountedComponent>()

  /**
   * Mount a Svelte component to a container
   */
  mount<TComponent extends Component<any>, TProps extends ComponentProps<TComponent>>(
    component: TComponent,
    props: TProps,
    target: HTMLElement,
    options?: MountOptions
  ): MountedComponent {
    // Apply container options
    if (options?.className) {
      target.className = options.className
    }
    if (options?.id) {
      target.id = options.id
    }
    if (options?.style) {
      target.style.cssText = options.style
    }

    // Before mount callback
    options?.onBeforeMount?.(target)

    // Mount the component using Svelte 5 API
    const instance = mount(component, {
      target,
      props
    })

    // After mount callback
    options?.onMounted?.(instance)

    // Create result object
    const result: MountedComponent = {
      instance,
      container: target,
      unmount: () => {
        unmount(instance)
        options?.onUnmounted?.()
        // Remove from tracking if tracked by ID
        if (options?.id) {
          this.mounted.delete(options.id)
        }
      }
    }

    // Track by ID if provided
    if (options?.id) {
      // Unmount existing component with same ID
      if (this.mounted.has(options.id)) {
        this.mounted.get(options.id)?.unmount()
      }
      this.mounted.set(options.id, result)
    }

    return result
  }

  /**
   * Mount a component and replace a placeholder element
   */
  mountAndReplace<TComponent extends Component<any>, TProps extends ComponentProps<TComponent>>(
    component: TComponent,
    props: TProps,
    placeholder: Element,
    options?: MountOptions
  ): MountedComponent {
    // Create container
    const container = document.createElement('div')

    // Apply options to container
    if (options?.className) {
      container.className = options.className
    }
    if (options?.id) {
      container.id = options.id
    }
    if (options?.style) {
      container.style.cssText = options.style
    }

    // Before mount callback
    options?.onBeforeMount?.(container)

    // Mount the component
    const instance = mount(component, {
      target: container,
      props
    })

    // Replace placeholder with container
    placeholder.replaceWith(container)

    // After mount callback
    options?.onMounted?.(instance)

    // Create result object
    const result: MountedComponent = {
      instance,
      container,
      unmount: () => {
        unmount(instance)
        container.remove()
        options?.onUnmounted?.()
        if (options?.id) {
          this.mounted.delete(options.id)
        }
      }
    }

    // Track by ID if provided
    if (options?.id) {
      if (this.mounted.has(options.id)) {
        this.mounted.get(options.id)?.unmount()
      }
      this.mounted.set(options.id, result)
    }

    return result
  }

  /**
   * Create a container element with the specified options
   */
  createContainer(options?: MountOptions): HTMLElement {
    const container = document.createElement('div')

    if (options?.className) {
      container.className = options.className
    }
    if (options?.id) {
      container.id = options.id
    }
    if (options?.style) {
      container.style.cssText = options.style
    }

    return container
  }

  /**
   * Unmount a component by its ID
   */
  unmountById(id: string): boolean {
    const mounted = this.mounted.get(id)
    if (mounted) {
      mounted.unmount()
      return true
    }
    return false
  }

  /**
   * Unmount all tracked components
   */
  unmountAll(): void {
    for (const [, mounted] of this.mounted) {
      mounted.unmount()
    }
    this.mounted.clear()
  }

  /**
   * Check if a component is mounted by ID
   */
  isMounted(id: string): boolean {
    return this.mounted.has(id)
  }

  /**
   * Get a mounted component by ID
   */
  getMounted(id: string): MountedComponent | undefined {
    return this.mounted.get(id)
  }

  /**
   * Get all mounted component IDs
   */
  getMountedIds(): string[] {
    return Array.from(this.mounted.keys())
  }

  /**
   * Get count of mounted components
   */
  getMountedCount(): number {
    return this.mounted.size
  }
}

/**
 * Singleton instance
 */
export const componentMount = new ComponentMount()

/**
 * Helper function: Quick mount without tracking
 */
export function quickMount<TComponent extends Component<any>, TProps extends ComponentProps<TComponent>>(
  component: TComponent,
  props: TProps,
  target: HTMLElement,
  className?: string
): MountedComponent {
  return componentMount.mount(component, props, target, { className })
}

/**
 * Helper function: Mount and replace placeholder
 */
export function mountReplace<TComponent extends Component<any>, TProps extends ComponentProps<TComponent>>(
  component: TComponent,
  props: TProps,
  placeholder: Element,
  className?: string
): MountedComponent {
  return componentMount.mountAndReplace(component, props, placeholder, { className })
}
