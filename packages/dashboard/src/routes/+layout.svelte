<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { children } = $props();
  let authenticated = $state(false);
  let loading = $state(true);
  let loginPassword = $state('');
  let loginError = $state('');

  const navItems = [
    { href: '/', label: 'Session', icon: '📡' },
    { href: '/keys', label: 'API Keys', icon: '🔑' },
    { href: '/webhooks', label: 'Webhooks', icon: '🔗' },
  ];

  onMount(async () => {
    try {
      await admin.me();
      authenticated = true;
    } catch {
      authenticated = false;
    }
    loading = false;
  });

  async function handleLogin() {
    loginError = '';
    try {
      await admin.login(loginPassword);
      authenticated = true;
    } catch (e) {
      loginError = 'Invalid password';
    }
  }

  async function handleLogout() {
    await admin.logout();
    authenticated = false;
    loginPassword = '';
  }
</script>

{#if loading}
  <div class="loading-screen">
    <div class="spinner"></div>
  </div>
{:else if !authenticated}
  <div class="login-screen">
    <div class="login-card card">
      <div class="login-logo">📡 WADock</div>
      <p class="login-subtitle">Admin Dashboard</p>
      <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <input
          type="password"
          placeholder="Admin password"
          bind:value={loginPassword}
          class="login-input"
        />
        {#if loginError}
          <p class="login-error">{loginError}</p>
        {/if}
        <button type="submit" class="btn btn-primary login-btn">Login</button>
      </form>
    </div>
  </div>
{:else}
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo">📡 WADock</span>
      </div>
      <nav class="sidebar-nav">
        {#each navItems as item}
          <a
            href={item.href}
            class="nav-item"
            class:active={$page.url.pathname === item.href}
          >
            <span class="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
      <div class="sidebar-footer">
        <button class="btn btn-ghost btn-sm" onclick={handleLogout}>Logout</button>
      </div>
    </aside>
    <main class="main-content">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* --- Login --- */
  .login-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .login-card {
    width: 100%;
    max-width: 360px;
    text-align: center;
  }

  .login-logo {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .login-subtitle {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  .login-input {
    width: 100%;
    margin-bottom: 0.75rem;
  }

  .login-error {
    color: var(--danger);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .login-btn {
    width: 100%;
    justify-content: center;
  }

  /* --- App shell --- */
  .app-shell {
    display: flex;
    min-height: 100vh;
  }

  .sidebar {
    width: 220px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
  }

  .sidebar-header {
    padding: 1.25rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .logo {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .sidebar-nav {
    flex: 1;
    padding: 0.5rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius);
    color: var(--text-muted);
    font-size: 0.875rem;
    font-weight: 500;
    transition: all var(--transition);
    text-decoration: none;
  }

  .nav-item:hover {
    background: var(--bg-elevated);
    color: var(--text);
  }

  .nav-item.active {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .nav-icon {
    font-size: 1rem;
  }

  .sidebar-footer {
    padding: 1rem;
    border-top: 1px solid var(--border);
  }

  .main-content {
    flex: 1;
    margin-left: 220px;
    padding: 2rem;
    max-width: 960px;
  }
</style>
