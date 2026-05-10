<script>
	let { data } = $props();

	function stars(n) {
		return Array.from({ length: 5 }, (_, i) => i < n ? '★' : '☆').join('');
	}

	function fmtDate(d) {
		return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	const tagsByCategory = $derived.by(() => {
		const groups = {};
		for (const rt of data.recipe.recipe_tags ?? []) {
			if (!rt.tags) continue;
			const c = rt.tags.category;
			if (!groups[c]) groups[c] = [];
			groups[c].push(rt.tags);
		}
		return groups;
	});

	const instructionSteps = $derived(
		(data.recipe.instructions ?? '').split('\n').map(s => s.trim()).filter(Boolean)
	);
</script>

<svelte:head>
	<title>{data.recipe.title} — Gohan Diary</title>
</svelte:head>

<article class="recipe-page">
	<!-- Hero image -->
	<div class="hero">
		{#if data.recipe.image_url}
			<img src={data.recipe.image_url} alt={data.recipe.title} class="hero-img" />
		{:else}
			<div class="hero-placeholder">🍜</div>
		{/if}
	</div>

	<div class="container">
		<a href="/" class="back">← All Recipes</a>

		<header class="recipe-header">
			<h1>{data.recipe.title}</h1>
			{#if data.recipe.rating}
				<div class="rating-badge" title="{data.recipe.rating} out of 5">
					<span class="stars">{stars(data.recipe.rating)}</span>
					<span class="rating-num">{data.recipe.rating}/5</span>
				</div>
			{/if}
		</header>

		<!-- Tags -->
		{#if Object.keys(tagsByCategory).length}
			<div class="tag-block">
				{#each Object.entries(tagsByCategory) as [cat, tags]}
					<div class="tag-row">
						<span class="tag-cat">{cat}</span>
						{#each tags as tag}
							<span class="tag-pill">{tag.name}</span>
						{/each}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Description -->
		{#if data.recipe.description}
			<section class="recipe-section">
				<p class="description">{data.recipe.description}</p>
			</section>
		{/if}

		<!-- Instructions -->
		{#if instructionSteps.length}
			<section class="recipe-section">
				<h2>Instructions</h2>
				<ol class="steps">
					{#each instructionSteps as step, i}
						<li class="step">
							<span class="step-num">{i + 1}</span>
							<p>{step}</p>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<!-- Comments -->
		<section class="recipe-section comments-section">
			<h2>
				{data.comments.length > 0 ? `Comments (${data.comments.length})` : 'Comments'}
			</h2>

			{#if data.comments.length > 0}
				<div class="comment-list">
					{#each data.comments as c (c.id)}
						<div class="comment">
							<div class="avatar" aria-hidden="true">💬</div>
							<div class="comment-body">
								<time class="comment-date">{fmtDate(c.created_at)}</time>
								<p>{c.body}</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="no-comments">No comments yet.</p>
			{/if}
		</section>
	</div>
</article>

<style>
	.recipe-page { padding-bottom: 5rem; }

	/* Hero */
	.hero {
		width: 100%;
		height: clamp(220px, 42vw, 480px);
		overflow: hidden;
		background: var(--cream-dark);
	}
	.hero-img { width: 100%; height: 100%; object-fit: cover; }
	.hero-placeholder {
		width: 100%; height: 100%;
		display: flex; align-items: center; justify-content: center;
		font-size: 6rem;
		background: linear-gradient(135deg, var(--cream-dark), var(--terracotta-pale));
	}

	.container { max-width: 780px; margin: 0 auto; padding: 0 2rem; }

	.back {
		display: inline-block;
		margin: 1.75rem 0 1.25rem;
		color: var(--text-light);
		font-size: 0.88rem;
		text-decoration: none;
		transition: color 0.2s;
	}
	.back:hover { color: var(--terracotta); }

	/* Header */
	.recipe-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}
	.recipe-header h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); }

	.rating-badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: white;
		border: 1.5px solid var(--border);
		padding: 0.35rem 0.8rem;
		border-radius: 20px;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.stars { color: var(--terracotta); font-size: 1.05rem; letter-spacing: 0.04em; }
	.rating-num { font-size: 0.78rem; color: var(--text-light); font-weight: 700; }

	/* Tags */
	.tag-block { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 1.75rem; }
	.tag-row { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
	.tag-cat {
		font-size: 0.68rem; font-weight: 700;
		text-transform: uppercase; letter-spacing: 0.09em;
		color: var(--text-light); min-width: 68px;
	}
	.tag-pill {
		padding: 0.18rem 0.65rem;
		background: var(--terracotta-pale);
		color: var(--warm-brown);
		border-radius: 12px;
		font-size: 0.8rem; font-weight: 700;
	}

	/* Sections */
	.recipe-section { margin-bottom: 2.75rem; }
	.recipe-section h2 {
		font-size: 1.2rem;
		color: var(--olive-dark);
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--border);
	}

	.description {
		font-size: 1.05rem;
		color: var(--text-medium);
		line-height: 1.8;
		font-style: italic;
	}

	/* Steps */
	.steps { display: flex; flex-direction: column; gap: 1rem; list-style: none; }
	.step { display: flex; gap: 1rem; align-items: flex-start; }
	.step-num {
		min-width: 2rem; height: 2rem;
		background: var(--terracotta); color: white;
		border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-weight: 700; font-size: 0.82rem;
		flex-shrink: 0;
	}
	.step p { line-height: 1.75; padding-top: 0.2rem; }

	/* Comments */
	.comments-section { margin-top: 3rem; }
	.comment-list { display: flex; flex-direction: column; gap: 1.2rem; margin-bottom: 2rem; }
	.comment { display: flex; gap: 0.75rem; align-items: flex-start; }
	.avatar {
		width: 36px; height: 36px;
		border-radius: 50%;
		background: var(--terracotta-pale); color: var(--warm-brown);
		display: flex; align-items: center; justify-content: center;
		font-weight: 700; font-size: 0.9rem; flex-shrink: 0;
	}
	.comment-body {
		flex: 1;
		background: white;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.7rem 1rem;
	}
	.comment-date { display: block; font-size: 0.73rem; color: var(--text-light); margin-bottom: 0.3rem; }
	.comment-body p { line-height: 1.6; }

	.no-comments {
		color: var(--text-light);
		font-style: italic;
		font-size: 0.95rem;
	}
</style>
