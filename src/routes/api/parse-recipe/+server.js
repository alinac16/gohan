import { timingSafeEqual } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const SYSTEM_PROMPT = `You extract recipe information from text pasted from websites. Ignore navigation, ads, comments, author bios, newsletter prompts, and unrelated prose.

Extract ONLY:
1) Recipe title
2) Ingredients list — plain text, ONE INGREDIENT PER LINE. Each line should include a number and a unit where applicable (e.g. "2 cups rice", "400 g chicken breast", "1 tbsp soy sauce", "3 cloves garlic") so quantities can be scaled later. Keep amounts and units in the same line as the ingredient name.
3) Instructions — plain text, ONE COOKING STEP PER LINE (no markdown headings, no numbered markdown lists—just plain lines in order).

Do NOT extract marketing blurbs, story intros, or "recipe descriptions"—those are added manually by the cook.

Respond with a single JSON object only with exactly these keys:
- "title": string
- "ingredients": string (newline-separated lines)
- "instructions": string (newline-separated steps)

Use empty string "" for any missing field.`;

function passwordMatches(provided, expected) {
	const enc = new TextEncoder();
	const a = enc.encode(provided);
	const b = enc.encode(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

function normalizeParsed(parsed) {
	const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
	let ingredients = typeof parsed.ingredients === 'string' ? parsed.ingredients.trim() : '';
	let instructions = typeof parsed.instructions === 'string' ? parsed.instructions.trim() : '';
	ingredients = ingredients.replace(/\r\n/g, '\n');
	instructions = instructions.replace(/\r\n/g, '\n');
	return { title, ingredients, instructions };
}

/** Strip optional markdown fences and parse JSON from model output. */
function parseModelJson(text) {
	let s = String(text).trim();
	if (s.startsWith('```')) {
		s = s.replace(/^```(?:json)?\s*\r?\n?/, '').replace(/\r?\n?```[\s\S]*$/, '');
	}
	s = s.trim();
	return JSON.parse(s);
}

function candidateText(candidate) {
	const parts = candidate?.content?.parts;
	if (!Array.isArray(parts)) return '';
	let out = '';
	for (const p of parts) {
		if (typeof p?.text === 'string') out += p.text;
	}
	return out;
}

/** Google Gemini — free tier via https://aistudio.google.com/apikey */
async function parseWithGemini(apiKey, model, userText) {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-goog-api-key': apiKey
		},
		body: JSON.stringify({
			systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
			contents: [{ role: 'user', parts: [{ text: userText }] }],
			generationConfig: {
				temperature: 0.2,
				responseMimeType: 'application/json'
			}
		})
	});

	if (!res.ok) {
		const errText = await res.text();
		let detail = errText;
		try {
			const j = JSON.parse(errText);
			detail = j.error?.message ?? j.error?.status ?? errText;
		} catch {
			/* keep raw */
		}
		const status = res.status >= 500 ? 502 : 400;
		throw { status, message: detail || 'Gemini request failed.' };
	}

	const data = await res.json();

	if (data.promptFeedback?.blockReason) {
		throw {
			status: 422,
			message: `Prompt blocked (${data.promptFeedback.blockReason}). Try shorter or different text.`
		};
	}

	const candidate = data.candidates?.[0];
	if (!candidate) {
		throw {
			status: 502,
			message: 'No response from Gemini (empty candidates). Check GEMINI_MODEL or API quota.'
		};
	}

	const reason = candidate?.finishReason;
	if (reason && reason !== 'STOP' && reason !== 'MAX_TOKENS') {
		throw {
			status: 422,
			message:
				reason === 'SAFETY'
					? 'The model blocked this content (safety filter). Try trimming the paste or editing manually.'
					: `Generation stopped: ${reason}`
		};
	}

	const content = candidateText(candidate);
	if (!content) {
		throw { status: 502, message: 'Unexpected response from Gemini (no text in reply).' };
	}

	let parsed;
	try {
		parsed = parseModelJson(content);
	} catch {
		throw { status: 502, message: 'Could not parse model output as JSON. Try Format with AI again.' };
	}

	return normalizeParsed(parsed);
}

/** Ordered fallbacks when the preferred id is retired or unavailable for your API key. */
const GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

function uniqueModelOrder(preferred) {
	const primary = String(preferred ?? '').trim() || 'gemini-2.5-flash';
	const out = [];
	const seen = new Set();
	for (const m of [primary, ...GEMINI_MODEL_FALLBACKS]) {
		const id = m.trim();
		if (!id || seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
}

/** True when Google rejects the model id (404 / deprecated name), not quota or safety. */
function isModelIdRejected(message) {
	const m = String(message).toLowerCase();
	return (
		m.includes('not found') ||
		m.includes('not supported for generatecontent') ||
		m.includes('unknown model') ||
		m.includes('does not exist') ||
		m.includes('is not found for api version')
	);
}

async function parseWithGeminiFirstWorking(apiKey, preferredModel, userText) {
	const models = uniqueModelOrder(preferredModel);
	let lastErr = /** @type {{ status?: number; message?: string } | null} */ (null);

	for (let i = 0; i < models.length; i++) {
		const model = models[i];
		try {
			return await parseWithGemini(apiKey, model, userText);
		} catch (e) {
			lastErr = e && typeof e === 'object' ? e : { message: String(e) };
			const msg = 'message' in lastErr ? String(lastErr.message) : '';
			const isLast = i === models.length - 1;
			if (!isModelIdRejected(msg) || isLast) {
				throw e;
			}
			console.warn(`[parse-recipe] model "${model}" unavailable, retrying with next…`);
		}
	}

	throw lastErr ?? { status: 502, message: 'Gemini request failed.' };
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		let text = '';
		let admin_password = '';

		const ct = request.headers.get('content-type') ?? '';
		if (ct.includes('application/json')) {
			try {
				const body = await request.json();
				text = String(body?.text ?? '');
				admin_password = String(body?.admin_password ?? '').trim();
			} catch {
				return json({ message: 'Invalid JSON body.' }, { status: 400 });
			}
		} else {
			const fd = await request.formData();
			text = String(fd.get('text') ?? '');
			admin_password = String(fd.get('admin_password') ?? '').trim();
		}

		const expected = String(env.ADMIN_PASSWORD ?? '').trim();
		if (!expected) {
			return json({ message: 'Server misconfiguration: ADMIN_PASSWORD is not set.' }, { status: 500 });
		}

		if (!passwordMatches(admin_password, expected)) {
			return json({ message: 'Incorrect password.' }, { status: 401 });
		}

		const trimmed = text.trim();
		if (!trimmed) {
			return json({ message: 'No text to parse.' }, { status: 400 });
		}

		const geminiKey = String(env.GEMINI_API_KEY ?? '').trim();
		if (!geminiKey) {
			return json(
				{
					message:
						'Server misconfiguration: GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey'
				},
				{ status: 500 }
			);
		}

		// Default gemini-2.5-flash; 1.5-* ids are often retired. GEMINI_MODEL overrides; fallbacks run on “model not found”.
		const geminiModel = String(env.GEMINI_MODEL ?? '').trim();

		try {
			const result = await parseWithGeminiFirstWorking(geminiKey, geminiModel, trimmed);
			return json(result);
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e && 'message' in e) {
				console.error('[parse-recipe]', e.message);
				return json({ message: String(e.message) }, { status: Number(e.status) || 502 });
			}
			const msg = e instanceof Error ? e.message : 'Network error calling Gemini.';
			console.error('[parse-recipe]', e);
			return json({ message: msg }, { status: 502 });
		}
	} catch (e) {
		console.error('[parse-recipe] unhandled', e);
		const msg = e instanceof Error ? e.message : 'Unexpected server error.';
		return json({ message: msg }, { status: 500 });
	}
}
