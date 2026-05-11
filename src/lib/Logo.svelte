<script>
	/** header (nav) | hero (home) | footer | inline (admin, etc.) */
	let { variant = 'header' } = $props();

	/** Scale applied inside circular crop — slight zoom-in on the artwork. */
	const zoom = 1.18;
</script>

<span
	class="logo-shell"
	class:logo-shell--header={variant === 'header'}
	class:logo-shell--hero={variant === 'hero'}
	class:logo-shell--footer={variant === 'footer'}
	class:logo-shell--inline={variant === 'inline'}
>
	<img
		src="/img/GD.png"
		alt={variant === 'footer' ? '' : 'Gohan Diary'}
		aria-hidden={variant === 'footer' ? true : undefined}
		class="logo-img"
		style={`transform: scale(${zoom})`}
		draggable="false"
	/>
</span>

<style>
	/* Circular crop + overflow clip; inner image scaled up slightly = zoom in. */
	.logo-shell {
		display: inline-block;
		flex-shrink: 0;
		border-radius: 50%;
		overflow: hidden;
		vertical-align: middle;
		box-shadow: 0 0 0 2px rgba(20, 32, 50, 0.06);
	}

	.logo-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		transform-origin: center center;
		user-select: none;
		will-change: transform;
	}

	.logo-shell--header {
		width: 2.75rem;
		height: 2.75rem;
	}

	.logo-shell--hero {
		width: clamp(5rem, 25vw, 10rem);
		height: clamp(5rem, 25vw, 10rem);
		margin: 0 auto;
		box-shadow:
			0 4px 28px rgba(0, 0, 0, 0.22),
			0 0 0 3px rgba(250, 245, 238, 0.2);
	}

	.logo-shell--footer {
		width: 1.85rem;
		height: 1.85rem;
		margin: 0 auto 0.35rem;
		opacity: 1;
		box-shadow: 0 0 0 2px rgba(250, 245, 238, 0.45);
	}

	.logo-shell--inline {
		width: 2.85rem;
		height: 2.85rem;
		margin-bottom: 0.35rem;
	}
</style>
