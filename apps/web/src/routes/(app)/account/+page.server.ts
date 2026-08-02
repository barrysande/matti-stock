import { changePasswordSchema } from '$lib/schemas/auth';
import { changePassword } from '$lib/server/api/session';
import { requireAuth } from '$lib/server/auth/guards';
import { fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const account = requireAuth(event);

	return {
		account,
		form: await superValidate(valibot(changePasswordSchema))
	};
};

export const actions: Actions = {
	changePassword: async (event) => {
		requireAuth(event);

		const form = await superValidate(event, valibot(changePasswordSchema));
		if (!form.valid) return fail(400, { form });

		const [response, error] = await changePassword(event, {
			currentPassword: form.data.currentPassword,
			password: form.data.password
		});
		if (error) {
			setFlash({ type: 'error', message: 'The current password is incorrect.' }, event.cookies);
			return fail(error.status ?? 400, { form });
		}

		redirect(303, '/login', { type: 'success', message: response.message }, event.cookies);
	}
};
