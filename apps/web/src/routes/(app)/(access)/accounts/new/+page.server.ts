import { createAccountSchema } from '$lib/schemas/account';
import { createAccount } from '$lib/server/api/accounts';
import { requireRoot } from '$lib/server/auth/guards';
import { fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	return { form: await superValidate(valibot(createAccountSchema)) };
};

export const actions: Actions = {
	default: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(createAccountSchema));
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await createAccount(event, {
			...form.data,
			staffNumber: form.data.staffNumber || null
		});
		if (apiError) {
			setFlash({ type: 'error', message: 'The account could not be created.' }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirect(303, '/accounts', { type: 'success', message: response.message }, event.cookies);
	}
};
