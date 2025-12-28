<!--
  Link Component

  Navigation link component that uses the router for client-side navigation.
  Supports active state highlighting and custom styling.
-->
<script lang="ts">
  import { router } from './state.svelte'

  interface Props {
    to: string
    replace?: boolean
    class?: string
    activeClass?: string
  }

  let {
    to,
    replace = false,
    class: className = '',
    activeClass = 'active'
  }: Props = $props()

  // Check if this link is currently active
  let isActive = $derived(router.currentPath === to)

  // Combine classes
  let finalClass = $derived(
    isActive ? `${className} ${activeClass}`.trim() : className
  )

  /**
   * Handle link click - prevent default and use router
   */
  function handleClick(e: MouseEvent) {
    // Allow Ctrl/Cmd+Click to open in new tab
    if (e.metaKey || e.ctrlKey) {
      return
    }

    e.preventDefault()
    router.navigate(to, { replace })
  }
</script>

<a
  href={to}
  class={finalClass}
  onclick={handleClick}
  aria-current={isActive ? 'page' : undefined}
>
  <slot />
</a>

<style>
  a {
    color: inherit;
    text-decoration: none;
    cursor: pointer;
  }

  a:hover {
    text-decoration: underline;
  }

  a.active {
    font-weight: 600;
  }
</style>
