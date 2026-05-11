/**
 * Display-only scaling of numeric quantities with common recipe units.
 *
 * MVP limits:
 * - Only scales amounts immediately followed by a known unit word (see UNIT_PATTERN).
 * - Requires whitespace between the number and the unit (e.g. "2 cups", not "2cups").
 * - Does not scale ranges ("1–2 cups") as a single expression; may scale each side if both match.
 * - Does not scale temperatures (°F / °C) or bare times ("5 minutes") — no time units in the list.
 * - Very short unit "g" is matched as a word to reduce false positives (still avoid ambiguous prose).
 *
 * @param {string} text
 * @param {number} multiplier
 * @returns {string}
 */
export function scaleRecipeText(text, multiplier) {
	if (text == null || typeof text !== 'string') return text;
	if (multiplier === 1 || !Number.isFinite(multiplier) || multiplier <= 0) return text;

	let out = text;

	// Longest / most specific unit spellings first inside alternation
	const UNIT_PATTERN =
		'(?:tablespoons?|teaspoons?|milliliters?|millilitres?|kilograms?|grams?|pinches?|ounces?|pounds?|cloves?|cups?|tbsp\\.?|tsp\\.?|oz\\.?|lbs?\\.?|lb\\.?|ml|kg|[Ll](?:iters?|itres?)|pinch|clove)\\b';

	// 1. Mixed fractions: "1 1/2 cups"
	const mixedRe = new RegExp(
		`(\\d+)\\s+(\\d+)\\s*/\\s*(\\d+)\\s+(${UNIT_PATTERN})`,
		'gi'
	);
	out = out.replace(mixedRe, (full, whole, num, den, unit) => {
		const w = parseInt(whole, 10);
		const n = parseInt(num, 10);
		const d = parseInt(den, 10);
		if (!d) return full;
		const v = (w + n / d) * multiplier;
		return `${formatQuantity(v)} ${unit}`;
	});

	// 2. Simple fractions: "1/2 tsp"
	const fracRe = new RegExp(`(\\d+)\\s*/\\s*(\\d+)\\s+(${UNIT_PATTERN})`, 'gi');
	out = out.replace(fracRe, (full, num, den, unit) => {
		const n = parseInt(num, 10);
		const d = parseInt(den, 10);
		if (!d) return full;
		const v = (n / d) * multiplier;
		return `${formatQuantity(v)} ${unit}`;
	});

	// 3. Decimals and integers: "2.5 ml", "400 g"
	const decRe = new RegExp(`(\\d+(?:\\.\\d+)?)\\s+(${UNIT_PATTERN})`, 'gi');
	out = out.replace(decRe, (full, numStr, unit) => {
		const v = parseFloat(numStr) * multiplier;
		return `${formatQuantity(v)} ${unit}`;
	});

	return out;
}

/**
 * @param {number} n
 */
function formatQuantity(n) {
	if (!Number.isFinite(n)) return String(n);
	const x = Math.round(n * 10000) / 10000;
	if (Math.abs(x) < 1e-10) return '0';
	if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
	let s = x.toFixed(4).replace(/\.?0+$/, '');
	return s;
}
