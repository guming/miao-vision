<script lang="ts">
  import type { ReportPage } from '@/types/report'

  interface Props {
    show: boolean
    pages: ReportPage[]
    onClose: () => void
    onConfirm: (title: string, slug: string, parentId?: string) => void
  }

  let { show, pages, onClose, onConfirm }: Props = $props()

  let title = $state('')
  let slug = $state('')
  let parentId = $state<string | undefined>(undefined)
  let autoSlug = $state(true)

  // Auto-generate slug from title
  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Update slug when title changes (if auto-slug is enabled)
  $effect(() => {
    if (autoSlug && title) {
      slug = generateSlug(title)
    }
  })

  function handleSubmit() {
    if (!title.trim()) {
      alert('Please enter a page title')
      return
    }

    const finalSlug = slug || generateSlug(title)

    // Check for duplicate slug
    if (pages.some(p => p.slug === finalSlug)) {
      alert('A page with this slug already exists. Please choose a different name.')
      return
    }

    onConfirm(title.trim(), finalSlug, parentId)
    handleClose()
  }

  function handleClose() {
    title = ''
    slug = ''
    parentId = undefined
    autoSlug = true
    onClose()
  }

  function handleSlugInput() {
    autoSlug = false
  }
</script>

{#if show}
  <div class="dialog-overlay" onclick={handleClose}>
    <div class="dialog" onclick={(e) => e.stopPropagation()}>
      <div class="dialog-header">
        <h2>Create New Page</h2>
        <button class="close-btn" onclick={handleClose}>×</button>
      </div>

      <div class="dialog-content">
        <div class="form-field">
          <label for="page-title">Page Title</label>
          <input
            id="page-title"
            type="text"
            class="form-input"
            bind:value={title}
            placeholder="Enter page title"
            autofocus
          />
        </div>

        <div class="form-field">
          <label for="page-slug">
            URL Slug
            <span class="hint">(optional - auto-generated from title)</span>
          </label>
          <input
            id="page-slug"
            type="text"
            class="form-input"
            bind:value={slug}
            oninput={handleSlugInput}
            placeholder="page-slug"
          />
        </div>

        <div class="form-field">
          <label for="parent-page">Parent Page</label>
          <select
            id="parent-page"
            class="form-select"
            bind:value={parentId}
          >
            <option value={undefined}>None (Root Level)</option>
            {#each pages as page}
              <option value={page.id}>{page.title}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" onclick={handleClose}>
          Cancel
        </button>
        <button class="btn btn-primary" onclick={handleSubmit}>
          Create Page
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.75rem;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(2rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-header {
    padding: 1.5rem;
    border-bottom: 1px solid #374151;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .close-btn {
    background: none;
    border: none;
    color: #9CA3AF;
    font-size: 1.75rem;
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #374151;
    color: #F3F4F6;
  }

  .dialog-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #D1D5DB;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .hint {
    font-weight: 400;
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .form-input,
  .form-select {
    padding: 0.75rem;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    color: #F3F4F6;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #4285F4;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
  }

  .form-select {
    cursor: pointer;
  }

  .dialog-footer {
    padding: 1.5rem;
    border-top: 1px solid #374151;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: #374151;
    color: #F3F4F6;
  }

  .btn-secondary:hover {
    background: #4B5563;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%);
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 50%, #D93D85 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
  }
</style>
