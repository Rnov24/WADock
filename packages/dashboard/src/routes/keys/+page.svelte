<script>
  import { onMount } from 'svelte';
  import { keys } from '$lib/api';

  let keyList = $state([]);
  let loading = $state(true);
  let showForm = $state(false);
  let newKeyName = $state('');
  let newKeyPerms = $state([]);
  let createdKey = $state(null);
  let copied = $state(false);

  const allPermissions = [
    'full',
    'messages:send',
    'session:read',
    'session:write',
    'webhooks:read',
    'webhooks:write',
    'keys:read',
    'keys:write',
    'logs:read',
  ];

  async function fetchKeys() {
    loading = true;
    try {
      keyList = await keys.list();
    } catch { /* ignore */ }
    loading = false;
  }

  async function handleCreate() {
    if (!newKeyName.trim() || newKeyPerms.length === 0) return;
    try {
      const result = await keys.create(newKeyName, newKeyPerms);
      createdKey = result.key;
      showForm = false;
      newKeyName = '';
      newKeyPerms = [];
      await fetchKeys();
    } catch { /* ignore */ }
  }

  async function handleRevoke(id) {
    if (!confirm('Revoke this API key?')) return;
    await keys.revoke(id);
    await fetchKeys();
  }

  function togglePerm(perm) {
    if (perm === 'full') {
      newKeyPerms = newKeyPerms.includes('full') ? [] : ['full'];
      return;
    }
    newKeyPerms = newKeyPerms.filter(p => p !== 'full');
    if (newKeyPerms.includes(perm)) {
      newKeyPerms = newKeyPerms.filter(p => p !== perm);
    } else {
      newKeyPerms = [...newKeyPerms, perm];
    }
  }

  async function copyKey() {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    }
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  onMount(fetchKeys);
</script>

<div class="page-header">
  <h1>API Keys</h1>
  <button class="btn btn-primary" onclick={() => { showForm = !showForm; createdKey = null; }}>
    {showForm ? 'Cancel' : '+ Create Key'}
  </button>
</div>

{#if createdKey}
  <div class="card key-reveal">
    <h3>🔑 Key Created — Copy Now!</h3>
    <p class="key-warning">This key will not be shown again.</p>
    <div class="key-display">
      <code>{createdKey}</code>
      <button class="btn btn-ghost btn-sm" onclick={copyKey}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  </div>
{/if}

{#if showForm}
  <div class="card form-card">
    <h3>Create New Key</h3>
    <div class="form-group">
      <label for="key-name">Key Name</label>
      <input id="key-name" type="text" placeholder="e.g. n8n-prod" bind:value={newKeyName} />
    </div>
    <div class="form-group">
      <span class="group-label">Permissions</span>
      <div class="perm-grid">
        {#each allPermissions as perm}
          <label class="perm-item">
            <input
              type="checkbox"
              checked={newKeyPerms.includes(perm)}
              onchange={() => togglePerm(perm)}
            />
            <span class="badge badge-muted">{perm}</span>
          </label>
        {/each}
      </div>
    </div>
    <button class="btn btn-primary" onclick={handleCreate}>Create Key</button>
  </div>
{/if}

{#if loading}
  <div class="empty-state">Loading...</div>
{:else if keyList.length === 0}
  <div class="card empty-state">
    <p>No API keys yet. Create one to authenticate API requests.</p>
  </div>
{:else}
  <div class="card" style="padding: 0;">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Permissions</th>
          <th>Created</th>
          <th>Last Used</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each keyList as key}
          <tr>
            <td class="key-name">{key.name}</td>
            <td>
              <div class="perm-badges">
                {#each key.permissions as perm}
                  <span class="badge badge-muted">{perm}</span>
                {/each}
              </div>
            </td>
            <td class="muted">{formatDate(key.createdAt)}</td>
            <td class="muted">{key.lastUsed ? formatDate(key.lastUsed) : 'Never'}</td>
            <td>
              <button class="btn btn-danger btn-sm" onclick={() => handleRevoke(key.id)}>
                Revoke
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .key-reveal {
    margin-bottom: 1rem;
    border-color: var(--warning);
    background: var(--warning-dim);
  }

  .key-warning {
    font-size: 0.8rem;
    color: var(--warning);
    margin: 0.25rem 0 0.75rem;
  }

  .key-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--bg);
    padding: 0.75rem;
    border-radius: var(--radius);
  }

  .key-display code {
    flex: 1;
    font-size: 0.85rem;
    word-break: break-all;
  }

  .form-card {
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin: 1rem 0;
  }

  .form-group label,
  .form-group .group-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-group input[type="text"] {
    width: 100%;
    max-width: 300px;
  }

  .perm-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .perm-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
  }

  .perm-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .key-name {
    font-weight: 600;
  }

  .muted {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  h3 {
    font-size: 1rem;
    font-weight: 600;
  }
</style>
