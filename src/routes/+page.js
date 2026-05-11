import { dev } from '$app/environment';
import { supabase } from '$lib/supabase.js';

const RECIPE_WITH_TAGS = `
	id, title, description, ingredients, image_url, rating, created_at,
	recipe_tags (
		tags ( id, name, category )
	)
`;

export const load = async () => {
	const withTags = await supabase
		.from('recipes')
		.select(RECIPE_WITH_TAGS)
		.order('created_at', { ascending: false });

	/** @type {unknown[] | null} */
	let recipes = withTags.data;

	if (withTags.error) {
		if (dev) {
			console.error('[home] recipes query (with tags)', withTags.error);
		}
		const plain = await supabase
			.from('recipes')
			.select('id, title, description, ingredients, image_url, rating, created_at')
			.order('created_at', { ascending: false });

		if (plain.error) {
			if (dev) console.error('[home] recipes query (plain)', plain.error);
			recipes = [];
		} else {
			recipes = (plain.data ?? []).map((r) => ({ ...r, recipe_tags: [] }));
		}
	} else {
		recipes = withTags.data ?? [];
	}

	const tagsResult = await supabase.from('tags').select('*').order('name');

	if (tagsResult.error && dev) {
		console.error('[home] tags query', tagsResult.error);
	}

	return {
		recipes,
		tags: tagsResult.data ?? []
	};
};
