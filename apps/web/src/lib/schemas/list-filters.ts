export function positivePage(value: string | null) {
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

export function optionalFilter(value: string | null) {
	const normalized = value?.trim();
	return normalized ? normalized : undefined;
}

export function booleanFilter(value: string | null) {
	return value === 'true' ? true : undefined;
}

