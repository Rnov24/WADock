<script>
  import { onMount } from 'svelte';
  import { webhooks } from '$lib/api';

  let webhookList = $state([]);
  let loading = $state(true);
  let showForm = $state(false);
  let editingId = $state(null);

  let formUrl = $state('');
  let formEvents = $state([]);
  let formSecret = $state('');

  const eventTypes = [
    { value: '*', label: 'All Events' },
    { value: 'message.incoming', label: 'Incoming Messages' },
    { value: 'message.sent', label: 'Sent Messages' },
    { value: 'message.status', label: 'Status Updates' },
    { value: 'connection.update', label: 'Connection Updates' },
  ];

  async function fetchWebhooks() {
    loading = true;
    try {
      webhookList = await webhooks.list();
    } catch { /* ignore */ }
    loading = false;
  }

  function resetForm() {
    formUrl = '';
    formEvents = [];
    formSecret = '';
    editingId = null;
    showForm = false;
  }

  function startEdit(wh) {
    formUrl = wh.url;
    formEvents = [...wh.events];
    formSecret = '';
    editingId = wh.id;
    showForm = true;
  }

  function toggleEvent(evt) {
    if (evt === '*') {
      formEvents = formEvents.includes('*') ? [] : ['*'];
      return;
    }
    formEvents = formEvents.filter(e => e !== '*');
    if (formEvents.includes(evt)) {
      formEvents = formEvents.filter(e => e !== evt);
    } else {
      formEvents = [...formEvents, evt];
    }
  }

  async function handleSubmit() {
    if (!formUrl.trim() || formEvents.length === 0) return;
    try {
      if (editingId) {
        await webhooks.update(editingId, {
          url: formUrl,
          events: formEvents,
          ...(formSecret ? { secret: formSecret } : {}),
        });
      } else {
        await webhooks.create(formUrl, formEvents, formSecret || undefined);
      }
      resetForm();
      await fetchWebhooks();
    } catch { /* ignore */ }
  }

  async function handleToggle(wh) {
    await webhooks.update(wh.id, { active: !wh.active });
    await fetchWebhooks();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this webhook?')) return;
    await webhooks.remove(id);
    await fetchWebhooks();
  }

  onMount(fetchWebhooks);
</script>

<div class="page-header">
  <h1>Webhooks</h1>
  <button class="btn btn-primary" onclick={() => { if (showForm) resetForm(); else showForm = true; }}>
    {showForm ? 'Cancel' : '+ Add Webhook'}
  </button>
</div>

{#if showForm}
  <div class="card form-card">
    <h3>{editingId ? 'Edit Webhook' : 'New Webhook'}</h3>
    <div class="form-group">
      <label for="wh-url">Webhook URL</label>
      <input id="wh-url" type="url" placeholder="https://n8n.example.com/webhook/..." bind:value={formUrl} />
    </div>
    <div class="form-group">
      <label>Events</label>
      <div class="event-grid">
        {#each eventTypes as evt}
          <label class="event-item">
            <input
              type="checkbox"
              checked={formEvents.includes(evt.value)}
              onchange={() => toggleEvent(evt.value)}
            />
            <span>{evt.label}</span>
          </label>
        {/each}
      </div>
    </div>
    <div class="form-group">
      <label for="wh-secret">Webhook Secret (optional)</label>
      <input id="wh-secret" type="text" placeholder="HMAC signing secret" bind:value={formSecret} />
    </div>
    <button class="btn btn-primary" onclick={handleSubmit}>
      {editingId ? 'Update' : 'Create'}
    </button>
  </div>
{/if}

{#if loading}
  <div class="empty-state">Loading...</div>
{:else if webhookList.length === 0}
  <div class="card empty-state">
    <p>No webhooks configured. Add one to receive WhatsApp events in n8n.</p>
  </div>
{:else}
  <div class="card" style="padding: 0;">
    <table>
      <thead>
        <tr>
          <th>URL</th>
          <th>Events</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each webhookList as wh}
          <tr>
            <td class="url-cell">
              <code>{wh.url}</code>
              {#if wh.secret}
                <span class="badge badge-muted" style="margin-left: 0.5rem;">signed</span>
              {/if}
            </td>
            <td>
              <div class="event-badges">
                {#each wh.events as evt}
                  <span class="badge badge-muted">{evt}</span>
                {/each}
              </div>
            </td>
            <td>
              <button
                class="badge"
                class:badge-success={wh.active}
                class:badge-danger={!wh.active}
                onclick={() => handleToggle(wh)}
                style="cursor: pointer;"
              >
                {wh.active ? 'Active' : 'Inactive'}
              </button>
            </td>
            <td>
              <div class="action-btns">
                <button class="btn btn-ghost btn-sm" onclick={() => startEdit(wh)}>Edit</button>
                <button class="btn btn-danger btn-sm" onclick={() => handleDelete(wh.id)}>Delete</button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .form-card {
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin: 1rem 0;
  }

  .form-group label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-group input[type="url"],
  .form-group input[type="text"] {
    width: 100%;
    max-width: 500px;
  }

  .event-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .event-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .event-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .url-cell code {
    font-size: 0.8rem;
    word-break: break-all;
  }

  .action-btns {
    display: flex;
    gap: 0.5rem;
  }

  h3 {
    font-size: 1rem;
    font-weight: 600;
  }
</style>
