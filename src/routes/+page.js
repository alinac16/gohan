import { supabase } from '$lib/supabase.js';

export const load = async () => {
	const [recipesResult, tagsResult] = await Promise.all([
		supabase
			.from('recipes')
			.select(`
				id, title, description, image_url, rating, created_at,
				recipe_tags (
					tags ( id, name, category )
				)
			`)
			.order('created_at', { ascending: false }),
		supabase
			.from('tags')
			.select('*')
			.order('category')
			.order('name')
	]);

	return {
		recipes: recipesResult.data ?? [],
		tags:    tagsResult.data    ?? []
	};
};
