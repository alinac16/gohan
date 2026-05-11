<script>
	import { enhance } from '$app/forms';
	import Logo from '$lib/Logo.svelte';
	import { sortTagsForCategory } from '$lib/tagOrder.js';

	let { data, form } = $props();

	let title = $state('');
	let description = $state('');
	let ingredients = $state('');
	let instructions = $state('');
	let rating = $state(0);
	let hoverRating = $state(0);
	let selectedTagIds = $state([]);
	let imagePreview = $state('');
	let adminPassword = $state('');
	let pasteText = $state('');
	let sourceUrl = $state('');
	let parseLoading = $state(false);
	let parseMessage = $state('');
	let parseError = $state('');

	/** Pull first http(s) URL from pasted web copy so source can be logged automatically. */
	function extractFirstHttpUrl(text) {
		const m = text.match(/https?:\/\/[^\s<>"'`)\]}]+/i);
		if (!m) return '';
		return m[0].replace(/[.,;:)]+$/, '');
	}

	const categoryOrder = ['protein', 'complexity', 'time'];

	const categoryLabel = {
		protein: 'Protein',
		complexity: 'Complexity',
		time: 'Time'
	};

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

	function handleImageSelect(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		imagePreview = URL.createObjectURL(file);
	}

	function removeImage() {
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		imagePreview = '';
		const input = document.getElementById('image-upload');
		if (input) input.value = '';
	}

	function setRating(n) {
		rating = rating === n ? 0 : n;
	}

	async function formatWithAI() {
		parseMessage = '';
		parseError = '';
		if (!pasteText.trim()) {
			parseError = 'Paste some recipe text first.';
			return;
		}
		if (!adminPassword.trim()) {
			parseError = 'Enter the site password first.';
			return;
		}
		parseLoading = true;
		try {
			const res = await fetch('/api/parse-recipe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: pasteText, admin_password: adminPassword.trim() })
			});
			const raw = await res.text();
			let data = {};
			try {
				data = raw ? JSON.parse(raw) : {};
			} catch {
				parseError =
					raw && raw.includes('<!DOCTYPE')
						? `Server error (${res.status}). Check Netlify logs and env vars (GEMINI_API_KEY, ADMIN_PASSWORD).`
						: `Request failed (${res.status}). ${(raw || '').slice(0, 240)}`;
				return;
			}
			if (!res.ok) {
				parseError =
					typeof data.message === 'string' ? data.message : `Request failed (${res.status}).`;
				return;
			}
			title = typeof data.title === 'string' ? data.title : '';
			ingredients = typeof data.ingredients === 'string' ? data.ingredients : '';
			instructions = typeof data.instructions === 'string' ? data.instructions : '';
			if (!sourceUrl.trim()) {
				const extracted = extractFirstHttpUrl(pasteText);
				if (extracted) sourceUrl = extracted;
			}
			parseMessage = 'Title, ingredients, and steps updated from pasted text.';
		} catch {
			parseError = 'Could not reach the server. Try again.';
		} finally {
			parseLoading = false;
		}
	}
</script>

<svelte:head>
	<title>New Recipe — Gohan Diary</title>
</svelte:head>

<div class="admin-page">
	<div class="container">
		<a href="/" class="back">← Back to Recipes</a>
		<div class="admin-brand">
			<Logo variant="inline" />
		</div>
		<h1>Add a New Recipe</h1>

		<details class="paste-from-web">
			<summary>Paste a recipe from the web</summary>
			<div class="paste-inner">
				<p class="paste-hint">
					Paste a messy block copied from a blog or recipe site. Enter your site password (next field), then click
					<strong>Format with AI</strong> to extract the title, ingredient lines (with amounts + units), and step-by-step
					instructions. Your <strong>Notes</strong> field is never filled by AI—add those yourself. If the paste includes
					a link, <strong>Original recipe URL</strong> fills in automatically (you can edit it).
				</p>
				<label for="paste-recipe" class="sr-only">Raw pasted recipe text</label>
				<textarea
					id="paste-recipe"
					class="paste-textarea"
					bind:value={pasteText}
					rows="12"
					placeholder="Paste article text, ingredients lists, and directions here…"
					disabled={parseLoading}
				></textarea>
				<div class="paste-actions">
					<button type="button" class="parse-ai-btn" onclick={formatWithAI} disabled={parseLoading}>
						{parseLoading ? 'Formatting…' : 'Format with AI'}
					</button>
				</div>
				{#if parseMessage}
					<p class="parse-success">{parseMessage}</p>
				{/if}
				{#if parseError}
					<p class="parse-error">{parseError}</p>
				{/if}
			</div>
		</details>

		<form
			class="form"
			method="POST"
			action="?/createRecipe"
			enctype="multipart/form-data"
			use:enhance
		>
			<!-- Site password (shared: AI parse + save) -->
			<div class="field">
				<label for="admin_password">Site password <span class="required">*</span></label>
				<input
					id="admin_password"
					name="admin_password"
					type="text"
					autocomplete="off"
					spellcheck="false"
					required
					placeholder="Password to publish recipes"
					bind:value={adminPassword}
				/>
			</div>

			<!-- Title -->
			<div class="field">
				<label for="title">Title <span class="required">*</span></label>
				<input id="title" name="title" type="text" bind:value={title} placeholder="e.g. Miso Ramen" required />
			</div>

			<!-- Ingredients (scaled on published recipe when quantities use units) -->
			<div class="field">
				<label for="ingredients">Ingredients</label>
				<span class="hint">One ingredient per line — include amounts and units (e.g. 2 cups flour, 15 ml sesame oil).</span>
				<textarea
					id="ingredients"
					name="ingredients"
					bind:value={ingredients}
					rows="10"
					placeholder={"2 cups short-grain rice\n600 ml water\n1 tbsp butter"}
				></textarea>
			</div>

			<!-- Instructions -->
			<div class="field">
				<label for="instr">Instructions</label>
				<span class="hint">One step per line.</span>
				<textarea
					id="instr"
					name="instructions"
					bind:value={instructions}
					rows="12"
					placeholder={"Rinse rice until water runs clear.\nCombine rice and water in a pot; bring to a boil.\nCover and simmer until tender."}
				></textarea>
			</div>

			<!-- Notes (manual only — not from Format with AI) -->
			<div class="field">
				<label for="desc">Notes</label>
				<span class="hint">Optional — your thoughts, substitutions, what worked; not filled automatically.</span>
				<textarea
					id="desc"
					name="description"
					bind:value={description}
					rows="3"
					placeholder="What I'd change next time, where it's from, pairing ideas…"
				></textarea>
			</div>

			<!-- Source URL (logged when adapting from the web) -->
			<div class="field">
				<label for="source_url">Original recipe URL</label>
				<span class="hint">Optional — the page you copied from (https://…).</span>
				<input
					id="source_url"
					name="source_url"
					type="url"
					inputmode="url"
					autocomplete="off"
					bind:value={sourceUrl}
					placeholder="https://example.com/recipe"
				/>
			</div>

			<!-- Photo -->
			<div class="field">
				<span class="field-label" id="admin-photo-label">Photo</span>
				<div class="upload-box" role="group" aria-labelledby="admin-photo-label">
					{#if imagePreview}
						<div class="preview-wrap">
							<img src={imagePreview} alt="Preview" class="preview-img" />
							<button type="button" class="remove-btn" onclick={removeImage}>Remove</button>
						</div>
					{:else}
						<label class="upload-target" for="image-upload">
							<span class="upload-icon">📷</span>
							<span class="upload-text">Click to upload a photo</span>
							<span class="upload-hint">JPG · PNG · WEBP · up to 5 MB</span>
						</label>
					{/if}
					<input
						id="image-upload"
						name="image"
						type="file"
						accept="image/*"
						onchange={handleImageSelect}
						style="display:none"
					/>
				</div>
			</div>

			<!-- Star rating -->
			<div class="field">
				<span class="field-label" id="admin-rating-label">Rating</span>
				<input type="hidden" name="rating" value={rating || ''} />
				<div class="star-picker" role="group" aria-labelledby="admin-rating-label">
					{#each [1, 2, 3, 4, 5] as n}
						<button
							type="button"
							class="star"
							class:lit={n <= (hoverRating || rating)}
							onclick={() => setRating(n)}
							onmouseenter={() => {
								hoverRating = n;
							}}
							onmouseleave={() => {
								hoverRating = 0;
							}}
							aria-label="{n} star{n !== 1 ? 's' : ''}"
						>★</button>
					{/each}
					{#if rating}
						<span class="rating-label">{rating} / 5</span>
					{/if}
				</div>
			</div>

			<!-- Tags -->
			{#if Object.keys(tagsByCategory).length}
				<div class="field">
					<span class="field-label" id="admin-tags-label">Tags</span>
					<div class="tags-grid" role="group" aria-labelledby="admin-tags-label">
						{#each categoryOrder.filter((c) => tagsByCategory[c]) as cat}
							<div class="tag-group">
								<p class="tag-group-label">{categoryLabel[cat] ?? cat}</p>
								<div class="tag-checks">
									{#each tagsByCategory[cat] as tag}
										<label class="tag-check">
											<input type="checkbox" name="tag_ids" value={tag.id} bind:group={selectedTagIds} />
											{tag.name}
										</label>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if form?.error}
				<pre class="form-error-detail">{form.error}</pre>
			{/if}

			<button type="submit" class="submit-btn">Save Recipe</button>
		</form>
	</div>
</div>

<style>
	.admin-page {
		padding-bottom: 6rem;
	}

	.container {
		max-width: 660px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.back {
		display: inline-block;
		margin: 1.75rem 0 1.5rem;
		color: var(--text-light);
		font-size: 0.88rem;
		text-decoration: none;
		transition: color 0.2s;
	}
	.back:hover {
		color: var(--terracotta);
	}

	.admin-brand {
		line-height: 0;
		margin-bottom: 0.5rem;
	}

	h1 {
		font-size: 2.35rem;
		color: var(--navy-deep);
		margin-bottom: 2.25rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.paste-from-web {
		margin-bottom: 2rem;
		border: 2px solid var(--border);
		border-radius: var(--radius);
		background: var(--cream-dark);
		overflow: hidden;
	}

	.paste-from-web summary {
		cursor: pointer;
		padding: 0.85rem 1.1rem;
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--olive-dark);
		list-style: none;
	}
	.paste-from-web summary::-webkit-details-marker {
		display: none;
	}
	.paste-from-web summary::before {
		content: '▸ ';
		display: inline-block;
		transition: transform 0.15s;
	}
	.paste-from-web[open] summary::before {
		transform: rotate(90deg);
	}

	.paste-inner {
		padding: 0 1.1rem 1.15rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.paste-hint {
		font-size: 0.82rem;
		color: var(--text-light);
		line-height: 1.5;
		margin: 0;
	}

	.paste-textarea {
		min-height: 200px;
		font-size: 0.88rem;
	}

	.paste-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.parse-ai-btn {
		background: var(--olive-dark);
		color: white;
		border: none;
		padding: 0.65rem 1.35rem;
		border-radius: 24px;
		font-size: 0.92rem;
		font-family: inherit;
		font-weight: 700;
		cursor: pointer;
		transition:
			background 0.2s,
			opacity 0.2s;
	}
	.parse-ai-btn:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	.parse-ai-btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.parse-success {
		font-size: 0.88rem;
		color: #2d6a4f;
		font-weight: 600;
		margin: 0;
	}

	.parse-error {
		font-size: 0.88rem;
		color: #c0392b;
		margin: 0;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	/* Fields */
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field > label,
	.field-label {
		font-weight: 700;
		font-size: 0.88rem;
		color: var(--olive-dark);
		letter-spacing: 0.02em;
	}

	.required {
		color: var(--terracotta);
	}

	.hint {
		font-size: 0.78rem;
		color: var(--text-light);
		margin-top: -0.15rem;
	}

	input[type='text'],
	input[type='url'],
	textarea {
		padding: 0.7rem 1rem;
		border: 2px solid var(--border);
		border-radius: var(--radius);
		font-family: inherit;
		font-size: 0.95rem;
		color: var(--text);
		background: var(--surface);
		transition: border-color 0.2s;
		width: 100%;
	}
	input[type='text']:focus,
	input[type='url']:focus,
	textarea:focus {
		outline: none;
		border-color: var(--terracotta-light);
	}
	textarea {
		resize: vertical;
		line-height: 1.65;
	}

	/* Upload */
	.upload-box {
		border: 2px dashed var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		transition: border-color 0.2s;
	}
	.upload-box:has(.upload-target:hover) {
		border-color: var(--terracotta-light);
	}

	.upload-target {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 2.75rem 1rem;
		color: var(--text-light);
		transition: background 0.2s;
	}
	.upload-target:hover {
		background: var(--cream-dark);
	}
	.upload-icon {
		font-size: 2.2rem;
	}
	.upload-text {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--text-medium);
	}
	.upload-hint {
		font-size: 0.75rem;
	}

	.preview-wrap {
		position: relative;
	}
	.preview-img {
		width: 100%;
		max-height: 320px;
		object-fit: cover;
	}
	.remove-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(0, 0, 0, 0.55);
		color: white;
		border: none;
		padding: 0.3rem 0.8rem;
		border-radius: 20px;
		font-size: 0.8rem;
	}

	/* Star picker */
	.star-picker {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}
	.star {
		background: none;
		border: none;
		font-size: 2.1rem;
		color: var(--border);
		padding: 0 0.05rem;
		line-height: 1;
		transition:
			color 0.12s,
			transform 0.1s;
	}
	.star.lit {
		color: var(--terracotta);
	}
	.star:hover {
		transform: scale(1.18);
	}
	.rating-label {
		font-size: 0.85rem;
		color: var(--text-light);
		font-weight: 700;
		margin-left: 0.5rem;
	}

	/* Tags */
	.tags-grid {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}
	.tag-group {
		flex: 1;
		min-width: 130px;
	}
	.tag-group-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--text-light);
		margin-bottom: 0.5rem;
	}
	.tag-checks {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.tag-check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-medium);
	}
	.tag-check input[type='checkbox'] {
		width: 16px;
		height: 16px;
		accent-color: var(--terracotta);
	}

	@media (max-width: 640px) {
		.tags-grid {
			flex-direction: column;
			gap: 1.25rem;
		}
		.tag-group {
			flex: none;
			min-width: 0;
			width: 100%;
		}
	}

	/* Error & submit */
	.form-error,
	.form-error-detail {
		background: #fdf0ef;
		border: 1px solid #e8b4b0;
		color: #c0392b;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
	}
	.form-error-detail {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: inherit;
		line-height: 1.5;
		max-height: 22rem;
		overflow: auto;
	}

	.submit-btn {
		align-self: flex-start;
		background: var(--terracotta);
		color: white;
		border: none;
		padding: 0.85rem 2.75rem;
		border-radius: 30px;
		font-size: 1rem;
		font-family: inherit;
		font-weight: 700;
		transition:
			background 0.2s,
			transform 0.1s;
	}
	.submit-btn:hover {
		background: var(--warm-brown);
		transform: translateY(-2px);
	}
</style>
