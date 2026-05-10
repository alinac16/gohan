<script>
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	let cursorX = $state(-100);
	let cursorY = $state(-100);
	let isScooping = $state(false);

	function onMouseMove(e) {
		cursorX = e.clientX;
		cursorY = e.clientY;
	}

	function onGlobalClick() {
		isScooping = true;
		setTimeout(() => {
			isScooping = false;
		}, 480);
	}
</script>

<svelte:window onmousemove={onMouseMove} onclick={onGlobalClick} />

<!-- Custom spoon cursor -->
<div
	class="spoon-cursor"
	class:scooping={isScooping}
	style="left:{cursorX}px;top:{cursorY}px"
	aria-hidden="true"
>
	<img
		class="spoon-img"
		src="/img/spoon.svg"
		width="32"
		height="32"
		alt=""
		draggable="false"
	/>
</div>

<div class="layout">
	<header class="site-header">
		<a href="/" class="logo">Gohan Diary</a>

		<nav class="site-nav">
			<a href="/" class:active={$page.url.pathname === '/'}>Recipes</a>
			<a href="/admin/new" class="btn-add">+ New Recipe</a>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="site-footer">
		<p>Gohan Diary — made with rice &amp; love 🍚</p>
	</footer>
</div>

<style>
	/* ── Custom cursor ── */
	:global(*) {
		cursor: none !important;
	}

	.spoon-cursor {
		position: fixed;
		top: 0;
		left: 0;
		width: 32px;
		height: 32px;
		pointer-events: none;
		z-index: 9999;
		transform: translate(-6px, -4px);
		will-change: transform;
	}

	.spoon-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}

	.spoon-cursor.scooping {
		animation: scoop 0.48s cubic-bezier(0.4, 0, 0.2, 1);
	}

	@keyframes scoop {
		0% {
			transform: translate(-6px, -4px) rotate(0deg);
		}
		20% {
			transform: translate(-18px, 8px) rotate(-28deg);
		}
		50% {
			transform: translate(-4px, -20px) rotate(18deg);
		}
		80% {
			transform: translate(8px, -10px) rotate(-8deg);
		}
		100% {
			transform: translate(-6px, -4px) rotate(0deg);
		}
	}

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
		padding: 0.9rem 2rem;
		background: var(--cream);
		border-bottom: 2px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
		backdrop-filter: blur(8px);
	}

	.logo {
		font-family: 'Caveat', cursive;
		font-size: 2.1rem;
		font-weight: 700;
		color: var(--terracotta);
		text-decoration: none;
		line-height: 1;
		letter-spacing: -0.01em;
	}

	.site-nav {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.site-nav a {
		color: var(--text-medium);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		transition: color 0.2s;
	}

	.site-nav a:hover,
	.site-nav a.active {
		color: var(--terracotta);
	}

	.btn-add {
		background: var(--terracotta) !important;
		color: white !important;
		padding: 0.4rem 1.1rem;
		border-radius: 20px;
		font-size: 0.85rem !important;
		transition: background 0.2s !important;
	}
	.btn-add:hover {
		background: var(--warm-brown) !important;
	}

	/* ── Main & footer ── */
	main {
		flex: 1;
	}

	.site-footer {
		text-align: center;
		padding: 2rem;
		color: var(--text-light);
		font-size: 0.85rem;
		border-top: 1px solid var(--border);
	}
</style>
