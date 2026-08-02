import { logout } from '$lib/server/api/session';
import { redirect } from 'sveltekit-flash-message/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const [response, error] = await logout(event);
	if (error) {
		redirect(
			303,
			'/',
			{ type: 'error', message: 'The session could not be closed. Please try again.' },
			event.cookies
		);
	}

	redirect(303, '/login', { type: 'success', message: response.message }, event.cookies);
};
