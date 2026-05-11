import { dev } from '$app/environment';
import { timingSafeEqual } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getServiceSupabase } from '$lib/supabase-service.server.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function passwordMatches(provided, expected) {
	const enc = new TextEncoder();
	const a = enc.encode(provided);
	const b = enc.encode(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

function formatSupabaseError(err) {
	if (!err || typeof err !== 'object') return String(err ?? 'Unknown error');
	const o = /** @type {{ message?: string; code?: string }} */ (err);
	return [o.message, o.code ? `Code: ${o.code}` : ''].filter(Boolean).join('\n');
}

export const actions = {
	saveRecipeTags: async ({ request, params }) => {
		const recipeId = params.id ?? '';
		if (!UUID_RE.test(recipeId)) {
			return fail(400, { tagsError: 'Invalid recipe.' });
		}

		const expected = env.ADMIN_PASSWORD ?? '';
		if (!expected) {
			return fail(500, { tagsError: 'Server misconfiguration: ADMIN_PASSWORD is not set.' });
		}

		const formData = await request.formData();
		const password = String(formData.get('admin_password') ?? '');
		if (!passwordMatches(password, expected)) {
			return fail(400, { tagsError: 'Incorrect password.' });
		}

		let sb;
		try {
			sb = getServiceSupabase();
		} catch {
			return fail(500, {
				tagsError: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.'
			});
		}

		const rawIds = formData.getAll('tag_ids').map(String);
		const tagIds = [];
		for (const id of rawIds) {
			if (UUID_RE.test(id)) tagIds.push(id);
		}

		const newName = String(formData.get('new_tag_name') ?? '').trim();
		const newCategory = String(formData.get('new_tag_category') ?? '').trim();

		if (
			newName &&
			(newCategory === 'protein' || newCategory === 'complexity' || newCategory === 'time')
		) {
			const { data: exists } = await sb.from('tags').select('id').eq('name', newName).maybeSingle();
			if (exists?.id) {
				tagIds.push(exists.id);
			} else {
				const { data: inserted, error: tagErr } = await sb
					.from('tags')
					.insert({ name: newName, category: newCategory })
					.select('id')
					.single();

				if (tagErr) {
					if (tagErr.code === '23505') {
						const { data: again } = await sb.from('tags').select('id').eq('name', newName).maybeSingle();
						if (again?.id) tagIds.push(again.id);
					} else {
						if (dev) console.error('[saveRecipeTags] tags insert', tagErr);
						return fail(500, { tagsError: formatSupabaseError(tagErr) });
					}
				} else if (inserted?.id) {
					tagIds.push(inserted.id);
				}
			}
		}

		const finalIds = [...new Set(tagIds)];

		const { error: delErr } = await sb.from('recipe_tags').delete().eq('recipe_id', recipeId);
		if (delErr) {
			if (dev) console.error('[saveRecipeTags] recipe_tags delete', delErr);
			return fail(500, { tagsError: formatSupabaseError(delErr) });
		}

		if (finalIds.length > 0) {
			const rows = finalIds.map((tag_id) => ({ recipe_id: recipeId, tag_id }));
			const { error: rtErr } = await sb.from('recipe_tags').insert(rows);
			if (rtErr) {
				if (dev) console.error('[saveRecipeTags] recipe_tags insert', rtErr);
				return fail(500, { tagsError: formatSupabaseError(rtErr) });
			}
		}

		redirect(303, `/recipe/${recipeId}`);
	},

	addComment: async ({ request, params }) => {
		const recipeId = params.id ?? '';
		if (!UUID_RE.test(recipeId)) {
			return fail(400, { commentError: 'Invalid recipe.' });
		}

		const expected = env.ADMIN_PASSWORD ?? '';
		if (!expected) {
			return fail(500, { commentError: 'Server misconfiguration: ADMIN_PASSWORD is not set.' });
		}

		const formData = await request.formData();
		const password = String(formData.get('admin_password') ?? '');
		if (!passwordMatches(password, expected)) {
			return fail(400, { commentError: 'Incorrect password.' });
		}

		const body = String(formData.get('body') ?? '').trim();
		if (!body) {
			return fail(400, { commentError: 'Write something for the comment.' });
		}

		let sb;
		try {
			sb = getServiceSupabase();
		} catch {
			return fail(500, {
				commentError: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.'
			});
		}

		const { error: insErr } = await sb.from('comments').insert({
			recipe_id: recipeId,
			body,
			user_id: null
		});

		if (insErr) {
			if (dev) console.error('[addComment]', insErr);
			return fail(500, { commentError: formatSupabaseError(insErr) });
		}

		redirect(303, `/recipe/${recipeId}`);
	},

	deleteRecipe: async ({ request, params }) => {
		const id = params.id ?? '';
		if (!UUID_RE.test(id)) {
			return fail(400, { deleteError: 'Invalid recipe.' });
		}

		const expected = env.ADMIN_PASSWORD ?? '';
		if (!expected) {
			return fail(500, { deleteError: 'Server misconfiguration: ADMIN_PASSWORD is not set.' });
		}

		const formData = await request.formData();
		const password = String(formData.get('admin_password') ?? '');
		if (!passwordMatches(password, expected)) {
			return fail(400, { deleteError: 'Incorrect password.' });
		}

		let sb;
		try {
			sb = getServiceSupabase();
		} catch {
			return fail(500, {
				deleteError: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.'
			});
		}

		const { data: deleted, error: delErr } = await sb.from('recipes').delete().eq('id', id).select('id');

		if (delErr) {
			if (dev) console.error('[deleteRecipe]', delErr);
			return fail(500, {
				deleteError: formatSupabaseError(delErr) || 'Could not delete recipe.'
			});
		}

		if (!deleted?.length) {
			return fail(404, { deleteError: 'Recipe not found or already deleted.' });
		}

		redirect(303, '/');
	}
};
