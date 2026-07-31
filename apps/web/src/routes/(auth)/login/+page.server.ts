import { loginSchema } from '$lib/schemas/auth';
import { login } from '$lib/server/api/session';
import { requireGuest, safeRedirectUrl } from '$lib/server/auth/guards';
import { fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireGuest(event);
	return { form: await superValidate(valibot(loginSchema)) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, valibot(loginSchema));
		if (!form.valid) return fail(400, { form });

		const [response, error] = await login(event, form.data);

		if (error) {
			setFlash({ type: 'error', message: 'Invalid email or password.' }, event.cookies);
			return fail(error.status ?? 400, { form });
		}

		redirect(
			303,
			safeRedirectUrl(event.url.searchParams.get('redirectTo')),
			{ type: 'success', message: response.message },
			event.cookies
		);
	}
};
