<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let title = $state('');
	let description = $state('');
	let instructions = $state('');
	let rating = $state(0);
	let hoverRating = $state(0);
	let selectedTagIds = $state([]);
	let imagePreview = $state('');

	const tagsByCategory = $derived.by(() => {
		const groups = {};
		for (const tag of data.tags) {
			if (!groups[tag.category]) groups[tag.category] = [];
			groups[tag.category].push(tag);
		}
		return groups;
	});

	const categoryOrder = ['protein', 'complexity', 'time'];

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
</script>

<svelte:head>
	<title>New Recipe — Gohan Diary</title>
</svelte:head>

<div class="admin-page">
	<div class="container">
		<a href="/" class="back">← Back to Recipes</a>
		<h1>Add a New Recipe</h1>

		<form
			class="form"
			method="POST"
			action="?/createRecipe"
			enctype="multipart/form-data"
			use:enhance
		>
			<!-- Title -->
			<div class="field">
				<label for="title">Title <span class="required">*</span></label>
				<input id="title" name="title" type="text" bind:value={title} placeholder="e.g. Miso Ramen" required />
			</div>

			<!-- Description -->
			<div class="field">
				<label for="desc">Description</label>
				<textarea
					id="desc"
					name="description"
					bind:value={description}
					rows="3"
					placeholder="A short note about this dish — where it's from, why you love it…"
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
					rows="9"
					placeholder={"Boil the water.\nAdd noodles and cook 3 minutes.\nLadle in miso broth. Serve."}
				></textarea>
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
								<p class="tag-group-label">{cat}</p>
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

			<!-- Site password -->
			<div class="field">
				<label for="admin_password">Site password <span class="required">*</span></label>
				<input
					id="admin_password"
					name="admin_password"
					type="password"
					autocomplete="current-password"
					required
					placeholder="Password to publish recipes"
				/>
			</div>

			{#if form?.error}
				<p class="form-error">{form.error}</p>
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

	h1 {
		font-family: 'Caveat', cursive;
		font-size: 2.6rem;
		color: var(--terracotta);
		margin-bottom: 2.25rem;
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
	input[type='password'],
	textarea {
		padding: 0.7rem 1rem;
		border: 2px solid var(--border);
		border-radius: var(--radius);
		font-family: inherit;
		font-size: 0.95rem;
		color: var(--text);
		background: white;
		transition: border-color 0.2s;
		width: 100%;
	}
	input[type='text']:focus,
	input[type='password']:focus,
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

	/* Error & submit */
	.form-error {
		background: #fdf0ef;
		border: 1px solid #e8b4b0;
		color: #c0392b;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
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
