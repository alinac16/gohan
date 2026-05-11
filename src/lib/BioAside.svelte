<script>
	import { INSTAGRAM_URL } from '$lib/siteUrls.js';

	/** When false, bio stays after main content in narrow layouts (e.g. recipe page). */
	let { sidebarFirstOnNarrow = true } = $props();
</script>

<aside class="site-bio" class:not-first-narrow={!sidebarFirstOnNarrow} aria-label="About the home cook">
	<div class="bio-card">
		<div class="bio-photo-wrap">
			<img
				class="bio-photo"
				src="/img/aboutcirnb.png"
				alt="Portrait of the home cook behind Gohan Diary"
				loading="lazy"
				width="300"
				height="360"
			/>
		</div>
		<div class="bio-copy">
			<h2 class="bio-heading">Thai–Japanese home cooking, Canadian edition</h2>
			<p class="bio-lead">
				A Thai–Japanese home cook living in Canada: pet-less and far from family.
				<strong>Gohan Diary</strong> started from looking for a cure for homesickness and chronic screen time.
			</p>
			<ul class="bio-highlights">
				<li>
					<span class="bio-dot" aria-hidden="true"></span>
					<span class="bio-li-text">
						<strong>Why she cooks:</strong>
						She realized the 18% tip at restaurants could buy a good cut of steak at home. In the age of social media,
						creation beats consumption—this is her chance to finally try those saved recipes.
					</span>
				</li>
				<li>
					<span class="bio-dot" aria-hidden="true"></span>
					<span class="bio-li-text">
						<strong>Pantry philosophy:</strong>
						a comfy mix of everyday Canadian supermarket staples and the fun condiments and flavor packs from Chinatown when
						she makes the trip.
					</span>
				</li>
				<li>
					<span class="bio-dot" aria-hidden="true"></span>
					<span class="bio-li-text">
						<strong>Taste testers:</strong>
						recipes here get tweaked for her and Andrew's palates. When something's a miss, she writes that down too—the same
						recipe has disappointed friends before, so flops deserve an honest note as much as wins.
					</span>
				</li>
			</ul>
			<p class="bio-instagram">
				More on
				<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram (@gohan.diaryy)</a>.
			</p>
			<p class="bio-lang-note" lang="th">
				ทำกับข้าวกินเล่นกับเพื่อนเรื่อย ๆ แล้วก็เอาสูตรมาลงไว้ มีทั้งที่อร่อยกับที่ไม่ค่อยรอด จะได้จำได้ว่าสูตรไหนควรทำอีก สูตรไหนพอแล้ว 😂
			</p>
			<p class="bio-lang-note" lang="ja">
				適当に作った料理のレシピをゆるく載せてます。本格的な味とかにはそこまでこだわってない、かなり雑なページです。よかったら参考にしてもらえたら嬉しいです！
			</p>
		</div>
	</div>
</aside>

<style>
	.site-bio {
		position: sticky;
		top: 5.25rem;
	}

	.bio-card {
		background: var(--surface);
		border: 2px solid var(--border);
		border-radius: calc(var(--radius) + 6px);
		box-shadow: var(--shadow);
		overflow: hidden;
		border-left: 4px solid var(--bowl);
	}

	.bio-photo-wrap {
		line-height: 0;
		background: linear-gradient(180deg, var(--cream-dark), var(--cream));
	}

	/* Intrinsic aspect ratio — show full illustration without cropping */
	.bio-photo {
		width: 100%;
		height: auto;
		display: block;
	}

	.bio-copy {
		padding: 1.25rem 1.35rem 1.5rem;
	}

	.bio-heading {
		font-family: 'Fredoka', system-ui, sans-serif;
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--navy-deep);
		line-height: 1.35;
		margin: 0 0 0.85rem;
		letter-spacing: -0.02em;
	}

	.bio-lead {
		font-size: 0.92rem;
		color: var(--text-medium);
		line-height: 1.65;
		margin: 0 0 1rem;
	}

	.bio-lead strong {
		color: var(--bowl);
		font-weight: 700;
	}

	.bio-highlights {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.bio-highlights li {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.88rem;
		line-height: 1.55;
		color: var(--text);
	}

	.bio-li-text strong {
		color: var(--navy-deep);
		font-weight: 700;
	}

	.bio-dot {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		margin-top: 0.42rem;
		background: linear-gradient(145deg, var(--bowl-soft), var(--bowl));
		box-shadow: 0 1px 3px rgba(236, 90, 50, 0.35);
	}

	.bio-instagram {
		margin: 1.25rem 0 0;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		font-size: 0.88rem;
		line-height: 1.55;
		color: var(--text-medium);
	}

	.bio-instagram a {
		color: var(--bowl);
		font-weight: 700;
		text-decoration: none;
	}

	.bio-instagram a:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.bio-instagram + .bio-lang-note {
		margin-top: 1rem;
	}

	.bio-lang-note {
		margin: 0;
		font-size: 0.86rem;
		line-height: 1.65;
		color: var(--text-medium);
	}

	.bio-lang-note + .bio-lang-note {
		margin-top: 0.85rem;
	}

	@media (max-width: 960px) {
		.site-bio:not(.not-first-narrow) {
			order: -1;
		}

		.site-bio {
			position: static;
			max-width: 480px;
			margin: 0 auto 0.5rem;
			width: 100%;
		}

		/* Stack portrait above copy (two-column grid looked cramped on phones/tablets). */
		.bio-card {
			display: flex;
			flex-direction: column;
		}

		.bio-photo-wrap {
			min-height: unset;
		}

		.bio-photo {
			width: 70%;
			margin-inline: auto;
		}

		.bio-copy {
			padding: 1rem 1.15rem 1.15rem;
		}

		.bio-heading {
			font-size: 1.05rem;
		}
	}
</style>
