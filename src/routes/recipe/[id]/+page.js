import { supabase } from '$lib/supabase.js';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const [recipeRes, commentsRes] = await Promise.all([
		supabase
			.from('recipes')
			.select(`
				*,
				recipe_tags (
					tags ( id, name, category )
				)
			`)
			.eq('id', params.id)
			.single(),
		supabase
			.from('comments')
			.select('*')
			.eq('recipe_id', params.id)
			.order('created_at', { ascending: true })
	]);

	if (!recipeRes.data) {
		throw error(404, 'Recipe not found');
	}

	return {
		recipe:   recipeRes.data,
		comments: commentsRes.data ?? []
	};
};
