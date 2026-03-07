<script>
  import { onMount, onDestroy } from 'svelte';
  import { session } from '$lib/api';

  let status = $state('loading');
  let qrData = $state(null);
  let account = $state(null);
  let qrImage = $state(null);
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
        
        // Auto show modal if we are connecting and get a QR
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

  onMount(() => {
    fetchStatus();
    pollInterval = setInterval(fetchStatus, 3000);
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
  {:else if status === 'connecting' || status === 'loading'}
    <div class="card">
      <div class="empty-state">
        <div class="spinner"></div>
        <p>Connecting to WhatsApp...</p>
        {#if qrImage && !showQrModal}
           <button class="btn btn-ghost btn-sm" style="margin-top: 1rem;" onclick={() => showQrModal = true}>
             Show QR Code
           </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="card">
      <div class="empty-state">
        <p>Disconnected</p>
        <div class="session-actions" style="justify-content: center; margin-top: 1rem;">
          <button class="btn btn-primary" onclick={handleRestart} disabled={connecting}>
            {connecting ? 'Connecting...' : 'Reconnect Existing'}
          </button>
          <button class="btn btn-ghost" onclick={handleNewSession} disabled={connecting}>
            Connect New Session
          </button>
        </div>
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
