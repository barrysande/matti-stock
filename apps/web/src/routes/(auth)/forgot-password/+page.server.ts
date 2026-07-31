import { forgotPasswordSchema } from '$lib/schemas/auth';
import { forgotPassword } from '$lib/server/api/session';
import { requireGuest } from '$lib/server/auth/guards';
import { fail } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireGuest(event);
	return { form: await superValidate(valibot(forgotPasswordSchema)) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, valibot(forgotPasswordSchema));
		if (!form.valid) return fail(400, { form });

		const [response, error] = await forgotPassword(event, form.data);
		if (error) {
			setFlash(
				{ type: 'error', message: 'The reset request could not be completed.' },
				event.cookies
			);
			return fail(error.status ?? 400, { form });
		}

		setFlash({ type: 'success', message: response.message }, event.cookies);
		return { form };
	}
};
