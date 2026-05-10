<script>
	let { data } = $props();

	let searchQuery  = $state('');
	let selectedTags = $state(new Set());

	const tagsByCategory = $derived.by(() => {
		const groups = {};
		for (const tag of data.tags) {
			if (!groups[tag.category]) groups[tag.category] = [];
			groups[tag.category].push(tag);
		}
		return groups;
	});

	const filteredRecipes = $derived.by(() => {
		let result = data.recipes;

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(r =>
				r.title.toLowerCase().includes(q) ||
				(r.description ?? '').toLowerCase().includes(q)
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

	function toggleTag(tagId) {
		const next = new Set(selectedTags);
		next.has(tagId) ? next.delete(tagId) : next.add(tagId);
		selectedTags = next;
	}

	function clearFilters() {
		searchQuery  = '';
		selectedTags = new Set();
	}

	function stars(rating) {
		return Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('');
	}

	const categoryOrder = ['protein', 'complexity', 'time'];
</script>

<svelte:head>
	<title>Gohan Diary — Recipe Collection</title>
</svelte:head>

<div class="page">
	<!-- Hero -->
	<section class="hero">
		<h1 class="hero-title">Gohan Diary</h1>
		<p class="hero-sub">A personal collection of recipes, flavours &amp; memories</p>
	</section>

	<div class="container">
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

		<!-- Tag filter chips -->
		{#each categoryOrder.filter(c => tagsByCategory[c]) as category}
			<div class="tag-row">
				<span class="tag-cat-label">{category}</span>
				<div class="chip-list">
					{#each tagsByCategory[category] as tag}
						<button
							class="chip"
							class:active={selectedTags.has(tag.id)}
							onclick={() => toggleTag(tag.id)}
						>
							{tag.name}
						</button>
					{/each}
				</div>
			</div>
		{/each}

		<!-- Recipe grid -->
		{#if filteredRecipes.length === 0}
			<div class="empty">
				{#if data.recipes.length === 0}
					<p>No recipes yet — <a href="/admin/new">add the first one!</a></p>
				{:else}
					<p>No recipes match your search. <button class="link-btn" onclick={clearFilters}>Clear filters</button></p>
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
									{#each recipe.recipe_tags.slice(0, 4) as rt}
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
</div>

<style>
	.page { padding-bottom: 5rem; }

	/* Hero */
	.hero {
		text-align: center;
		padding: 4.5rem 2rem 3rem;
		background: linear-gradient(180deg, var(--cream-dark) 0%, var(--cream) 100%);
		border-bottom: 1px solid var(--border);
	}

	.hero-title {
		font-family: 'Caveat', cursive;
		font-size: clamp(3.5rem, 9vw, 6rem);
		color: var(--terracotta);
		font-weight: 700;
		line-height: 1;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 8px rgba(196,113,74,0.15);
	}

	.hero-sub {
		color: var(--text-medium);
		font-size: 1.05rem;
		font-style: italic;
	}

	/* Search */
	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
		max-width: 520px;
		margin: 2.5rem auto 0;
		background: white;
		border: 2px solid var(--border);
		border-radius: 50px;
		padding: 0.6rem 1rem 0.6rem 2.75rem;
		box-shadow: var(--shadow);
		transition: border-color 0.2s;
	}

	.search-wrap:focus-within { border-color: var(--terracotta-light); }

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
		padding: 0.3rem 0.85rem;
		border-radius: 20px;
		border: 1.5px solid var(--border);
		background: white;
		color: var(--text-medium);
		font-size: 0.82rem;
		font-family: inherit;
		transition: all 0.15s;
	}
	.chip:hover { border-color: var(--terracotta-light); color: var(--terracotta); }
	.chip.active { background: var(--terracotta); border-color: var(--terracotta); color: white; }

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
		background: white;
		border-radius: var(--radius);
		overflow: hidden;
		box-shadow: var(--shadow);
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		transition: transform 0.2s, box-shadow 0.2s;
	}
	.recipe-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }

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
