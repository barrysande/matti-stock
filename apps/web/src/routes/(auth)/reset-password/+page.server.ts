import { resetPasswordSchema } from '$lib/schemas/auth';
import { resetPassword } from '$lib/server/api/session';
import { requireGuest } from '$lib/server/auth/guards';
import { fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireGuest(event);

	return {
		form: await superValidate(
			{ token: event.url.searchParams.get('token') ?? '' },
			valibot(resetPasswordSchema)
		)
	};
};

export const actions: Actions = {
	default: async (event) => {
		requireGuest(event);

		const form = await superValidate(event, valibot(resetPasswordSchema));
		if (!form.valid) return fail(400, { form });

		const [response, error] = await resetPassword(event, {
			token: form.data.token,
			password: form.data.password
		});
		if (error) {
			setFlash(
				{ type: 'error', message: 'This password reset link is invalid or has expired.' },
				event.cookies
			);
			return fail(error.status ?? 422, { form });
		}

		redirect(303, '/login', { type: 'success', message: response.message }, event.cookies);
	}
};
