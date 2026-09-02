<script lang="ts">
  /**
   * Landing page for the CLI-first Miao Vision product direction.
   */
  import './landing-page.css'
  import InstallSection from './InstallSection.svelte'
  import { installManifest } from '../install-manifest'
  import { recordFunnelEvent } from '../funnel-events'
  import {
    ArrowRight,
    BarChart3,
    BookOpen,
    CheckCircle2,
    Database,
    Filter,
    FileOutput,
    Github,
    Newspaper,
    Presentation,
    Shield,
    Sparkles,
    Terminal
  } from '@lucide/svelte'

  interface Props {
    onNavigate: (tab: string) => void
  }

  let { onNavigate }: Props = $props()

  $effect(() => { recordFunnelEvent('landing_view') })

  const productTracks = [
    {
      icon: BarChart3,
      title: 'Data Report',
      input: 'CSV / TSV / XLSX / JSON',
      output: '27 chart types, evidence-backed KPI, interactive filters & drilldown'
    },
    {
      icon: Newspaper,
      title: 'Article Infographic',
      input: 'Markdown / text / agent notes',
      output: 'Narrative flow, callout cards, comparison layouts, editorial themes'
    },
    {
      icon: Presentation,
      title: 'Presentation Deck',
      input: 'CSV / JSON / YAML spec',
      output: 'Kami-editorial slides, 8 layouts, keyboard-navigated, print-to-PDF'
    }
  ]


  const workflow = [
    { icon: Database, title: 'Profile', detail: 'Inspect fields and quality' },
    { icon: BookOpen, title: 'Catalog', detail: 'Choose chart patterns' },
    { icon: Sparkles, title: 'Spec', detail: 'AI writes VizSpec' },
    { icon: CheckCircle2, title: 'Validate', detail: 'Repair before render' },
    { icon: FileOutput, title: 'Render', detail: 'Export artifact' }
  ]

  const proofPoints = [
    {
      title: 'Built for AI agents',
      detail: 'No UI to learn, no drag-and-drop. Your agent profiles, specs, validates, and renders in one conversation.'
    },
    {
      title: '27 chart types from one compact spec',
      detail: 'Bar, line, pie, scatter, heatmap, treemap, sankey, and more — all driven by the same VizSpec schema.'
    },
    {
      title: 'Evidence-backed visualization',
      detail: 'Specs bind to pre-computed queries with $evidence: directives. Agents verify claims before rendering.'
    },
    {
      title: 'Interactive reports without a server',
      detail: 'Built-in filter controls, chart tooltips, and drilldown presets — all in a self-contained HTML file.'
    },
    {
      title: 'Local files stay on the machine',
      detail: 'No upload, no cloud call. Your data never leaves the filesystem.'
    },
    {
      title: 'Self-contained HTML opens offline',
      detail: 'Every artifact is a single file with no external dependencies or CDN calls.'
    },
    {
      title: '7 editorial themes and SVG charts',
      detail: 'Pure SVG rendering with 7 curated palettes — no canvas, no library overhead.'
    },
    {
      title: 'Structured validation errors',
      detail: 'The spec validator returns machine-readable errors the agent can fix autonomously.'
    }
  ]

  const artifacts = [
    { url: '/examples/report.html', name: 'Report', description: 'KPI metrics, evidence-backed insights, charts, and drilldown tables in a single editorially-styled artifact.', tags: ['Interactive', 'Sortable', 'Multi-chart'], color: '#1b365d' },
    { url: '/examples/infographic.html', name: 'Infographic', description: 'Narrative data story with highlights, callouts, and trend visualizations rendered as a scannable article.', tags: ['Narrative', 'Data story', 'Clean layout'], color: '#326891' },
    { url: '/examples/deck.html', name: 'Browser Deck', description: 'Multi-slide presentation with keyboard navigation, metrics panels, charts, and dark terminal-style theming.', tags: ['Slides', 'Keyboard nav', 'Dark theme'], color: '#00ff41' },
    { url: '/examples/catalog.html', name: 'Chart Catalog', description: 'Full 27-type chart reference with categorized grid, search filtering, and inline SVG mini-visualizations.', tags: ['27 types', 'Searchable', 'Reference'], color: '#ff7f0e' }
  ]


</script>

<div class="landing">
  <nav class="top-nav" aria-label="Primary navigation">
    <button class="nav-brand" onclick={() => onNavigate('landing')} aria-label="Miao Vision home">
      <span class="brand-mark">MV</span>
      <span class="brand-text">Miao Vision</span>
    </button>
    <div class="nav-actions">
      <a class="nav-link" href="#workflow">Workflow</a>
      <a class="nav-link" href="#install">Install</a>
      <a href="https://github.com/miaoshou-dev/miao-vision" target="_blank" rel="noopener" class="nav-link icon-link">
        <Github size={18} strokeWidth={1.75} />
        <span>GitHub</span>
      </a>
      <a class="nav-btn" href="#install">Install</a>
    </div>
  </nav>

  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow"><Terminal size={16} strokeWidth={2} /> Local-first AI data reports</p>
      <h1>CSV / Excel<br />→ 业务报告</h1>
      <p class="hero-statement">
        用一句话描述目标，Miao Vision 就能把本地 CSV、Excel 或 JSON 变成可直接分享的业务报告。
        无账号、无需上传，数字保留可验证的证据来源。
      </p>
      <div class="hero-actions">
        <a class="btn-primary" href="#first-report">
          <Sparkles size={18} strokeWidth={2} />
          <span>生成第一份报告</span>
        </a>
        <a class="btn-secondary" href="#report-example">
          <span>查看真实报告</span>
          <ArrowRight size={18} strokeWidth={2} />
        </a>
      </div>
      <div class="hero-proof" aria-label="Product principles">
        <span><Shield size={15} strokeWidth={2} /> 本地处理</span>
        <span><Filter size={15} strokeWidth={2} /> 无账号 / 无上传</span>
        <span><FileOutput size={15} strokeWidth={2} /> 离线 HTML</span>
      </div>
    </div>

    <div class="artifact-stage" aria-label="Miao Vision product demo">
      <video
        class="hero-video"
        src="/promo.mp4"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      ></video>
    </div>
  </header>

  <div class="landing-main">
    <section id="report-example" class="gallery-section" aria-labelledby="gallery-title">
      <div class="section-heading">
        <p class="section-kicker">真实产物 · {installManifest.example.cliVersion}</p>
        <h2 id="gallery-title">先看一份可信的销售报告</h2>
        <p class="example-note">自包含 HTML，可离线打开；KPI、图表和洞察均带证据说明。</p>
      </div>
      <div class="artifact-grid">
        {#each artifacts as artifact, index}
          <a id={index === 0 ? 'report-card' : undefined} href={artifact.url} target="_blank" rel="noopener noreferrer" class="artifact-card" onclick={() => recordFunnelEvent('example_open')}>
            <div class="artifact-mark" style="background: {artifact.color}"></div>
            <div class="artifact-body">
              <h3>{artifact.name} <span class="artifact-arrow">&#8599;</span></h3>
              <p>{artifact.description}</p>
              <div class="artifact-tags">
                {#each artifact.tags as tag}
                  <span class="artifact-tag">{tag}</span>
                {/each}
              </div>
            </div>
          </a>
        {/each}
      </div>
      <div class="example-actions">
        <a class="btn-primary" href={installManifest.example.artifactUrl} target="_blank" rel="noopener noreferrer" onclick={() => recordFunnelEvent('example_open')}>打开示例报告</a>
        <a class="btn-secondary" href={installManifest.example.sampleDataUrl} download>下载样例数据</a>
        <a class="btn-secondary" href="#first-report">复制提示词并开始</a>
      </div>
    </section>

    <section id="workflow" class="workflow-section" aria-labelledby="workflow-title">
      <div class="workflow-copy">
        <p class="section-kicker">Agent workflow</p>
        <h2 id="workflow-title">You bring data. The agent does the rest.</h2>
        <p>
          Tell Claude or Codex what you want. The agent profiles your file, writes a VizSpec,
          validates it, and renders a self-contained HTML artifact — no manual YAML required.
        </p>
      </div>
      <div class="command-card">
        <pre><code># Drop a file, tell your agent what you want:
"Create a sales dashboard from sales.csv"
"Turn this article into an infographic"
"Make an executive deck"

# The agent handles profiling, chart selection, validation, and rendering:
→ sales-report.html  (interactive, offline-ready, no server needed)</code></pre>
      </div>
      <div class="workflow-steps">
        {#each workflow as step, index}
          <div class="workflow-step">
            <span class="step-index">{index + 1}</span>
            <step.icon size={20} strokeWidth={1.75} />
            <strong>{step.title}</strong>
            <span>{step.detail}</span>
          </div>
        {/each}
      </div>
    </section>

    <section class="tracks-section" aria-labelledby="tracks-title">
      <div class="section-heading">
        <p class="section-kicker">Product tracks</p>
        <h2 id="tracks-title">One engine, three artifact workflows</h2>
      </div>
      <div class="track-grid">
        {#each productTracks as track}
          <article class="track-card">
            <div class="track-icon"><track.icon size={24} strokeWidth={1.75} /></div>
            <h3>{track.title}</h3>
            <dl>
              <div>
                <dt>Input</dt>
                <dd>{track.input}</dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>{track.output}</dd>
              </div>
            </dl>
          </article>
        {/each}
      </div>
    </section>

    <section class="why-section" aria-labelledby="why-title">
      <div>
        <p class="section-kicker">Why Miao Vision</p>
        <h2 id="why-title">Built for AI agents, judged by the artifact</h2>
      </div>
      <div class="proof-grid">
        {#each proofPoints as point}
          <div class="proof-card">
            <CheckCircle2 size={18} strokeWidth={2} />
            <div class="proof-body">
              <strong>{point.title}</strong>
              <span>{point.detail}</span>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <InstallSection />
  </div>

  <footer class="footer">
    <span>Miao Vision</span>
    <span>AI-first interactive visualization artifacts</span>
    <span>2026</span>
  </footer>
</div>
