<script>
  import { onMount, onDestroy } from 'svelte';
  import { session } from '$lib/api';

  let status = $state('loading');
  let qrData = $state(null);
  let account = $state(null);
  let qrCanvas = $state(null);
  let pollInterval = $state(null);

  async function fetchStatus() {
    try {
      const data = await session.status();
      status = data.connection;
      account = data.account;

      if (data.qr && data.qr !== qrData) {
        qrData = data.qr;
        renderQr(data.qr);
      } else if (!data.qr) {
        qrData = null;
      }
    } catch {
      status = 'error';
    }
  }

  async function renderQr(data) {
    if (!qrCanvas) return;
    const QRCode = await import('qrcode');
    await QRCode.toCanvas(qrCanvas, data, {
      width: 280,
      margin: 2,
      color: { dark: '#e4e5e9', light: '#1a1d27' },
    });
  }

  async function handleLogout() {
    await session.logout();
    status = 'close';
    account = null;
  }

  async function handleRestart() {
    await session.restart();
    status = 'connecting';
  }

  onMount(() => {
    fetchStatus();
    pollInterval = setInterval(fetchStatus, 3000);
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });
</script>

<div class="page-header">
  <h1>Session</h1>
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

<div class="session-grid">
  {#if status === 'open'}
    <div class="card">
      <h3>Connected Account</h3>
      <p class="account-number">{account ?? 'Unknown'}</p>
      <div class="session-actions">
        <button class="btn btn-ghost btn-sm" onclick={handleRestart}>Restart</button>
        <button class="btn btn-danger btn-sm" onclick={handleLogout}>Logout</button>
      </div>
    </div>
  {:else if qrData}
    <div class="card qr-card">
      <h3>Scan QR Code</h3>
      <p class="qr-hint">Open WhatsApp → Linked Devices → Link a Device</p>
      <div class="qr-wrapper">
        <canvas bind:this={qrCanvas}></canvas>
      </div>
    </div>
  {:else if status === 'connecting' || status === 'loading'}
    <div class="card">
      <div class="empty-state">
        <div class="spinner"></div>
        <p>Connecting to WhatsApp...</p>
      </div>
    </div>
  {:else}
    <div class="card">
      <div class="empty-state">
        <p>Disconnected</p>
        <button class="btn btn-primary" onclick={handleRestart}>Reconnect</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .session-grid {
    display: grid;
    gap: 1rem;
  }

  .account-number {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0.75rem 0;
    font-variant-numeric: tabular-nums;
  }

  .session-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .qr-card {
    max-width: 360px;
  }

  .qr-hint {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0.5rem 0 1rem;
  }

  .qr-wrapper {
    display: flex;
    justify-content: center;
  }

  .qr-wrapper canvas {
    border-radius: var(--radius);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  h3 {
    font-size: 1rem;
    font-weight: 600;
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
</style>
