<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import BioAside from '$lib/BioAside.svelte';
	import Logo from '$lib/Logo.svelte';
	import { compareTagsInCategory, sortTagsForCategory } from '$lib/tagOrder.js';

	let { data } = $props();

	let searchQuery = $state('');
	let selectedTags = $state(new Set());
	let hydratedTagsFromUrl = $state(false);

	const categoryOrder = ['protein', 'complexity', 'time'];

	const categoryRank = /** @type {Record<string, number>} */ ({
		protein: 0,
		complexity: 1,
		time: 2
	});

	const tagsByCategory = $derived.by(() => {
		const groups = {};
		for (const tag of data.tags) {
			if (!groups[tag.category]) groups[tag.category] = [];
			groups[tag.category].push(tag);
		}
		for (const key of Object.keys(groups)) {
			groups[key] = sortTagsForCategory(groups[key], key);
		}
		return groups;
	});

	const filteredRecipes = $derived.by(() => {
		let result = data.recipes;

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(r) =>
					r.title.toLowerCase().includes(q) ||
					(r.description ?? '').toLowerCase().includes(q) ||
					(r.ingredients ?? '').toLowerCase().includes(q)
			);
		}

		if (selectedTags.size > 0) {
			result = result.filter(r => {
				const ids = new Set(
					(r.recipe_tags ?? []).map(rt => rt.tags?.id).filter(Boolean)
				);
				return [...selectedTags].every(id => ids.has(id));
			});
		}

		return result;
	});

	const categoryLabel = {
		protein: 'Protein',
		complexity: 'Complexity',
		time: 'Time'
	};


	const selectedTagObjects = $derived.by(() => {
		const byId = new Map(data.tags.map((t) => [t.id, t]));
		const list = [...selectedTags].map((id) => byId.get(id)).filter(Boolean);
		list.sort((a, b) => {
			const ra = categoryRank[a.category] ?? 99;
			const rb = categoryRank[b.category] ?? 99;
			if (ra !== rb) return ra - rb;
			return compareTagsInCategory(a, b, a.category);
		});
		return list;
	});

	/** Tags on a recipe card: protein → complexity → time, then name. */
	function sortedRecipeTags(recipe) {
		const rts = (recipe.recipe_tags ?? []).filter((rt) => rt.tags);
		return [...rts].sort((a, b) => {
			const ca = a.tags.category;
			const cb = b.tags.category;
			const ra = categoryRank[ca] ?? 99;
			const rb = categoryRank[cb] ?? 99;
			if (ra !== rb) return ra - rb;
			return compareTagsInCategory(a.tags, b.tags, ca);
		});
	}

	function syncTagsToUrl(tagsSet) {
		if (!browser) return;
		const path = window.location.pathname;
		const q =
			tagsSet.size > 0 ? `?tags=${encodeURIComponent([...tagsSet].join(','))}` : '';
		goto(`${path}${q}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		if (!browser || hydratedTagsFromUrl || !data.tags?.length) return;
		const params = new URLSearchParams(window.location.search);
		const raw = params.get('tags');
		if (raw) {
			const valid = new Set(data.tags.map((t) => t.id));
			const ids = raw
				.split(',')
				.map((s) => s.trim())
				.filter((id) => valid.has(id));
			if (ids.length > 0) selectedTags = new Set(ids);
		}
		hydratedTagsFromUrl = true;
	});

	function toggleTag(tagId) {
		const next = new Set(selectedTags);
		next.has(tagId) ? next.delete(tagId) : next.add(tagId);
		selectedTags = next;
		syncTagsToUrl(next);
	}

	function clearFilters() {
		searchQuery = '';
		selectedTags = new Set();
		syncTagsToUrl(new Set());
	}

	function stars(rating) {
		return Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('');
	}
</script>

<svelte:head>
	<title>Gohan Diary — Recipe Collection</title>
</svelte:head>

<div class="page">
	<!-- Hero -->
	<section class="hero">
		<h1 class="hero-brand">
			<Logo variant="hero" />
		</h1>
		<p class="hero-sub">A personal collection of recipes, flavours &amp; memories</p>
	</section>

	<div class="home-layout">
		<div class="home-main">
			<!-- Search bar -->
			<div class="search-wrap">
				<svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="9" cy="9" r="6"/>
					<line x1="13.5" y1="13.5" x2="18" y2="18"/>
				</svg>
				<input
					type="text"
					class="search-input"
					placeholder="Search recipes…"
					bind:value={searchQuery}
					aria-label="Search recipes"
				/>
				{#if searchQuery || selectedTags.size > 0}
					<button class="clear-btn" onclick={clearFilters}>Clear</button>
				{/if}
			</div>

			<section class="tag-filter-section" aria-labelledby="tag-filter-heading">
				<h3 id="tag-filter-heading" class="filter-heading">Filter by tags</h3>
				<p class="filter-hint">
					Select one or more tags. A recipe must have <strong>all</strong> selected tags to appear (narrowing filters).
					Filters update the page link so you can bookmark or share.
				</p>

				{#if selectedTags.size > 0}
					<div class="active-tag-summary" aria-live="polite">
						<span class="active-tag-summary-label">Active:</span>
						{#each selectedTagObjects as t (t.id)}
							<button type="button" class="active-tag-chip" onclick={() => toggleTag(t.id)}>
								{t.name}
								<span class="active-tag-remove" aria-hidden="true">×</span>
							</button>
						{/each}
					</div>
				{/if}

				{#if data.tags.length === 0}
					<p class="filter-empty-tags">No tags in the library yet. Add tags on a recipe page to filter here.</p>
				{:else}
					{#each categoryOrder.filter((c) => tagsByCategory[c]?.length) as category}
						<div class="tag-row">
							<span class="tag-cat-label">{categoryLabel[category] ?? category}</span>
							<div class="chip-list">
								{#each tagsByCategory[category] as tag}
									<button
										type="button"
										class="chip"
										class:active={selectedTags.has(tag.id)}
										onclick={() => toggleTag(tag.id)}
										aria-pressed={selectedTags.has(tag.id)}
									>
										{tag.name}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</section>

			<!-- Recipe grid -->
			{#if filteredRecipes.length === 0}
				<div class="empty">
					{#if data.recipes.length === 0}
						<p>No recipes yet — <a href="/admin/new">add the first one!</a></p>
					{:else}
						<p>
							No recipes match your search or tag filters.
							<button class="link-btn" onclick={clearFilters}>Clear filters</button>
						</p>
					{/if}
				</div>
			{:else}
				<div class="recipe-grid">
					{#each filteredRecipes as recipe (recipe.id)}
						<a href="/recipe/{recipe.id}" class="recipe-card">
							<div class="card-img-wrap">
								{#if recipe.image_url}
									<img src={recipe.image_url} alt={recipe.title} loading="lazy" />
								{:else}
									<div class="card-img-placeholder">🍜</div>
								{/if}
								{#if recipe.rating}
									<div class="card-rating">{stars(recipe.rating)}</div>
								{/if}
							</div>
							<div class="card-body">
								<h2 class="card-title">{recipe.title}</h2>
								{#if recipe.description}
									<p class="card-desc">
										{recipe.description.length > 90
											? recipe.description.slice(0, 90) + '…'
											: recipe.description}
									</p>
								{/if}
								{#if recipe.recipe_tags?.length}
									<div class="card-tags">
										{#each sortedRecipeTags(recipe).slice(0, 4) as rt}
											{#if rt.tags}
												<span class="tag-mini">{rt.tags.name}</span>
											{/if}
										{/each}
									</div>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<BioAside />
	</div>
</div>

<style>
	.page { padding-bottom: 5rem; }

	/* Hero */
	.hero {
		text-align: center;
		padding: 4.25rem 2rem 3.25rem;
		background: linear-gradient(155deg, var(--navy-deep) 0%, var(--navy-mid) 48%, #2a4a73 100%);
		border-bottom: none;
		position: relative;
		overflow: hidden;
	}

	.hero::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		background:
			radial-gradient(circle at 15% 25%, rgba(236, 90, 50, 0.18) 0%, transparent 38%),
			radial-gradient(circle at 88% 75%, rgba(255, 213, 79, 0.08) 0%, transparent 35%);
		pointer-events: none;
	}

	/* Dense tile: same emoji set on a 6×5 grid (~30 icons / 560px repeat) */
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		opacity: 1;
		background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22560%22%20height%3D%22560%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22k%22%20width%3D%22560%22%20height%3D%22560%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Cg%20opacity%3D%220.38%22%20font-family%3D%22system-ui%2CApple%20Color%20Emoji%2CSegoe%20UI%20Emoji%2Csans-serif%22%20font-size%3D%2252%22%3E%3Ctext%20transform%3D%22translate(38%2052)%20rotate(-11)%22%3E%F0%9F%A7%82%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(135%2052)%20rotate(7)%22%3E%F0%9F%A5%84%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(232%2052)%20rotate(-5)%22%3E%F0%9F%AB%99%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(328%2052)%20rotate(9)%22%3E%F0%9F%A7%84%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(425%2052)%20rotate(-8)%22%3E%F0%9F%8C%BF%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(522%2052)%20rotate(6)%22%3E%F0%9F%8D%9A%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(48%20166)%20rotate(-10)%22%3E%F0%9F%A5%A2%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(145%20166)%20rotate(4)%22%3E%F0%9F%8D%8B%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(241%20166)%20rotate(-6)%22%3E%F0%9F%AB%92%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(338%20166)%20rotate(8)%22%3E%F0%9F%94%AA%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(435%20166)%20rotate(-4)%22%3E%F0%9F%A7%88%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(532%20166)%20rotate(10)%22%3E%F0%9F%A7%82%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(38%20280)%20rotate(-7)%22%3E%F0%9F%A5%84%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(135%20280)%20rotate(5)%22%3E%F0%9F%AB%99%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(232%20280)%20rotate(-11)%22%3E%F0%9F%A7%84%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(328%20280)%20rotate(7)%22%3E%F0%9F%8C%BF%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(425%20280)%20rotate(-5)%22%3E%F0%9F%8D%9A%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(522%20280)%20rotate(9)%22%3E%F0%9F%A5%A2%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(48%20394)%20rotate(-8)%22%3E%F0%9F%8D%8B%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(145%20394)%20rotate(6)%22%3E%F0%9F%AB%92%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(241%20394)%20rotate(-10)%22%3E%F0%9F%94%AA%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(338%20394)%20rotate(4)%22%3E%F0%9F%A7%88%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(435%20394)%20rotate(-6)%22%3E%F0%9F%A7%82%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(532%20394)%20rotate(8)%22%3E%F0%9F%A5%84%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(38%20508)%20rotate(-4)%22%3E%F0%9F%AB%99%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(135%20508)%20rotate(10)%22%3E%F0%9F%A7%84%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(232%20508)%20rotate(-7)%22%3E%F0%9F%8C%BF%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(328%20508)%20rotate(5)%22%3E%F0%9F%8D%9A%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(425%20508)%20rotate(-11)%22%3E%F0%9F%A5%A2%3C%2Ftext%3E%3Ctext%20transform%3D%22translate(522%20508)%20rotate(7)%22%3E%F0%9F%8D%8B%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fpattern%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23k)%22%2F%3E%3C%2Fsvg%3E");
		background-size: 560px 560px;
		background-repeat: repeat;
		mix-blend-mode: soft-light;
	}

	.hero-brand {
		position: relative;
		z-index: 2;
		margin: 0 0 0.65rem;
		line-height: 0;
		filter: drop-shadow(0 6px 28px rgba(0, 0, 0, 0.35));
	}

	.hero-sub {
		position: relative;
		z-index: 2;
		color: rgba(255, 255, 255, 0.9);
		font-size: 1.08rem;
		font-weight: 600;
		font-style: normal;
		letter-spacing: 0.04em;
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.2);
	}

	/* Two columns: recipes + bio sidebar */
	.home-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
		gap: 2rem 2.25rem;
		align-items: start;
		max-width: 1240px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.home-main {
		min-width: 0;
	}

	@media (max-width: 960px) {
		.home-layout {
			grid-template-columns: 1fr;
			padding: 0 1.5rem;
		}
	}

	/* Search */
	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
		max-width: 520px;
		margin: 2.5rem 0 0;
		background: var(--surface);
		border: 2px solid var(--border);
		border-radius: var(--radius-pill);
		padding: 0.65rem 1rem 0.65rem 2.75rem;
		box-shadow: var(--shadow);
		transition:
			border-color 0.2s,
			transform 0.15s,
			box-shadow 0.15s;
	}

	.search-wrap:focus-within {
		border-color: var(--bowl-soft);
		box-shadow: var(--shadow-hover);
		transform: translateY(-2px);
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		width: 18px; height: 18px;
		color: var(--text-light);
		pointer-events: none;
	}

	.search-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.95rem;
		font-family: inherit;
		color: var(--text);
	}

	.clear-btn {
		background: none;
		border: none;
		color: var(--text-light);
		font-size: 0.8rem;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		transition: color 0.2s;
	}
	.clear-btn:hover { color: var(--terracotta); }

	/* Tag filter block */
	.tag-filter-section {
		margin-top: 1.75rem;
		padding-top: 1.35rem;
		border-top: 2px solid rgba(212, 222, 238, 0.85);
	}
	.filter-heading {
		font-family: 'Fredoka', system-ui, sans-serif;
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--navy-deep);
		margin: 0 0 0.45rem;
		letter-spacing: -0.02em;
	}
	.filter-hint {
		font-size: 0.84rem;
		color: var(--text-medium);
		line-height: 1.55;
		margin: 0 0 1rem;
		max-width: 52rem;
	}
	.filter-hint strong {
		color: var(--olive-dark);
		font-weight: 700;
	}
	.filter-empty-tags {
		font-size: 0.88rem;
		color: var(--text-light);
		margin: 0;
		line-height: 1.5;
	}
	.active-tag-summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 1rem;
	}
	.active-tag-summary-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-light);
		margin-right: 0.15rem;
	}
	.active-tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.28rem 0.55rem 0.28rem 0.65rem;
		border-radius: 999px;
		border: 2px solid var(--bowl-soft);
		background: var(--terracotta-pale);
		color: var(--warm-brown);
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.active-tag-chip:hover {
		border-color: var(--bowl);
		background: rgba(236, 90, 50, 0.15);
	}
	.active-tag-remove {
		font-size: 1rem;
		line-height: 1;
		opacity: 0.75;
		font-weight: 700;
	}

	/* Tag rows */
	.tag-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.25rem;
		flex-wrap: wrap;
	}

	.tag-cat-label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--text-light);
		min-width: 76px;
	}

	.chip-list { display: flex; gap: 0.45rem; flex-wrap: wrap; }

	.chip {
		padding: 0.35rem 0.95rem;
		border-radius: var(--radius-pill);
		border: 2px solid var(--border);
		background: var(--surface);
		color: var(--text-medium);
		font-size: 0.82rem;
		font-family: 'Fredoka', system-ui, sans-serif;
		font-weight: 500;
		transition:
			border-color 0.15s,
			color 0.15s,
			transform 0.12s,
			box-shadow 0.12s;
	}
	.chip:hover {
		border-color: var(--bowl-soft);
		color: var(--bowl);
		transform: translateY(-2px);
	}
	.chip.active {
		background: linear-gradient(145deg, var(--bowl-soft), var(--bowl));
		border-color: transparent;
		color: white;
		box-shadow: 0 4px 14px rgba(236, 90, 50, 0.3);
	}

	/* Grid */
	.recipe-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.75rem;
		margin-top: 2.75rem;
	}

	@media (max-width: 900px) { .recipe-grid { grid-template-columns: repeat(2, 1fr); } }
	@media (max-width: 560px) { .recipe-grid { grid-template-columns: 1fr; } }

	/* Card */
	.recipe-card {
		background: var(--surface);
		border-radius: calc(var(--radius) + 4px);
		overflow: hidden;
		border: 2px solid rgba(212, 222, 238, 0.8);
		box-shadow: var(--shadow);
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			border-color 0.2s;
	}
	.recipe-card:hover {
		transform: translateY(-6px) rotate(0.5deg);
		box-shadow: var(--shadow-hover);
		border-color: rgba(236, 90, 50, 0.35);
	}

	.card-img-wrap {
		position: relative;
		aspect-ratio: 4/3;
		overflow: hidden;
		background: var(--cream-dark);
	}
	.card-img-wrap img {
		width: 100%; height: 100%;
		object-fit: cover;
		transition: transform 0.35s;
	}
	.recipe-card:hover .card-img-wrap img { transform: scale(1.04); }

	.card-img-placeholder {
		width: 100%; height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3.5rem;
		background: linear-gradient(135deg, var(--cream-dark), var(--terracotta-pale));
	}

	.card-rating {
		position: absolute;
		bottom: 0.5rem; right: 0.5rem;
		background: rgba(255,255,255,0.92);
		padding: 0.18rem 0.55rem;
		border-radius: 20px;
		font-size: 0.78rem;
		color: var(--warm-brown);
		letter-spacing: 0.04em;
		backdrop-filter: blur(4px);
	}

	.card-body {
		padding: 1rem 1.25rem 1.3rem;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.card-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--olive-dark);
		line-height: 1.3;
	}

	.card-desc {
		font-size: 0.84rem;
		color: var(--text-light);
		line-height: 1.55;
		flex: 1;
	}

	.card-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.25rem; }

	.tag-mini {
		font-size: 0.72rem;
		padding: 0.15rem 0.5rem;
		background: var(--terracotta-pale);
		color: var(--warm-brown);
		border-radius: 10px;
		font-weight: 700;
	}

	/* Empty */
	.empty {
		text-align: center;
		padding: 5rem 2rem;
		color: var(--text-light);
	}
	.empty a, .link-btn {
		color: var(--terracotta);
		font-weight: 700;
		text-decoration: none;
		background: none;
		border: none;
		font-size: inherit;
		font-family: inherit;
	}
</style>
