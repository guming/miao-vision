<script lang="ts">
/**
 * Alert Component
 *
 * Displays callout/alert boxes for highlighting important information
 */

import type { AlertData } from './types'

interface Props {
  data: AlertData
}

let { data }: Props = $props()

let dismissed = $state(false)

const icons: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  tip: '💡',
  note: '📝'
}

const icon = $derived(data.config.icon !== false ? icons[data.config.type || 'info'] : '')

function dismiss() {
  dismissed = true
}
</script>

{#if !dismissed}
<div
  class="alert alert-{data.config.type || 'info'}"
  role="alert"
>
  <div class="alert-header">
    {#if icon}
      <span class="alert-icon">{icon}</span>
    {/if}
    {#if data.config.title}
      <span class="alert-title">{data.config.title}</span>
    {/if}
    {#if data.config.dismissible}
      <button class="alert-dismiss" onclick={dismiss} aria-label="Dismiss">
        ×
      </button>
    {/if}
  </div>
  {#if data.content}
    <div class="alert-content">
      {@html data.content}
    </div>
  {/if}
</div>
{/if}

<style>
.alert {
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.alert-icon {
  font-size: 1.25rem;
}

.alert-title {
  font-weight: 600;
  flex: 1;
}

.alert-dismiss {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.5;
  line-height: 1;
  padding: 0;
}

.alert-dismiss:hover {
  opacity: 1;
}

.alert-content {
  margin-left: 1.75rem;
}

.alert-content :global(p) {
  margin: 0;
}

/* Info */
.alert-info {
  background-color: #1e3a5f;
  border-color: #3b82f6;
  color: #93c5fd;
}

/* Success */
.alert-success {
  background-color: #14532d;
  border-color: #22c55e;
  color: #86efac;
}

/* Warning */
.alert-warning {
  background-color: #451a03;
  border-color: #f59e0b;
  color: #fcd34d;
}

/* Error */
.alert-error {
  background-color: #450a0a;
  border-color: #ef4444;
  color: #fca5a5;
}

/* Tip */
.alert-tip {
  background-color: #3b0764;
  border-color: #a855f7;
  color: #d8b4fe;
}

/* Note */
.alert-note {
  background-color: #1e293b;
  border-color: #64748b;
  color: #cbd5e1;
}
</style>
