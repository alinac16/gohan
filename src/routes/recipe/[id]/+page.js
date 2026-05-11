import { supabase } from '$lib/supabase.js';
import { error } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load = async ({ params }) => {
	const id = params.id ?? '';
	if (!UUID_RE.test(id)) {
		throw error(404, 'Invalid recipe link');
	}

	const selectWithTags = `
				*,
				recipe_tags (
					tags ( id, name, category )
				)
			`;

	let recipeRes = await supabase.from('recipes').select(selectWithTags).eq('id', id).maybeSingle();

	/* Nested select can fail if FK/embed breaks; fall back to plain row + empty tags. */
	if (recipeRes.error) {
		console.error('[recipe/[id]] recipe query (with tags)', recipeRes.error);
		const plain = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();
		if (plain.error) {
			console.error('[recipe/[id]] recipe query (plain)', plain.error);
			throw error(
				500,
				`Could not load this recipe from the database: ${plain.error.message}. If this mentions “permission denied”, run migrations (005) in Supabase and ensure anon can SELECT public.recipes.`
			);
		}
		if (!plain.data) {
			throw error(404, 'Recipe not found');
		}
		recipeRes = {
			data: { ...plain.data, recipe_tags: [] },
			error: null
		};
	}

	if (!recipeRes.data) {
		throw error(404, 'Recipe not found');
	}

	const { data: comments, error: commentsErr } = await supabase
		.from('comments')
		.select('*')
		.eq('recipe_id', id)
		.order('created_at', { ascending: true });

	if (commentsErr) {
		console.error('[recipe/[id]] comments', commentsErr);
	}

	let allTags = [];
	const tagsRes = await supabase.from('tags').select('*').order('category').order('name');
	if (tagsRes.error) {
		console.error('[recipe/[id]] all tags', tagsRes.error);
	} else {
		allTags = tagsRes.data ?? [];
	}

	return {
		recipe: recipeRes.data,
		comments: comments ?? [],
		allTags
	};
};
