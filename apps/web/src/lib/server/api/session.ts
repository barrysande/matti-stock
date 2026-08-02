import type { RequestEvent } from '@sveltejs/kit';

export function login(event: RequestEvent, body: { email: string; password: string }) {
	return event.locals.client.api.sessions.login({ body }).safe();
}

export function logout(event: RequestEvent) {
	return event.locals.client.api.sessions.logout({}).safe();
}

export function forgotPassword(event: RequestEvent, body: { email: string }) {
	return event.locals.client.api.passwordResets.request({ body }).safe();
}

export function resetPassword(event: RequestEvent, body: { token: string; password: string }) {
	return event.locals.client.api.passwordResets.reset({ body }).safe();
}

export function setPassword(event: RequestEvent, body: { token: string; password: string }) {
	return event.locals.client.api.passwordSetups.store({ body }).safe();
}

export function changePassword(
	event: RequestEvent,
	body: { currentPassword: string; password: string }
) {
	return event.locals.client.api.sessions.changePassword({ body }).safe();
}

export async function getCurrentAccount(event: RequestEvent) {
	if (!event.cookies.get('adonis-session')) {
		return null;
	}

	const [response, error] = await event.locals.client.api.sessions.me({}).safe();
	return error ? null : response.data;
}
