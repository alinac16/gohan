<script>
	import '../app.css';
	import Logo from '$lib/Logo.svelte';
	import { INSTAGRAM_URL } from '$lib/siteUrls.js';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<div class="layout">
	<header class="site-header">
		<a href="/" class="logo" aria-label="Gohan Diary — home">
			<Logo variant="header" />
		</a>

		<nav class="site-nav">
			<a href="/" class:active={$page.url.pathname === '/'}>recipes</a>
			<a href="/admin/new" class="nav-add" class:active={$page.url.pathname.startsWith('/admin')}>add recipe</a>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="site-footer">
		<div class="footer-brand">
			<Logo variant="footer" />
			<p class="footer-line">Made with rice &amp; love 🍚</p>
			<p class="footer-social">
				<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">@gohan.diaryy on Instagram</a>
			</p>
		</div>
	</footer>
</div>

<style>
	/* ── Layout ── */
	.layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ── Header ── */
	.site-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 2rem;
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		border-bottom: 3px solid var(--navy-deep);
		position: sticky;
		top: 0;
		z-index: 100;
		backdrop-filter: blur(12px);
		box-shadow: var(--shadow-navy);
	}

	.logo {
		display: inline-flex;
		align-items: center;
		text-decoration: none;
		line-height: 0;
		transition: opacity 0.2s;
	}
	.logo:hover {
		opacity: 0.88;
	}

	.site-nav {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.site-nav a {
		font-family: 'Fredoka', system-ui, sans-serif;
		color: var(--navy-deep);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		transition: color 0.2s;
	}

	.site-nav a:hover,
	.site-nav a.active {
		color: var(--terracotta);
	}

	.nav-add {
		font-weight: 500;
		font-size: 0.84rem;
		color: var(--text-light);
		letter-spacing: 0.06em;
	}

	.nav-add:hover,
	.nav-add.active {
		color: var(--terracotta);
	}

	/* ── Main & footer ── */
	main {
		flex: 1;
	}

	.site-footer {
		text-align: center;
		padding: 2.25rem 2rem 2.5rem;
		background: linear-gradient(180deg, var(--navy-mid) 0%, var(--navy-deep) 100%);
		color: var(--text-on-navy);
		font-size: 0.9rem;
		border-top: none;
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.footer-line {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 600;
		opacity: 0.92;
	}

	.footer-social {
		margin: 0.65rem 0 0;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.footer-social a {
		color: rgba(255, 213, 79, 0.95);
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.footer-social a:hover {
		opacity: 0.88;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
