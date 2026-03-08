<script>
  import { onMount, onDestroy } from 'svelte';
  import { session, logs } from '$lib/api';

  let status = $state('loading');
  let qrData = $state(null);
  let account = $state(null);
  let metrics = $state(null);
  let stats = $state(null);
  let qrImage = $state(null);
  let recentActivity = $state([]);
  let pollInterval = $state(null);

  let connecting = $state(false);
  let showQrModal = $state(false);
  let showSuccessToast = $state(false);

  async function fetchStatus() {
    try {
      const data = await session.status();
      const prevStatus = status;
      status = data.connection;
      account = data.account;
      metrics = data.metrics;
      stats = data.stats;
      
      // Show success toast when transitioning to open
      if (prevStatus !== 'open' && prevStatus !== 'loading' && status === 'open') {
        showQrModal = false;
        showSuccessToast = true;
        setTimeout(() => { showSuccessToast = false; }, 5000);
      }
      
      if (data.qr && data.qr !== qrData) {
        qrData = data.qr;
        const QRCode = await import('qrcode');
        qrImage = await QRCode.toDataURL(data.qr, {
          width: 280,
          margin: 2,
          color: { dark: '#e4e5e9', light: '#1a1d27' },
        });
        
        if (status === 'connecting') {
           showQrModal = true;
        }
      } else if (!data.qr) {
        qrData = null;
        qrImage = null;
        if (status === 'open') showQrModal = false;
      }
    } catch {
      status = 'error';
    }
  }

  async function fetchLogs() {
    try {
      const [msgRes, delRes] = await Promise.all([
        logs.messages(15, 0),
        logs.deliveries(15)
      ]);
      
      const mixed = [
        ...msgRes.data.map(m => ({ ...m, _kind: 'message' })),
        ...delRes.data.map(d => ({ ...d, _kind: 'delivery' }))
      ];
      
      // Sort descending by timestamp
      mixed.sort((a, b) => b.timestamp - a.timestamp);
      recentActivity = mixed.slice(0, 15);
    } catch { /* ignore */ }
  }

  async function handleLogout() {
    connecting = true;
    await session.logout();
    status = 'close';
    account = null;
    qrData = null;
    qrImage = null;
    showQrModal = false;
    connecting = false;
  }

  async function handleNewSession() {
    connecting = true;
    try {
      await session.logout();
      await session.restart();
      status = 'connecting';
      showQrModal = true;
    } catch {
      status = 'error';
    }
    qrData = null;
    qrImage = null;
    connecting = false;
  }

  async function handleRestart() {
    connecting = true;
    await session.restart();
    status = 'connecting';
    qrData = null;
    qrImage = null;
    connecting = false;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  onMount(() => {
    fetchStatus();
    fetchLogs();
    
    // Status polls frequently for QR, logs poll less frequently
    pollInterval = setInterval(() => {
        fetchStatus();
        fetchLogs();
    }, 3000);
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });
</script>

{#if showSuccessToast}
  <div class="toast toast-success">
    ✓ Connected successfully to WhatsApp!
  </div>
{/if}

{#if showQrModal}
  <div class="modal-backdrop">
    <div class="modal card">
      <div class="modal-header">
        <h3>Link WhatsApp</h3>
        <button class="btn-close" onclick={() => showQrModal = false}>×</button>
      </div>
      {#if qrImage}
        <p class="qr-hint">Open WhatsApp → Linked Devices → Link a Device</p>
        <div class="qr-wrapper">
          <img src={qrImage} alt="WhatsApp QR Code" />
        </div>
      {:else}
        <div class="empty-state" style="padding: 3rem 1rem;">
          <div class="spinner"></div>
          <p>Generating QR Code...</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<div class="page-header">
  <div>
    <h1>WADock Monitor</h1>
    <p class="subtitle" style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.2rem;">System health & connection status</p>
  </div>
  <div class="header-actions">
    {#if status === 'open'}
      <span class="badge badge-success">Connected</span>
    {:else if status === 'connecting' || status === 'loading'}
      <span class="badge badge-warning">Connecting...</span>
    {:else}
      <span class="badge badge-danger">Disconnected</span>
    {/if}
  </div>
</div>

<!-- TOP ROW: KPI Metrics & System Info -->
<div class="dashboard-grid top-tiles" style="margin-bottom: 1.5rem;">
  <div class="card stat-card">
    <span class="stat-label">Messages In (24h)</span>
    <span class="stat-value">{stats?.messages?.in ?? 0}</span>
  </div>
  <div class="card stat-card">
    <span class="stat-label">Messages Out (24h)</span>
    <span class="stat-value">{stats?.messages?.out ?? 0}</span>
  </div>
  <div class="card stat-card">
    <span class="stat-label">Webhook Success</span>
    <span class="stat-value" class:danger={stats?.deliveries?.total > 0 && (stats?.deliveries?.success / stats?.deliveries?.total) < 0.8}>
      {stats?.deliveries?.total > 0 ? Math.round((stats?.deliveries?.success / stats?.deliveries?.total) * 100) : 100}%
    </span>
  </div>
  <div class="card stat-card">
    <span class="stat-label">System Memory</span>
    {#if metrics}
      <span class="stat-value">{formatBytes(metrics.totalMem - metrics.freeMem)} <span class="stat-limit">/ {formatBytes(metrics.totalMem)}</span></span>
    {:else}
      <span class="stat-value">—</span>
    {/if}
  </div>
</div>

<div class="dashboard-main">
  <!-- LEFT COLUMN: Server Status & WhatsApp Session -->
  <div class="col-left">
    {#if metrics}
      <div class="card sys-info">
        <div class="sys-row">
          <span class="sys-label">OS Platform</span>
          <span class="sys-val">{metrics.os}</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">Uptime</span>
          <span class="sys-val">{formatUptime(metrics.uptime)}</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">CPU Load</span>
          <span class="sys-val">{metrics.cpuLoad}% <span class="muted">({metrics.cpuCores} cores)</span></span>
        </div>
      </div>
    {/if}

    <div class="card session-card">
      <h3 style="margin-bottom: 1rem;">WhatsApp Session</h3>
      {#if status === 'open'}
        <p class="account-number">{account ?? 'Unknown'}</p>
        <p class="muted" style="margin-bottom: 1.5rem; font-size: 0.85rem;">Device is connected and routing messages.</p>
        <div class="session-actions">
          <button class="btn btn-ghost btn-sm" onclick={handleRestart}>Restart</button>
          <button class="btn btn-danger btn-sm" onclick={handleLogout}>Logout</button>
        </div>
      {:else if status === 'connecting' || status === 'loading'}
        <div class="empty-state">
          <div class="spinner"></div>
          <p>Connecting to WhatsApp...</p>
          {#if qrImage && !showQrModal}
             <button class="btn btn-ghost btn-sm" style="margin-top: 1rem;" onclick={() => showQrModal = true}>
               Show QR Code
             </button>
          {/if}
        </div>
      {:else}
        <div class="empty-state">
          <p style="margin-bottom: 0.5rem;">Disconnected</p>
          <div class="session-actions" style="justify-content: center; margin-top: 1rem; display: flex; flex-direction: column;">
            <button class="btn btn-primary" onclick={handleRestart} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Reconnect Existing'}
            </button>
            <button class="btn btn-ghost" onclick={handleNewSession} disabled={connecting}>
              Connect New Session
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- RIGHT COLUMN: Unified Activity Stream -->
  <div class="col-right">
    <div class="card" style="height: 100%; display: flex; flex-direction: column; padding: 0;">
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);">
        <h3 style="margin: 0; font-size: 1rem;">Live Activity Feed</h3>
      </div>
      
      <div class="activity-feed">
        {#if recentActivity.length === 0}
          <div class="empty-state" style="padding: 2rem;">No recent activity in the last 24 hours.</div>
        {:else}
          {#each recentActivity as item}
            <div class="activity-item">
              <div class="activity-time">{formatTime(item.timestamp)}</div>
              
              {#if item._kind === 'message'}
                <div class="activity-icon" class:inbound={item.direction === 'inbound'}>
                  {item.direction === 'inbound' ? '↓' : '↑'}
                </div>
                <div class="activity-content">
                  <div class="activity-title">
                    WhatsApp Message <span class="badge badge-muted">{item.type}</span>
                  </div>
                  <div class="activity-desc">
                    {item.direction === 'inbound' ? 'From' : 'To'} {item.chatId}: {item.summary ?? ''}
                  </div>
                </div>
              {:else}
                <div class="activity-icon" class:failed={!item.success} class:webhook={item.success}>
                  🔗
                </div>
                <div class="activity-content">
                  <div class="activity-title">
                    Webhook Trigger <span class="badge" class:badge-success={item.success} class:badge-danger={!item.success}>{item.success ? 'OK' : 'FAIL'}</span>
                  </div>
                  <div class="activity-desc">
                    Event: {item.eventType} {item.error ? `- ${item.error}` : ''}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard-main {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .col-left {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Metric Cards */
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.25rem;
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
  }

  .stat-value.danger {
    color: var(--danger);
  }

  .stat-limit {
    font-size: 1rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  /* System Info Minimal List */
  .sys-info {
    padding: 1rem 1.25rem;
  }

  .sys-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    font-size: 0.875rem;
  }

  .sys-row:not(:last-child) {
    border-bottom: 1px solid var(--border);
  }

  .sys-label {
    color: var(--text-muted);
  }

  .sys-val {
    font-weight: 500;
  }

  /* Session Display */
  .account-number {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
    font-variant-numeric: tabular-nums;
  }

  .session-actions {
    display: flex;
    gap: 0.5rem;
  }

  .muted {
    color: var(--text-muted);
  }

  /* Activity Feed */
  .activity-feed {
    flex: 1;
    overflow-y: auto;
    max-height: 500px;
    padding: 0.5rem 0;
  }

  .activity-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    align-items: flex-start;
  }

  .activity-item:hover {
    background: var(--bg-surface);
  }

  .activity-item:not(:last-child) {
    border-bottom: 1px solid var(--border);
  }

  .activity-time {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-family: monospace;
    width: 45px;
    flex-shrink: 0;
    padding-top: 0.2rem;
  }

  .activity-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    background: var(--bg-surface);
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .activity-icon.inbound {
    background: rgba(34, 197, 94, 0.15);
    color: var(--success);
  }

  .activity-icon.webhook {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6; /* Blueish for webhook */
  }

  .activity-icon.failed {
    background: rgba(239, 68, 68, 0.15);
    color: var(--danger);
  }

  .activity-content {
    flex: 1;
    min-width: 0;
  }

  .activity-title {
    font-size: 0.9rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.1rem;
  }

  .activity-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    width: 100%;
    max-width: 400px;
    padding: 1.5rem;
    animation: scaleIn 0.2s ease-out;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }

  .btn-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 0.25rem;
  }

  .btn-close:hover {
    color: var(--text);
  }

  .qr-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0.5rem 0 1.5rem;
    text-align: center;
  }

  .qr-wrapper {
    display: flex;
    justify-content: center;
    background: var(--bg);
    padding: 1rem;
    border-radius: var(--radius);
  }

  .qr-wrapper img {
    border-radius: 4px;
    display: block;
    max-width: 100%;
  }

  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  /* Toast Styles */
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: var(--radius);
    background: var(--bg-surface);
    color: var(--text);
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1100;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-success {
    border-left: 4px solid var(--success);
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
