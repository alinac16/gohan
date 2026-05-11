import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

/** Server-only client that bypasses RLS (use only after verifying ADMIN_PASSWORD). */
export function getServiceSupabase() {
	const key = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
	if (!key) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
	}
	return createClient(PUBLIC_SUPABASE_URL, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
