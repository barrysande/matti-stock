import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function apiErrorDetails(apiError: { response?: unknown }, fallback: string) {
	const response = apiError.response;
	if (typeof response !== 'object' || response === null) {
		return { code: undefined, message: fallback };
	}

	return {
		code: 'code' in response && typeof response.code === 'string' ? response.code : undefined,
		message:
			'message' in response && typeof response.message === 'string' ? response.message : fallback
	};
}
