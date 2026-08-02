const eatOffset = '+03:00';
const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

export function eatInputToIso(value: string) {
	if (!localDateTime.test(value)) return value;
	const withSeconds = value.length === 16 ? `${value}:00` : value;
	return `${withSeconds}${eatOffset}`;
}

export function optionalEatInputToIso(value: string) {
	return value ? eatInputToIso(value) : null;
}

export function apiDateToEatInput(value: unknown) {
	if (!value) return '';
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return '';
	const eatTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
	return eatTime.toISOString().slice(0, 16);
}
