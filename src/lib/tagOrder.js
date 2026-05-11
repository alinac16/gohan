/** Normalize for stable matching (case, unicode dashes). */
export function normalizeTagName(name) {
	return String(name ?? '')
		.trim()
		.toLowerCase()
		.replace(/\u2013|\u2014/g, '-');
}

/** Complexity chips: Easy → Medium → Hard */
export const COMPLEXITY_ORDER = ['Easy', 'Medium', 'Hard'];

/** Time chips: duration order, then Overnight last */
export const TIME_ORDER = ['Under 30 min', '30–60 min', 'Over 1 hour', 'Overnight'];

function buildRankMap(orderList) {
	/** @type {Map<string, number>} */
	const m = new Map();
	orderList.forEach((label, i) => {
		m.set(normalizeTagName(label), i);
	});
	return m;
}

const complexityRankMap = buildRankMap(COMPLEXITY_ORDER);
const timeRankMap = buildRankMap(TIME_ORDER);

/**
 * Sort key within category (lower = earlier). Unknown tags sort after known ones (1000), then by name.
 * @param {{ name: string }} tag
 * @param {string} category
 */
function tagSortKey(tag, category) {
	const n = normalizeTagName(tag.name);
	if (category === 'complexity') {
		if (complexityRankMap.has(n)) return /** @type {number} */ (complexityRankMap.get(n));
		return 1000;
	}
	if (category === 'time') {
		if (timeRankMap.has(n)) return /** @type {number} */ (timeRankMap.get(n));
		return 1000;
	}
	return 1000;
}

/**
 * @param {{ name: string }} tagA
 * @param {{ name: string }} tagB
 * @param {string} category
 */
export function compareTagsInCategory(tagA, tagB, category) {
	const ka = tagSortKey(tagA, category);
	const kb = tagSortKey(tagB, category);
	if (ka !== kb) return ka - kb;
	return tagA.name.localeCompare(tagB.name, undefined, { sensitivity: 'base' });
}

/**
 * @param {Array<{ name: string }>} tags
 * @param {string} category
 */
export function sortTagsForCategory(tags, category) {
	return [...tags].sort((a, b) => compareTagsInCategory(a, b, category));
}
