<!--
  Router Component

  Main router component that renders the current matched route.
  Supports route registration, fallback (404), and dynamic component rendering.
-->
<script lang="ts">
  import { router } from './state.svelte'
  import type { Route } from './matcher'

  interface Props {
    routes: Route[]
    fallback?: any
  }

  let { routes, fallback }: Props = $props()

  // Register all routes on mount
  $effect(() => {
    routes.forEach(route => {
      router.register(route.pattern, route.component, route.load)
    })
  })

  // Get current component based on route match
  let currentRoute = $derived(
    routes.find(r => r.pattern === router.currentMatch?.pattern)
  )

  let CurrentComponent = $derived(currentRoute?.component ?? fallback)
</script>

{#if CurrentComponent}
  <CurrentComponent params={router.params} />
{:else}
  <div class="router-no-match">
    <p>No route matched: {router.currentPath}</p>
  </div>
{/if}

<style>
  .router-no-match {
    padding: 2rem;
    text-align: center;
    color: var(--color-text-tertiary, #999);
  }
</style>
