<script lang="ts">
  import { Copy, Check } from '@lucide/svelte'

  let copied = $state<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      copied = key
      setTimeout(() => { copied = null }, 2000)
    })
  }

  let pluginText = 'curl -L https://github.com/miaoshou-dev/miao-vision/releases/latest/download/miao-vision-plugin.zip -o miao-vision-plugin.zip'
  let cliText = 'npm install -g @miao-vision/cli@0.2.0'
  let claudeText = 'claude plugin marketplace add miaoshou-dev/miao-vision\nclaude plugin install miao-vision@miao-vision'
  let codexText = '# Download miao-vision-plugin.zip, then install it through the Codex plugin surface.'
  let promptExamples = [
    'Analyze this sales spreadsheet and create an HTML report with key metrics and charts.',
    'Export this report as a printable A4 PDF.',
    'Use this week’s new data to update last week’s report with the same metrics and layout.'
  ]
</script>

<section id="install" class="install-section" aria-labelledby="install-title">
  <div class="section-heading">
    <p class="section-kicker">Install</p>
    <h2 id="install-title">Install one plugin for Codex or Claude</h2>
  </div>
  <div class="install-grid">
    <article class="install-card">
      <h3>Cross-host Plugin v0.2.0</h3>
      <p>The recommended bundle includes the Skill and a versioned CLI compatibility contract. The second command is an optional direct CLI install. Your data stays local.</p>
      <div class="install-steps">
        <div class="install-step">
          <span class="step-badge">1</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(pluginText, 'plugin')} aria-label="Copy">
              {#if copied === 'plugin'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>{pluginText}</code></pre>
          </div>
        </div>
        <div class="install-step">
          <span class="step-badge">2</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(cliText, 'cli')} aria-label="Copy">
              {#if copied === 'cli'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>{cliText}</code></pre>
          </div>
        </div>
      </div>
    </article>

    <article class="install-card">
      <h3>Claude Code</h3>
      <p>Add the repository marketplace, then install the published plugin.</p>
      <div class="code-block">
        <button class="copy-btn" onclick={() => copy(claudeText, 'claude')} aria-label="Copy">
          {#if copied === 'claude'}<Check size={14} />{:else}<Copy size={14} />{/if}
        </button>
        <pre><code>{claudeText}</code></pre>
      </div>
    </article>

    <article class="install-card">
      <h3>Codex</h3>
      <p>Install the same cross-host ZIP through the Codex plugin surface.</p>
      <div class="code-block">
        <button class="copy-btn" onclick={() => copy(codexText, 'codex')} aria-label="Copy">
          {#if copied === 'codex'}<Check size={14} />{:else}<Copy size={14} />{/if}
        </button>
        <pre><code>{codexText}</code></pre>
      </div>
    </article>
  </div>
  <div class="try-panel">
    <div class="try-panel-copy">
      <p class="section-kicker">Try it</p>
      <h3>Attach your file, then ask naturally</h3>
      <p>No CLI commands needed. Copy a prompt into Codex or Claude and let the skill handle the workflow.</p>
    </div>
    <div class="prompt-examples">
      {#each promptExamples as prompt, index}
        <div class="prompt-example">
          <span>{prompt}</span>
          <button class="copy-btn" onclick={() => copy(prompt, `prompt-${index}`)} aria-label={`Copy example ${index + 1}`}>
            {#if copied === `prompt-${index}`}<Check size={14} />{:else}<Copy size={14} />{/if}
          </button>
        </div>
      {/each}
    </div>
  </div>
</section>
