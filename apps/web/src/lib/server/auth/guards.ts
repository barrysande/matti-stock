import { redirect, type RequestEvent } from '@sveltejs/kit';

export function requireAuth(event: RequestEvent) {
	if (!event.locals.account) {
		const returnUrl = `${event.url.pathname}${event.url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(returnUrl)}`);
	}

	return event.locals.account;
}

export function requireGuest(event: RequestEvent) {
	if (event.locals.account) {
		redirect(303, '/');
	}
}

export function requireRoot(event: RequestEvent) {
	const account = requireAuth(event);

	if (!account.effectivePermissionKeys.includes('access.root')) {
		redirect(303, '/');
	}

	return account;
}

export function safeRedirectUrl(value: string | null, fallback = '/') {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return fallback;
	}

	return value;
}
