import { env } from '$env/dynamic/private';
import { createTuyau } from '@tuyau/core/client';
import { registry } from 'api/registry';
import { parse as parseSetCookie } from 'set-cookie-parser';
import type { Cookies, RequestEvent } from '@sveltejs/kit';

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Creates one server-only API client for the lifetime of a SvelteKit request.
 * The client carries the browser's cookies to AdonisJS and propagates response
 * cookies back through SvelteKit.
 */
export function createApiClient(event: RequestEvent) {
	return createTuyau({
		baseUrl: getApiBaseUrl(),
		registry,
		headers: { Accept: 'application/json' },
		hooks: {
			beforeRequest: [
				(request) => {
					const cookieHeader = buildCookieHeader(event);
					if (cookieHeader) {
						request.headers.set('cookie', cookieHeader);
					}
				}
			],
			afterResponse: [
				(_request, _options, response) => {
					propagateResponseCookies(response.headers, event.cookies);
				}
			]
		}
	});
}

function getApiBaseUrl() {
	const apiBaseUrl = env.PRIVATE_API_URL;
	if (!apiBaseUrl) {
		throw new Error('PRIVATE_API_URL must be configured for the SvelteKit server');
	}

	return apiBaseUrl;
}

function buildCookieHeader(event: RequestEvent) {
	const cookies = event.cookies.getAll();
	if (cookies.length === 0) {
		return null;
	}

	return cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
}

function propagateResponseCookies(headers: Headers, cookies: Cookies) {
	const responseCookies = parseSetCookie(headers.getSetCookie(), { decodeValues: true });
	const inferredDomain = responseCookies.find(({ domain }) => domain)?.domain;

	for (const cookie of responseCookies) {
		const options = {
			path: cookie.path || '/',
			domain: cookie.domain || inferredDomain
		};

		if (!cookie.value || (cookie.maxAge !== undefined && cookie.maxAge <= 0)) {
			cookies.delete(cookie.name, options);
			continue;
		}

		cookies.set(cookie.name, cookie.value, {
			...options,
			maxAge: cookie.maxAge,
			expires: cookie.expires,
			httpOnly: cookie.httpOnly ?? true,
			secure: cookie.secure,
			sameSite: (cookie.sameSite?.toLowerCase() as 'lax' | 'strict' | 'none') || 'lax'
		});
	}
}
