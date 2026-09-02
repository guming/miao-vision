<script lang="ts">
  import { Check, Copy, Download, ExternalLink } from '@lucide/svelte'
  import { installManifest, type HostId } from '../install-manifest'
  import { recordFunnelEvent } from '../funnel-events'

  let selectedHost = $state<HostId>('codex')
  let copied = $state<string | null>(null)
  let copyError = $state<string | null>(null)
  const selected = $derived(installManifest.hosts.find(option => option.host === selectedHost) ?? installManifest.hosts[0])

  async function copy(text: string, key: string): Promise<void> {
    copyError = null
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      copied = key
      window.setTimeout(() => { if (copied === key) copied = null }, 2000)
    } catch { copyError = key }
  }
</script>

<section id="install" class="install-section" aria-labelledby="install-title">
  <div class="section-heading">
    <p class="section-kicker">Install & verify</p>
    <h2 id="install-title">Choose your environment, follow one path</h2>
    <p class="install-intro">当前兼容版本 <code>v{installManifest.cliVersion}</code> · Node.js 20+ · macOS / Linux / Windows。Plugin 是 Agent 接口，CLI 是本地执行引擎；数据不会上传。</p>
  </div>
  <div class="host-tabs" role="tablist" aria-label="安装环境">
    {#each installManifest.hosts as option}
      <button class:active={selectedHost === option.host} role="tab" aria-selected={selectedHost === option.host} aria-controls="install-option" onclick={() => { selectedHost = option.host; recordFunnelEvent('install_click', option.host, option.host === 'cli' ? 'npm' : option.host === 'openclaw' ? 'skill' : 'plugin') }}>{option.title}</button>
    {/each}
  </div>
  <div id="install-option" class="install-card install-router" role="tabpanel">
    <div class="install-card-heading">
      <div><p class="install-recommended">推荐路径</p><h3>{selected.title}</h3></div>
      {#if selected.downloadUrl}<a class="download-link" href={selected.downloadUrl} target="_blank" rel="noopener noreferrer" onclick={() => recordFunnelEvent('install_click', selected.host, selected.host === 'openclaw' ? 'skill' : 'plugin')}><Download size={16} /> 下载 Release</a>{/if}
    </div>
    <p>{selected.description}</p>
    <div class="install-detail-grid">
      <div><strong>安装步骤</strong>
        {#each selected.commands as command, index}
          <div class="install-step"><span class="step-badge">{index + 1}</span><div class="code-block">
            <button class="copy-btn" onclick={() => copy(command, `${selected.host}-${index}`)} aria-label={`复制第 ${index + 1} 条命令`}>{#if copied === `${selected.host}-${index}`}<Check size={14} />{:else}<Copy size={14} />{/if}</button>
            <pre><code>{command}</code></pre>
          </div></div>
        {/each}
      </div>
      <div class="verify-box"><strong>验证安装</strong><p>确认 CLI 版本和绝对路径：</p><div class="code-block">
        <button class="copy-btn" onclick={() => { recordFunnelEvent('install_verify', selected.host, selected.host === 'cli' ? 'npm' : selected.host === 'openclaw' ? 'skill' : 'plugin'); copy(selected.verifyCommand, `${selected.host}-verify`) }} aria-label="复制验证命令">{#if copied === `${selected.host}-verify`}<Check size={14} />{:else}<Copy size={14} />{/if}</button>
        <pre><code>{selected.verifyCommand}</code></pre>
      </div><small>需要授权：{selected.requiresApproval ? '安装前请确认本地文件写入或下载' : '无需 Agent 或额外授权'}</small></div>
    </div>
    {#if copyError}<p class="copy-fallback" role="status">剪贴板不可用，请选中上方代码复制。</p>{:else if copied}<p class="copy-success" role="status">已复制</p>{/if}
  </div>
  <article class="first-report-panel" id="first-report"><div><p class="section-kicker">First Report</p><h3>附加文件，复制这一句话</h3><p>Agent 会按 Analyze → Spec → Validate → Render 完成流程，无需手写 YAML。</p></div><div class="prompt-example"><code>{installManifest.example.prompt}</code><button class="copy-btn" onclick={() => copy(installManifest.example.prompt, 'first-prompt')} aria-label="复制首次报告提示词">{#if copied === 'first-prompt'}<Check size={14} />{:else}<Copy size={14} />{/if}</button></div></article>
  <p class="install-footer-link"><a href={installManifest.releaseUrl} target="_blank" rel="noopener noreferrer">查看稳定 Release 和 checksum <ExternalLink size={14} /></a></p>
</section>
