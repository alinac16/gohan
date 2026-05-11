import { dev } from '$app/environment';
import { timingSafeEqual } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase.js';
import { getServiceSupabase } from '$lib/supabase-service.server.js';

/** Human-readable PostgREST / Postgres error for the admin form + terminal logs. */
function formatSupabaseError(err, context) {
	if (!err || typeof err !== 'object') return String(err ?? 'Unknown error');
	const parts = [];
	const o = /** @type {{ message?: string; code?: string; details?: string; hint?: string }} */ (err);
	if (o.message) parts.push(o.message);
	if (o.code) parts.push(`Code: ${o.code}`);
	if (o.details) parts.push(`Details: ${o.details}`);
	if (o.hint) parts.push(`Hint: ${o.hint}`);
	const text = parts.join('\n');
	if (dev) {
		console.error(`[admin/createRecipe] ${context}`, {
			message: o.message,
			code: o.code,
			details: o.details,
			hint: o.hint
		});
	} else {
		console.error(`[admin/createRecipe] ${context}`, text);
	}
	return text;
}

export async function load() {
	const { data: tags, error } = await supabase
		.from('tags')
		.select('*')
		.order('category')
		.order('name');

	if (error) {
		console.error(error);
		return { tags: [] };
	}

	return { tags: tags ?? [] };
}

function passwordMatches(provided, expected) {
	const enc = new TextEncoder();
	const a = enc.encode(provided);
	const b = enc.encode(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export const actions = {
	createRecipe: async ({ request }) => {
		const expected = env.ADMIN_PASSWORD ?? '';
		if (!expected) {
			return fail(500, { error: 'Server misconfiguration: ADMIN_PASSWORD is not set.' });
		}

		const formData = await request.formData();
		const password = String(formData.get('admin_password') ?? '');

		if (!passwordMatches(password, expected)) {
			return fail(400, { error: 'Incorrect password.' });
		}

		const title = String(formData.get('title') ?? '').trim();
		if (!title) {
			return fail(400, { error: 'Title is required.' });
		}

		const description = String(formData.get('description') ?? '').trim() || null;
		const ingredients = String(formData.get('ingredients') ?? '').trim() || null;
		const instructions = String(formData.get('instructions') ?? '').trim() || null;

		const sourceUrlRaw = String(formData.get('source_url') ?? '').trim();
		let sourceUrl = null;
		if (sourceUrlRaw) {
			try {
				const u = new URL(sourceUrlRaw);
				if (u.protocol !== 'http:' && u.protocol !== 'https:') {
					return fail(400, { error: 'Source URL must start with http:// or https://.' });
				}
				sourceUrl = u.href;
			} catch {
				return fail(400, { error: 'Source URL is not valid. Paste a full link (https://…).' });
			}
		}

		const ratingRaw = formData.get('rating');
		const ratingNum = ratingRaw ? Number(ratingRaw) : NaN;
		const rating =
			Number.isFinite(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? Math.round(ratingNum) : null;

		const tagIds = formData.getAll('tag_ids').map(String).filter(Boolean);
		const image = formData.get('image');

		let sb;
		try {
			sb = getServiceSupabase();
		} catch {
			return fail(500, {
				error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.'
			});
		}

		let imageUrl = null;
		if (image && typeof image !== 'string' && 'arrayBuffer' in image && image.size > 0) {
			const name = 'name' in image ? String(image.name) : 'upload';
			const ext = name.includes('.') ? name.split('.').pop() : 'jpg';
			const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
			const bytes = new Uint8Array(await image.arrayBuffer());
			const { error: uploadErr } = await sb.storage.from('recipe-images').upload(path, bytes, {
				contentType: image.type || `image/${ext}`,
				upsert: false
			});
			if (uploadErr) {
				return fail(500, {
					error: formatSupabaseError(uploadErr, 'storage upload') + (dev ? '\n\n(Terminal has full object.)' : '')
				});
			}
			const {
				data: { publicUrl }
			} = sb.storage.from('recipe-images').getPublicUrl(path);
			imageUrl = publicUrl;
		}

		const { data: recipe, error: insertErr } = await sb
			.from('recipes')
			.insert({
				title,
				description,
				ingredients,
				instructions,
				image_url: imageUrl,
				source_url: sourceUrl,
				rating,
				created_by: null
			})
			.select()
			.single();

		if (insertErr || !recipe) {
			const msg =
				formatSupabaseError(insertErr, 'recipes insert') +
				(dev
					? '\n\nTip: confirm SUPABASE_SERVICE_ROLE_KEY is the service_role secret (not anon), run migrations 005 in SQL Editor, and watch this terminal while reproducing.'
					: '');
			return fail(500, { error: msg || 'Could not save recipe.' });
		}

		if (tagIds.length > 0) {
			const { error: tagErr } = await sb.from('recipe_tags').insert(
				tagIds.map((tag_id) => ({ recipe_id: recipe.id, tag_id }))
			);
			if (tagErr) {
				return fail(500, {
					error:
						formatSupabaseError(tagErr, 'recipe_tags insert') + (dev ? '\n\n(Terminal has full object.)' : '')
				});
			}
		}

		redirect(303, `/recipe/${recipe.id}`);
	}
};
