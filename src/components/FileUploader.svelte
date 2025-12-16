<script lang="ts">
  import { databaseStore } from '@app/stores/database.svelte'

  let fileInput: HTMLInputElement
  let dragOver = $state(false)
  let uploadError = $state<string | null>(null)

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      await uploadFiles(target.files)
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragOver = false

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      await uploadFiles(event.dataTransfer.files)
    }
  }

  async function uploadFiles(files: FileList) {
    uploadError = null

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (!['csv', 'parquet'].includes(extension || '')) {
        uploadError = `Unsupported file type: ${file.name}`
        continue
      }

      try {
        await databaseStore.loadFile(file)
        console.log(`File uploaded: ${file.name}`)
      } catch (error) {
        uploadError = error instanceof Error ? error.message : 'Upload failed'
        console.error('Upload error:', error)
      }
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    dragOver = true
  }

  function handleDragLeave() {
    dragOver = false
  }

  function openFileDialog() {
    fileInput?.click()
  }
</script>

<div class="file-uploader">
  <div
    class="drop-zone"
    class:drag-over={dragOver}
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    onclick={openFileDialog}
    onkeydown={(e) => e.key === 'Enter' && openFileDialog()}
    role="button"
    tabindex="0"
  >
    <div class="upload-icon">📁</div>
    <p class="upload-text">
      Drop CSV or Parquet files here, or click to browse
    </p>
    <p class="upload-hint">Supports: .csv, .parquet</p>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept=".csv,.parquet"
    multiple
    onchange={handleFileSelect}
    style="display: none;"
  />

  {#if uploadError}
    <div class="error-message">{uploadError}</div>
  {/if}

  {#if databaseStore.state.dataSources.length > 0}
    <div class="uploaded-files">
      <h3>Loaded Tables:</h3>
      <ul>
        {#each databaseStore.state.dataSources as source}
          <li>
            <span class="file-name">{source.name}</span>
            <span class="table-name">→ {source.tableName}</span>
            <button
              class="remove-btn"
              onclick={() => databaseStore.removeDataSource(source.tableName)}
            >
              ×
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .file-uploader {
    width: 100%;
  }

  .drop-zone {
    position: relative;
    border: 2px dashed #374151;
    border-radius: 16px;
    padding: 4rem 3rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 320px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: #1F2937;
  }

  .drop-zone:hover {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.05);
    box-shadow: 0 4px 16px rgba(66, 133, 244, 0.15);
  }

  .drop-zone.drag-over {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.1);
    box-shadow: 0 8px 24px rgba(66, 133, 244, 0.25);
  }

  .upload-icon {
    font-size: 3.5rem;
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  .upload-text {
    font-size: 1.25rem;
    font-weight: 500;
    margin: 0.5rem 0;
    color: #F3F4F6;
  }

  .upload-hint {
    font-size: 1rem;
    opacity: 0.5;
    margin: 0.5rem 0 0 0;
    color: #D1D5DB;
  }

  .error-message {
    margin-top: 1.5rem;
    padding: 1rem 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    color: #FCA5A5;
    font-weight: 500;
  }

  .uploaded-files {
    margin-top: 2rem;
    background: #1F2937;
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid #374151;
  }

  .uploaded-files h3 {
    font-size: 1.125rem;
    margin-bottom: 1.5rem;
    color: #F3F4F6;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .uploaded-files h3::before {
    content: '✓';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(34, 197, 94, 0.15);
    color: #4ADE80;
    font-size: 0.875rem;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .uploaded-files ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .uploaded-files li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: #111827;
    border-radius: 8px;
    border: 1px solid #374151;
    transition: all 0.2s ease;
  }

  .uploaded-files li:hover {
    background: #1F2937;
    border-color: #4285F4;
  }

  .file-name {
    font-weight: 600;
    color: #F3F4F6;
    font-size: 0.9375rem;
  }

  .table-name {
    opacity: 0.5;
    font-size: 0.875rem;
    color: #D1D5DB;
  }

  .remove-btn {
    margin-left: auto;
    background: transparent;
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 6px;
    color: #F87171;
    font-size: 1.125rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    transition: all 0.2s ease;
  }

  .remove-btn:hover {
    background: rgba(220, 38, 38, 0.15);
    color: #FCA5A5;
    border-color: #DC2626;
  }
</style>
