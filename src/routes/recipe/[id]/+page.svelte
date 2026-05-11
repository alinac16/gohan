<script>
	import { enhance } from '$app/forms';
	import BioAside from '$lib/BioAside.svelte';
	import { sortTagsForCategory } from '$lib/tagOrder.js';
	import { scaleRecipeText } from '$lib/scaleRecipeText.js';

	let { data, form } = $props();

	/** @type {number} */
	let multiplier = $state(1);

	const PRESETS = [0.5, 2, 3, 4];

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
		for (const key of Object.keys(groups)) {
			groups[key] = sortTagsForCategory(groups[key], key);
		}
		return groups;
	});

	const ingredientLines = $derived(
		(data.recipe.ingredients ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
	);

	const instructionSteps = $derived(
		(data.recipe.instructions ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
	);

	const hasScalableContent = $derived(Boolean(ingredientLines.length || instructionSteps.length));

	const scaledIngredientLines = $derived(
		ingredientLines.map((line) => scaleRecipeText(line, multiplier))
	);

	const scaledInstructionSteps = $derived(
		instructionSteps.map((step) => scaleRecipeText(step, multiplier))
	);

	function isPresetActive(p) {
		return Math.abs(multiplier - p) < 1e-6;
	}

	function setMultiplier(v) {
		if (Number.isFinite(v) && v > 0) multiplier = v;
	}

	const categoryOrder = ['protein', 'complexity', 'time'];

	const categoryLabel = {
		protein: 'Protein',
		complexity: 'Complexity',
		time: 'Time'
	};

	const allTagsByCategory = $derived.by(() => {
		/** @type {Record<string, { id: string; name: string; category: string }[]>} */
		const g = { protein: [], complexity: [], time: [] };
		for (const t of data.allTags ?? []) {
			const c = t.category;
			if (g[c]) g[c].push(t);
		}
		for (const cat of categoryOrder) {
			if (g[cat]?.length) g[cat] = sortTagsForCategory(g[cat], cat);
		}
		return g;
	});

	const recipeTagIds = $derived(
		new Set(
			(data.recipe.recipe_tags ?? [])
				.map((rt) => rt.tags?.id)
				.filter((id) => typeof id === 'string')
		)
	);

	let tagsDialog = $state(/** @type {HTMLDialogElement | undefined} */ (undefined));
	let commentDialog = $state(/** @type {HTMLDialogElement | undefined} */ (undefined));
	let deleteDialog = $state(/** @type {HTMLDialogElement | undefined} */ (undefined));

	function closeOnBackdrop(e, dlg) {
		if (e.target === e.currentTarget) dlg?.close();
	}

	/** After save: redirect keeps this page mounted — explicitly close the modal. */
	function enhanceCloseOnRedirect(getDialog) {
		return () =>
			async (/** @type {{ result: import('@sveltejs/kit').ActionResult; update: () => Promise<void> }} */ { result, update }) => {
				await update();
				if (result.type === 'redirect') getDialog()?.close();
			};
	}
</script>

<svelte:head>
	<title>{data.recipe.title} — Gohan Diary</title>
</svelte:head>

<article class="recipe-page">
	<div class="recipe-layout">
		<figure class="recipe-photo-col">
			{#if data.recipe.image_url}
				<img
					src={data.recipe.image_url}
					alt={data.recipe.title}
					class="recipe-photo-natural"
					loading="eager"
					decoding="async"
				/>
			{:else}
				<div class="recipe-photo-placeholder" aria-hidden="true">🍜</div>
			{/if}
		</figure>

		<div class="recipe-main">
			<div class="recipe-main-inner">
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

		{#if data.recipe.source_url}
			<p class="recipe-source">
				<span class="recipe-source-label">Adapted from</span>
				<a href={data.recipe.source_url} target="_blank" rel="noopener noreferrer" class="recipe-source-link">
					{data.recipe.source_url}
				</a>
			</p>
		{/if}

		<!-- Tags -->
		<section class="recipe-section tag-section" aria-labelledby="tags-heading">
			<h2 id="tags-heading">Tags</h2>

			{#if Object.keys(tagsByCategory).length}
				<div class="tag-block tag-block-display">
					{#each categoryOrder.filter((c) => tagsByCategory[c]?.length) as cat}
						<div class="tag-row">
							<span class="tag-cat">{categoryLabel[cat] ?? cat}</span>
							{#each tagsByCategory[cat] as tag}
								<span class="tag-pill">{tag.name}</span>
							{/each}
						</div>
					{/each}
				</div>
			{:else}
				<p class="tags-empty-display">No tags on this recipe yet — use Edit tags to add some.</p>
			{/if}

			<div class="admin-row">
				{#if form?.tagsError}
					<p class="admin-inline-error" role="alert">{form.tagsError}</p>
				{/if}
				<button type="button" class="admin-open-btn" onclick={() => tagsDialog?.showModal()}>
					Edit tags…
				</button>
			</div>

			<dialog
				bind:this={tagsDialog}
				class="admin-modal"
				aria-labelledby="tags-modal-title"
				onclick={(e) => closeOnBackdrop(e, tagsDialog)}
			>
				<div class="admin-modal-panel admin-modal-panel--scroll">
					<h3 id="tags-modal-title" class="admin-modal-title">Edit tags</h3>
					<p class="admin-modal-lead">
						Check tags to attach, or create a new one. Uses the same admin password as
						<a href="/admin/new">Add recipe</a>.
					</p>
					{#if form?.tagsError}
						<p class="tag-editor-error" role="alert">{form.tagsError}</p>
					{/if}

					<form
						method="POST"
						action="?/saveRecipeTags"
						use:enhance={enhanceCloseOnRedirect(() => tagsDialog)}
						class="tag-editor-form"
					>
						<fieldset class="tag-check-fieldset">
							<legend class="tag-check-legend">Existing tags</legend>
							{#if (data.allTags ?? []).length === 0}
								<p class="tags-library-empty">No tags in the library yet. Create one under “New tag”.</p>
							{:else}
								{#each categoryOrder as cat}
									{#if (allTagsByCategory[cat] ?? []).length > 0}
										<div class="tag-check-group">
											<span class="tag-check-cat">{categoryLabel[cat] ?? cat}</span>
											<div class="tag-check-list">
												{#each allTagsByCategory[cat] as tag (tag.id)}
													<label class="tag-check-label">
														<input
															type="checkbox"
															name="tag_ids"
															value={tag.id}
															checked={recipeTagIds.has(tag.id)}
														/>
														<span>{tag.name}</span>
													</label>
												{/each}
											</div>
										</div>
									{/if}
								{/each}
							{/if}
						</fieldset>

						<div class="new-tag-block">
							<span class="new-tag-heading">New tag</span>
							<p class="new-tag-hint">
								Optional. Pick a category. Duplicate names reuse the existing tag.
							</p>
							<div class="new-tag-row">
								<label class="new-tag-field">
									<span>Name</span>
									<input type="text" name="new_tag_name" placeholder="e.g. Lamb" autocomplete="off" />
								</label>
								<label class="new-tag-field new-tag-field-cat">
									<span>Category</span>
									<select name="new_tag_category">
										<option value="">—</option>
										{#each categoryOrder as cat}
											<option value={cat}>{categoryLabel[cat]}</option>
										{/each}
									</select>
								</label>
							</div>
						</div>

						<label class="modal-password-label">
							<span>Admin password</span>
							<input
								type="text"
								name="admin_password"
								autocomplete="off"
								spellcheck="false"
								required
								aria-invalid={form?.tagsError ? 'true' : undefined}
							/>
						</label>

						<div class="modal-actions">
							<button type="button" class="modal-btn-cancel" onclick={() => tagsDialog?.close()}>Cancel</button>
							<button type="submit" class="tag-save-btn">Save tags</button>
						</div>
					</form>
				</div>
			</dialog>
		</section>

		{#if hasScalableContent}
			<div class="scale-toolbar" role="group" aria-label="Scale recipe quantities">
				<span class="scale-toolbar-label">Scale amounts</span>
				<div class="scale-presets">
					{#each PRESETS as p}
						<button
							type="button"
							class="scale-preset"
							class:active={isPresetActive(p)}
							onclick={() => setMultiplier(p)}
						>
							×{p}
						</button>
					{/each}
				</div>
				<label class="scale-custom">
					<span class="scale-custom-text">Custom</span>
					<input
						type="number"
						step="any"
						min="0.01"
						class="scale-custom-input"
						value={multiplier}
						oninput={(e) => {
							const raw = e.currentTarget.value;
							const v = parseFloat(raw);
							if (raw === '' || raw === '-') return;
							if (Number.isFinite(v) && v > 0) multiplier = v;
						}}
						aria-label="Custom scale multiplier"
					/>
				</label>
			</div>
		{/if}

		<!-- Ingredients -->
		{#if ingredientLines.length}
			<section class="recipe-section">
				<h2>Ingredients</h2>
				<ul class="ingredient-list">
					{#each scaledIngredientLines as line}
						<li>{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Instructions -->
		{#if instructionSteps.length}
			<section class="recipe-section">
				<h2>Instructions</h2>
				<ol class="steps">
					{#each scaledInstructionSteps as step, i}
						<li class="step">
							<span class="step-num">{i + 1}</span>
							<p>{step}</p>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<!-- Notes (personal — not scaled) -->
		{#if data.recipe.description}
			<section class="recipe-section recipe-notes">
				<h2>Notes</h2>
				<p class="description">{data.recipe.description}</p>
			</section>
		{/if}

		<!-- Comments -->
		<section class="recipe-section comments-section">
			<div class="comments-heading-row">
				<h2>
					{data.comments.length > 0 ? `Comments (${data.comments.length})` : 'Comments'}
				</h2>
				<button type="button" class="admin-open-btn admin-open-btn--small" onclick={() => commentDialog?.showModal()}>
					Add comment…
				</button>
			</div>

			{#if form?.commentError}
				<p class="admin-inline-error" role="alert">{form.commentError}</p>
			{/if}

			{#if data.comments.length > 0}
				<div class="comment-list">
					{#each data.comments as c (c.id)}
						<div class="comment">
							<div class="avatar" aria-hidden="true">💬</div>
							<div class="comment-body">
								<div class="comment-meta">
									<time class="comment-date">{fmtDate(c.created_at)}</time>
									{#if c.user_id == null}
										<span class="comment-source-badge">Diary</span>
									{/if}
								</div>
								<p>{c.body}</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="no-comments">No comments yet.</p>
			{/if}

			<dialog
				bind:this={commentDialog}
				class="admin-modal"
				aria-labelledby="comment-modal-title"
				onclick={(e) => closeOnBackdrop(e, commentDialog)}
			>
				<div class="admin-modal-panel">
					<h3 id="comment-modal-title" class="admin-modal-title">Add comment</h3>
					<p class="admin-modal-lead">Visible to everyone. Requires admin password.</p>
					{#if form?.commentError}
						<p class="tag-editor-error" role="alert">{form.commentError}</p>
					{/if}
					<form method="POST" action="?/addComment" use:enhance={enhanceCloseOnRedirect(() => commentDialog)}>
						<label class="modal-comment-label">
							<span>Comment</span>
							<textarea
								name="body"
								rows="5"
								required
								placeholder="How did it turn out?"
								aria-invalid={form?.commentError ? 'true' : undefined}
							></textarea>
						</label>
						<label class="modal-password-label">
							<span>Admin password</span>
							<input
								type="text"
								name="admin_password"
								autocomplete="off"
								spellcheck="false"
								required
								aria-invalid={form?.commentError ? 'true' : undefined}
							/>
						</label>
						<div class="modal-actions">
							<button type="button" class="modal-btn-cancel" onclick={() => commentDialog?.close()}>Cancel</button>
							<button type="submit" class="tag-save-btn">Post comment</button>
						</div>
					</form>
				</div>
			</dialog>
		</section>

		<section class="recipe-section delete-recipe-section" aria-labelledby="delete-recipe-heading">
			<h2 id="delete-recipe-heading">Delete recipe</h2>
			<p class="delete-recipe-lead">
				Permanently removes this recipe, its tag links, and comments.
			</p>
			{#if form?.deleteError}
				<p class="admin-inline-error" role="alert">{form.deleteError}</p>
			{/if}
			<button type="button" class="delete-recipe-open-btn" onclick={() => deleteDialog?.showModal()}>
				Delete recipe…
			</button>

			<dialog
				bind:this={deleteDialog}
				class="admin-modal"
				aria-labelledby="delete-modal-title"
				onclick={(e) => closeOnBackdrop(e, deleteDialog)}
			>
				<div class="admin-modal-panel">
					<h3 id="delete-modal-title" class="admin-modal-title admin-modal-title--danger">Delete this recipe?</h3>
					<p class="admin-modal-lead admin-modal-lead--danger">
						This cannot be undone. Enter your admin password to confirm.
					</p>
					{#if form?.deleteError}
						<p class="tag-editor-error" role="alert">{form.deleteError}</p>
					{/if}
					<form method="POST" action="?/deleteRecipe" use:enhance={enhanceCloseOnRedirect(() => deleteDialog)}>
						<label class="modal-password-label">
							<span>Admin password</span>
							<input
								type="text"
								name="admin_password"
								autocomplete="off"
								spellcheck="false"
								required
								aria-invalid={form?.deleteError ? 'true' : undefined}
							/>
						</label>
						<div class="modal-actions">
							<button type="button" class="modal-btn-cancel" onclick={() => deleteDialog?.close()}>Cancel</button>
							<button type="submit" class="delete-recipe-btn">Delete permanently</button>
						</div>
					</form>
				</div>
			</dialog>
		</section>
			</div>
		</div>

		<BioAside sidebarFirstOnNarrow={false} />
	</div>
</article>

<style>
	.recipe-page { padding-bottom: 5rem; }

	.recipe-layout {
		display: grid;
		grid-template-columns: minmax(120px, 220px) minmax(0, 1fr) minmax(260px, 320px);
		gap: 2rem 2.25rem;
		align-items: start;
		max-width: 1240px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.recipe-photo-col {
		margin: 0;
		padding-top: 1.75rem;
		line-height: 0;
	}

	.recipe-photo-natural {
		max-width: 100%;
		width: auto;
		height: auto;
		display: block;
		border-radius: calc(var(--radius) + 4px);
		border: 2px solid var(--border);
		box-shadow: var(--shadow);
	}

	.recipe-photo-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 140px;
		aspect-ratio: 4 / 3;
		max-width: 100%;
		font-size: 3.25rem;
		border-radius: calc(var(--radius) + 4px);
		border: 2px dashed var(--border);
		background: linear-gradient(145deg, var(--cream-dark), var(--terracotta-pale));
	}

	.recipe-main {
		min-width: 0;
	}

	.recipe-main-inner {
		max-width: 780px;
	}

	@media (max-width: 960px) {
		.recipe-layout {
			grid-template-columns: 1fr;
			padding: 0 1.5rem;
			gap: 1.5rem;
		}

		.recipe-photo-col {
			padding-top: 0;
			max-width: min(280px, 100%);
			margin: 0 auto;
			justify-self: center;
		}

		.recipe-main-inner {
			max-width: none;
		}
	}

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
		background: var(--surface);
		border: 2px solid var(--border);
		padding: 0.35rem 0.8rem;
		border-radius: var(--radius-pill);
		white-space: nowrap;
		flex-shrink: 0;
	}
	.stars { color: var(--terracotta); font-size: 1.05rem; letter-spacing: 0.04em; }
	.rating-num { font-size: 0.78rem; color: var(--text-light); font-weight: 700; }

	.recipe-source {
		font-size: 0.88rem;
		line-height: 1.5;
		margin: -0.35rem 0 1.35rem;
		padding: 0.65rem 0.85rem;
		background: var(--cream-dark);
		border-radius: var(--radius);
		border-left: 3px solid var(--bowl);
	}
	.recipe-source-label {
		display: block;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-light);
		margin-bottom: 0.35rem;
	}
	.recipe-source-link {
		color: var(--navy-deep);
		font-weight: 600;
		word-break: break-all;
	}

	/* Tags */
	.tag-section .tag-block-display {
		margin-bottom: 1.25rem;
	}
	.tags-empty-display {
		font-size: 0.92rem;
		color: var(--text-light);
		margin: 0 0 1rem;
	}
	.admin-row {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.admin-inline-error {
		margin: 0;
		padding: 0.6rem 0.85rem;
		background: #fdf0ef;
		border: 1px solid #e8b4ae;
		border-radius: var(--radius);
		font-size: 0.88rem;
		color: #7a2e26;
	}
	.admin-open-btn {
		font: inherit;
		font-size: 0.86rem;
		font-weight: 700;
		padding: 0.45rem 0.95rem;
		border-radius: var(--radius);
		border: 2px solid var(--border);
		background: var(--surface);
		color: var(--bowl);
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.admin-open-btn:hover {
		border-color: var(--bowl-soft);
		background: var(--cream-dark);
	}
	.admin-open-btn--small {
		font-size: 0.82rem;
		padding: 0.35rem 0.75rem;
	}

	.admin-modal {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		margin: 0;
		max-width: 440px;
		width: min(440px, calc(100vw - 2rem));
		max-height: min(90vh, 720px);
		padding: 0;
		border: none;
		border-radius: calc(var(--radius) + 6px);
		box-shadow: 0 16px 48px rgba(26, 42, 58, 0.28);
	}
	.admin-modal::backdrop {
		background: rgba(26, 42, 58, 0.42);
	}
	.admin-modal-panel {
		padding: 1.2rem 1.35rem 1.35rem;
	}
	.admin-modal-panel--scroll {
		max-height: min(85vh, 640px);
		overflow-y: auto;
	}
	.admin-modal-title {
		margin: 0 0 0.65rem;
		font-size: 1.12rem;
		font-family: 'Fredoka', system-ui, sans-serif;
		color: var(--navy-deep);
	}
	.admin-modal-title--danger {
		color: #8b3a2f;
	}
	.admin-modal-lead {
		font-size: 0.86rem;
		color: var(--text-medium);
		line-height: 1.5;
		margin: 0 0 1rem;
	}
	.admin-modal-lead a {
		color: var(--terracotta);
		font-weight: 600;
	}
	.admin-modal-lead--danger {
		color: #7a3028;
	}
	.modal-password-label,
	.modal-comment-label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.85rem;
	}
	.modal-password-label span,
	.modal-comment-label span {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-light);
	}
	.modal-password-label input,
	.modal-comment-label textarea {
		font: inherit;
		font-size: 0.92rem;
		padding: 0.45rem 0.65rem;
		border: 1.5px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		background: var(--cream);
	}
	.modal-comment-label textarea {
		resize: vertical;
		min-height: 7rem;
		line-height: 1.55;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		flex-wrap: wrap;
		margin-top: 0.25rem;
	}
	.modal-btn-cancel {
		font: inherit;
		font-size: 0.88rem;
		font-weight: 600;
		padding: 0.45rem 1rem;
		border-radius: var(--radius);
		border: 2px solid var(--border);
		background: var(--cream);
		color: var(--text-medium);
		cursor: pointer;
	}
	.modal-btn-cancel:hover {
		border-color: var(--text-light);
		color: var(--text);
	}
	.delete-recipe-open-btn {
		font: inherit;
		font-size: 0.88rem;
		font-weight: 700;
		padding: 0.45rem 1rem;
		border-radius: var(--radius);
		border: 2px solid #c75c4e;
		background: transparent;
		color: #a94438;
		cursor: pointer;
		transition: background 0.15s;
	}
	.delete-recipe-open-btn:hover {
		background: #fdf0ef;
	}

	.tag-editor-error {
		margin: 0 0 0.85rem;
		padding: 0.6rem 0.85rem;
		background: #fdf0ef;
		border: 1px solid #e8b4ae;
		border-radius: var(--radius);
		font-size: 0.88rem;
		color: #7a2e26;
	}
	.tag-check-fieldset {
		border: none;
		padding: 0;
		margin: 0 0 1.15rem;
	}
	.tag-check-legend {
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-light);
		margin-bottom: 0.65rem;
	}
	.tags-library-empty {
		font-size: 0.88rem;
		color: var(--text-light);
		margin: 0;
		line-height: 1.5;
	}
	.tag-check-group {
		margin-bottom: 0.85rem;
	}
	.tag-check-group:last-child {
		margin-bottom: 0;
	}
	.tag-check-cat {
		display: block;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--olive-dark);
		margin-bottom: 0.4rem;
	}
	.tag-check-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}
	.tag-check-label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.88rem;
		color: var(--text);
		cursor: pointer;
	}
	.tag-check-label input {
		accent-color: var(--bowl);
	}
	.new-tag-block {
		padding-top: 0.85rem;
		margin-bottom: 1rem;
		border-top: 1px solid var(--border);
	}
	.new-tag-heading {
		display: block;
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-light);
		margin-bottom: 0.35rem;
	}
	.new-tag-hint {
		font-size: 0.8rem;
		color: var(--text-light);
		margin: 0 0 0.65rem;
		line-height: 1.45;
	}
	.new-tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: flex-end;
	}
	.new-tag-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-medium);
		min-width: 140px;
		flex: 1;
	}
	.new-tag-field span {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.new-tag-field input,
	.new-tag-field select {
		font: inherit;
		font-size: 0.92rem;
		font-weight: 500;
		padding: 0.4rem 0.55rem;
		border: 1.5px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		background: var(--cream);
	}
	.new-tag-field-cat {
		max-width: 200px;
	}
	.tag-save-btn {
		font: inherit;
		font-size: 0.88rem;
		font-weight: 700;
		padding: 0.5rem 1.15rem;
		border-radius: var(--radius);
		border: 2px solid var(--bowl-soft);
		background: linear-gradient(145deg, var(--bowl-soft), var(--bowl));
		color: white;
		cursor: pointer;
		box-shadow: 0 2px 10px rgba(236, 90, 50, 0.3);
		transition: filter 0.15s, transform 0.12s;
	}
	.tag-save-btn:hover {
		filter: brightness(1.05);
		transform: translateY(-1px);
	}

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

	/* Scale toolbar */
	.scale-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.65rem 1rem;
		margin-bottom: 1.75rem;
		padding: 0.65rem 1rem;
		background: var(--surface);
		border: 2px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
	}
	.scale-toolbar-label {
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-light);
	}
	.scale-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.scale-preset {
		font: inherit;
		font-size: 0.82rem;
		font-weight: 700;
		padding: 0.28rem 0.55rem;
		border-radius: 999px;
		border: 1.5px solid var(--border);
		background: var(--cream);
		color: var(--warm-brown);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}
	.scale-preset:hover {
		border-color: var(--terracotta-light);
		background: var(--terracotta-pale);
	}
	.scale-preset.active {
		border-color: var(--terracotta);
		background: var(--terracotta-pale);
		color: var(--olive-dark);
	}
	.scale-custom {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
	}
	.scale-custom-text {
		font-size: 0.8rem;
		color: var(--text-medium);
		font-weight: 600;
	}
	.scale-custom-input {
		width: 4.25rem;
		padding: 0.28rem 0.45rem;
		border: 1.5px solid var(--border);
		border-radius: 8px;
		font-size: 0.88rem;
		font-family: inherit;
		color: var(--text);
		background: var(--cream);
	}
	.scale-custom-input:focus {
		outline: 2px solid var(--terracotta-pale);
		outline-offset: 1px;
		border-color: var(--terracotta-light);
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

	.ingredient-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.ingredient-list li {
		position: relative;
		padding-left: 1.35rem;
		line-height: 1.65;
		font-size: 1.02rem;
		color: var(--text);
	}
	.ingredient-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.58rem;
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: linear-gradient(145deg, var(--bowl-soft), var(--bowl));
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
	.comments-heading-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--border);
	}
	.comments-heading-row h2 {
		margin: 0;
		padding: 0;
		border: none;
		font-size: 1.2rem;
		color: var(--olive-dark);
	}
	.comment-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.3rem;
	}
	.comment-source-badge {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--bowl);
		background: var(--terracotta-pale);
		padding: 0.12rem 0.45rem;
		border-radius: 6px;
	}
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
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.7rem 1rem;
	}
	.comment-date { font-size: 0.73rem; color: var(--text-light); }
	.comment-body p { line-height: 1.6; }

	.no-comments {
		color: var(--text-light);
		font-style: italic;
		font-size: 0.95rem;
	}

	.delete-recipe-section {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 2px dashed rgba(180, 90, 70, 0.35);
	}
	.delete-recipe-section h2 {
		color: #8b3a2f;
		font-size: 1rem;
		border-bottom: none;
		padding-bottom: 0;
		margin-bottom: 0.5rem;
	}
	.delete-recipe-lead {
		font-size: 0.88rem;
		color: var(--text-medium);
		line-height: 1.55;
		margin: 0 0 1rem;
	}
	.delete-recipe-btn {
		font: inherit;
		font-size: 0.88rem;
		font-weight: 700;
		padding: 0.5rem 1rem;
		border-radius: var(--radius);
		border: 2px solid #a94438;
		background: linear-gradient(180deg, #c75c4e 0%, #a94438 100%);
		color: white;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(139, 58, 47, 0.35);
		transition: filter 0.15s, transform 0.12s;
	}
	.delete-recipe-btn:hover {
		filter: brightness(1.05);
		transform: translateY(-1px);
	}
	.delete-recipe-btn:active {
		transform: translateY(0);
	}
</style>
