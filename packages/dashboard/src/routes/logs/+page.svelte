<script>
  import { onMount } from 'svelte';
  import { logs } from '$lib/api';

  let messageLogs = $state([]);
  let deliveryLogs = $state([]);
  let loading = $state(true);
  let activeTab = $state('messages');
  let pagination = $state({ total: 0, limit: 50, offset: 0 });

  async function fetchMessages(offset = 0) {
    loading = true;
    try {
      const result = await logs.messages(50, offset);
      messageLogs = result.data;
      pagination = result.pagination;
    } catch { /* ignore */ }
    loading = false;
  }

  async function fetchDeliveries() {
    loading = true;
    try {
      const result = await logs.deliveries(50);
      deliveryLogs = result.data;
    } catch { /* ignore */ }
    loading = false;
  }

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'messages') fetchMessages();
    else fetchDeliveries();
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function prevPage() {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchMessages(newOffset);
  }

  function nextPage() {
    const newOffset = pagination.offset + pagination.limit;
    if (newOffset < pagination.total) fetchMessages(newOffset);
  }

  onMount(() => fetchMessages());
</script>

<div class="page-header">
  <h1>Logs</h1>
  <div class="tab-bar">
    <button
      class="tab" class:active={activeTab === 'messages'}
      onclick={() => switchTab('messages')}
    >Messages</button>
    <button
      class="tab" class:active={activeTab === 'deliveries'}
      onclick={() => switchTab('deliveries')}
    >Deliveries</button>
  </div>
</div>

{#if loading}
  <div class="empty-state">Loading...</div>
{:else if activeTab === 'messages'}
  {#if messageLogs.length === 0}
    <div class="card empty-state">
      <p>No messages logged yet.</p>
    </div>
  {:else}
    <div class="card" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th>Direction</th>
            <th>Chat</th>
            <th>Type</th>
            <th>Summary</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {#each messageLogs as log}
            <tr>
              <td>
                <span class="badge" class:badge-success={log.direction === 'inbound'} class:badge-muted={log.direction === 'outbound'}>
                  {log.direction === 'inbound' ? '↓ In' : '↑ Out'}
                </span>
              </td>
              <td class="mono">{log.chatId}</td>
              <td><span class="badge badge-muted">{log.type}</span></td>
              <td class="summary-cell">{log.summary ?? '—'}</td>
              <td>
                {#if log.status}
                  <span class="badge badge-muted">{log.status}</span>
                {/if}
              </td>
              <td class="muted">{formatDate(log.timestamp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="btn btn-ghost btn-sm" onclick={prevPage}
        disabled={pagination.offset === 0}>← Prev</button>
      <span class="page-info">
        {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
      </span>
      <button class="btn btn-ghost btn-sm" onclick={nextPage}
        disabled={pagination.offset + pagination.limit >= pagination.total}>Next →</button>
    </div>
  {/if}
{:else}
  {#if deliveryLogs.length === 0}
    <div class="card empty-state">
      <p>No webhook deliveries logged yet.</p>
    </div>
  {:else}
    <div class="card" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Status</th>
            <th>Code</th>
            <th>Attempt</th>
            <th>Error</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {#each deliveryLogs as log}
            <tr>
              <td><span class="badge badge-muted">{log.eventType}</span></td>
              <td>
                <span class="badge" class:badge-success={log.success} class:badge-danger={!log.success}>
                  {log.success ? 'OK' : 'Failed'}
                </span>
              </td>
              <td class="mono">{log.statusCode ?? '—'}</td>
              <td>{log.attempt}</td>
              <td class="error-cell">{log.error ?? '—'}</td>
              <td class="muted">{formatDate(log.timestamp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
{/if}

<style>
  .tab-bar {
    display: flex;
    gap: 0.25rem;
    background: var(--bg-surface);
    border-radius: var(--radius);
    padding: 0.2rem;
    border: 1px solid var(--border);
  }

  .tab {
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-muted);
    background: transparent;
    transition: all var(--transition);
  }

  .tab:hover {
    color: var(--text);
  }

  .tab.active {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .summary-cell {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .error-cell {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--danger);
    font-size: 0.8rem;
  }

  .mono {
    font-family: monospace;
    font-size: 0.8rem;
  }

  .muted {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .page-info {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
