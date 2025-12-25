<script lang="ts">
  import type { ReportVersion } from '@/types/version'
  import { versionStore } from '@app/stores/version.svelte'
  import { compareVersions, getDiffSummary, compareMarkdownStructure } from '@core/version'
  import MonacoDiffEditor from '../MonacoDiffEditor.svelte'

  interface Props {
    /** Report ID to show versions for */
    reportId: string

    /** Optional: Pre-selected version to compare from */
    fromVersion?: ReportVersion

    /** Optional: Pre-selected version to compare to */
    toVersion?: ReportVersion

    /** Callback when dialog is closed */
    onClose?: () => void
  }

  let { reportId, fromVersion, toVersion, onClose }: Props = $props()

  // Local state
  let selectedFrom = $state<ReportVersion | null>(fromVersion || null)
  let selectedTo = $state<ReportVersion | null>(toVersion || null)
  let showStructuralDiff = $state(false)
  let viewMode = $state<'side-by-side' | 'inline'>('side-by-side')

  // Computed diff result
  let diffResult = $derived.by(() => {
    if (selectedFrom && selectedTo) {
      return compareVersions(selectedFrom, selectedTo, {
        semanticCleanup: true,
        ignoreWhitespace: false
      })
    }
    return null
  })

  // Computed markdown structural diff
  let markdownDiff = $derived.by(() => {
    if (selectedFrom && selectedTo && showStructuralDiff) {
      return compareMarkdownStructure(selectedFrom, selectedTo)
    }
    return null
  })

  // Computed diff summary
  let diffSummary = $derived.by(() => {
    if (diffResult) {
      return getDiffSummary(diffResult, markdownDiff || undefined)
    }
    return ''
  })

  // Format timestamp
  function formatTimestamp(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Load versions when report ID changes
  $effect(() => {
    if (reportId) {
      versionStore.loadVersions(reportId)
    }
  })

  // Set initial selections if provided
  $effect(() => {
    if (fromVersion) selectedFrom = fromVersion
    if (toVersion) selectedTo = toVersion
  })
</script>

<div class="version-compare">
  <header class="compare-header">
    <h2>Compare Versions</h2>
    <button class="close-btn" onclick={() => onClose?.()} title="Close">
      ✕
    </button>
  </header>

  <div class="compare-content">
    <!-- Version Selectors -->
    <div class="version-selectors">
      <div class="selector-group">
        <label for="from-version">Compare from (older):</label>
        <select
          id="from-version"
          class="version-select"
          value={selectedFrom?.id || ''}
          onchange={(e) => {
            const version = versionStore.state.versions.find(v => v.id === e.currentTarget.value)
            selectedFrom = version || null
          }}
        >
          <option value="">Select version...</option>
          {#each versionStore.state.versions as version}
            <option value={version.id}>
              v{version.version} - {formatTimestamp(version.timestamp)}
              {#if version.metadata.description}
                - {version.metadata.description}
              {/if}
            </option>
          {/each}
        </select>
      </div>

      <div class="selector-arrow">→</div>

      <div class="selector-group">
        <label for="to-version">Compare to (newer):</label>
        <select
          id="to-version"
          class="version-select"
          value={selectedTo?.id || ''}
          onchange={(e) => {
            const version = versionStore.state.versions.find(v => v.id === e.currentTarget.value)
            selectedTo = version || null
          }}
        >
          <option value="">Select version...</option>
          {#each versionStore.state.versions as version}
            <option value={version.id}>
              v{version.version} - {formatTimestamp(version.timestamp)}
              {#if version.metadata.description}
                - {version.metadata.description}
              {/if}
            </option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Diff Options -->
    {#if selectedFrom && selectedTo}
      <div class="diff-options">
        <div class="diff-stats">
          <span class="stats-label">Changes:</span>
          <span class="stats-value">{diffSummary}</span>
          <span class="stats-detail">
            {diffResult?.stats.changePercentage.toFixed(1)}% modified
          </span>
        </div>

        <div class="options-controls">
          <button
            type="button"
            class="option-btn"
            class:active={viewMode === 'side-by-side'}
            onclick={() => viewMode = 'side-by-side'}
          >
            Side-by-side
          </button>
          <button
            type="button"
            class="option-btn"
            class:active={viewMode === 'inline'}
            onclick={() => viewMode = 'inline'}
          >
            Inline
          </button>
          <button
            type="button"
            class="option-btn"
            class:active={showStructuralDiff}
            onclick={() => showStructuralDiff = !showStructuralDiff}
          >
            Structural Diff
          </button>
        </div>
      </div>
    {/if}

    <!-- Diff Viewer -->
    <div class="diff-viewer">
      {#if !selectedFrom || !selectedTo}
        <div class="empty-state">
          <div class="empty-icon">⇄</div>
          <div class="empty-title">Select Two Versions to Compare</div>
          <div class="empty-hint">
            Choose an older version (from) and a newer version (to) to see the differences
          </div>
        </div>
      {:else}
        <!-- Monaco Diff Editor -->
        <div class="monaco-diff-container">
          <MonacoDiffEditor
            original={selectedFrom.content}
            modified={selectedTo.content}
            language="markdown"
            inlineDiff={viewMode === 'inline'}
            height="calc(100vh - 320px)"
          />
        </div>

        <!-- Structural Diff Panel -->
        {#if showStructuralDiff && markdownDiff}
          <div class="structural-diff-panel">
            <h3>Structural Changes</h3>

            <!-- Headings -->
            {#if markdownDiff.headings.added.length > 0 || markdownDiff.headings.removed.length > 0 || markdownDiff.headings.modified.length > 0}
              <div class="diff-section">
                <h4>Headings</h4>
                {#if markdownDiff.headings.added.length > 0}
                  <div class="diff-group added">
                    <span class="diff-label">Added ({markdownDiff.headings.added.length}):</span>
                    <ul>
                      {#each markdownDiff.headings.added as heading}
                        <li>{'#'.repeat(heading.level)} {heading.text}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.headings.removed.length > 0}
                  <div class="diff-group removed">
                    <span class="diff-label">Removed ({markdownDiff.headings.removed.length}):</span>
                    <ul>
                      {#each markdownDiff.headings.removed as heading}
                        <li>{'#'.repeat(heading.level)} {heading.text}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.headings.modified.length > 0}
                  <div class="diff-group modified">
                    <span class="diff-label">Modified ({markdownDiff.headings.modified.length}):</span>
                    <ul>
                      {#each markdownDiff.headings.modified as heading}
                        <li>
                          <span class="old-text">{heading.oldText}</span>
                          →
                          <span class="new-text">{heading.newText}</span>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Code Blocks (SQL) -->
            {#if markdownDiff.codeBlocks.added.length > 0 || markdownDiff.codeBlocks.removed.length > 0}
              <div class="diff-section">
                <h4>Code Blocks</h4>
                {#if markdownDiff.codeBlocks.added.length > 0}
                  <div class="diff-group added">
                    <span class="diff-label">Added ({markdownDiff.codeBlocks.added.length}):</span>
                    <ul>
                      {#each markdownDiff.codeBlocks.added as block}
                        <li>
                          <code>{block.lang}</code> block
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.codeBlocks.removed.length > 0}
                  <div class="diff-group removed">
                    <span class="diff-label">Removed ({markdownDiff.codeBlocks.removed.length}):</span>
                    <ul>
                      {#each markdownDiff.codeBlocks.removed as block}
                        <li>
                          <code>{block.lang}</code> block
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Components -->
            {#if markdownDiff.components.added.length > 0 || markdownDiff.components.removed.length > 0}
              <div class="diff-section">
                <h4>Components</h4>
                {#if markdownDiff.components.added.length > 0}
                  <div class="diff-group added">
                    <span class="diff-label">Added ({markdownDiff.components.added.length}):</span>
                    <ul>
                      {#each markdownDiff.components.added as comp}
                        <li>&lt;{comp} /&gt;</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.components.removed.length > 0}
                  <div class="diff-group removed">
                    <span class="diff-label">Removed ({markdownDiff.components.removed.length}):</span>
                    <ul>
                      {#each markdownDiff.components.removed as comp}
                        <li>&lt;{comp} /&gt;</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .version-compare {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #030712;
    color: #F3F4F6;
  }

  .compare-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #1F2937;
  }

  .compare-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #374151;
    color: #F3F4F6;
  }

  .compare-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .version-selectors {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: #111827;
    border-bottom: 1px solid #1F2937;
  }

  .selector-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .selector-group label {
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .version-select {
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #F3F4F6;
    font-size: 0.875rem;
    font-family: 'JetBrains Mono', monospace;
    cursor: pointer;
  }

  .version-select:focus {
    outline: 2px solid #4285F4;
    outline-offset: 2px;
  }

  .selector-arrow {
    font-size: 1.5rem;
    color: #4B5563;
    margin-top: 1.5rem;
  }

  .diff-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    background: #111827;
    border-bottom: 1px solid #1F2937;
  }

  .diff-stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .stats-label {
    color: #9CA3AF;
  }

  .stats-value {
    color: #F3F4F6;
    font-weight: 500;
  }

  .stats-detail {
    color: #6B7280;
    font-size: 0.75rem;
  }

  .options-controls {
    display: flex;
    gap: 0.5rem;
  }

  .option-btn {
    padding: 0.375rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .option-btn:hover {
    background: #374151;
    color: #F3F4F6;
  }

  .option-btn.active {
    background: #4285F4;
    border-color: #4285F4;
    color: #FFFFFF;
  }

  .diff-viewer {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
  }

  .empty-icon {
    font-size: 3rem;
    opacity: 0.3;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .empty-hint {
    font-size: 0.8125rem;
    color: #6B7280;
    text-align: center;
  }

  .monaco-diff-container {
    flex: 1;
    overflow: hidden;
    padding: 1rem 1.5rem;
  }

  .structural-diff-panel {
    width: 24rem;
    flex-shrink: 0;
    padding: 1rem;
    background: #111827;
    border-left: 1px solid #1F2937;
    overflow-y: auto;
  }

  .structural-diff-panel h3 {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .diff-section {
    margin-bottom: 1.5rem;
  }

  .diff-section h4 {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #D1D5DB;
  }

  .diff-group {
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    border-radius: 4px;
  }

  .diff-group.added {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .diff-group.removed {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .diff-group.modified {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .diff-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #9CA3AF;
  }

  .diff-group ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8125rem;
    line-height: 1.6;
  }

  .diff-group.added ul {
    color: #22C55E;
  }

  .diff-group.removed ul {
    color: #EF4444;
  }

  .diff-group.modified ul {
    color: #3B82F6;
  }

  .old-text {
    text-decoration: line-through;
    opacity: 0.7;
  }

  .new-text {
    font-weight: 500;
  }

  code {
    padding: 0.125rem 0.375rem;
    background: #1F2937;
    border-radius: 3px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
  }
</style>
