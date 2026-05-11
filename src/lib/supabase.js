import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Lazy anon client so `vite build` does not call `createClient` while analysing routes
 * when env vars are temporarily unset (misconfigured Netlify “build” env).
 */
let _client;

function ensureClient() {
	if (!_client) {
		const url = String(PUBLIC_SUPABASE_URL ?? '').trim();
		const key = String(PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
		if (!url || !key) {
			throw new Error(
				'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY. Add both under Site settings → Environment variables (same names as in .env.example).'
			);
		}
		_client = createClient(url, key);
	}
	return _client;
}

/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const supabase = new Proxy(
	{},
	{
		get(_, prop) {
			const client = ensureClient();
			const value = client[prop];
			return typeof value === 'function' ? value.bind(client) : value;
		}
	}
);
