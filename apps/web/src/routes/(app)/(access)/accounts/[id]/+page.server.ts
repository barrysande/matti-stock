import { reasonSchema } from '$lib/schemas/account';
import {
	deactivateAccount,
	getAccount,
	reactivateAccount,
	requestAccountPasswordReset,
	restoreAccount,
	suspendAccount
} from '$lib/server/api/accounts';
import { requireRoot } from '$lib/server/auth/guards';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const [response, apiError] = await getAccount(event, event.params.id);
	if (apiError) error(apiError.status ?? 404, 'The account could not be found.');

	return {
		account: response.data,
		reasonForm: await superValidate(valibot(reasonSchema), { id: 'account-action' })
	};
};

async function action(
	event: RequestEvent,
	request: (reason: string) => Promise<unknown>,
	fallback: string
) {
	requireRoot(event);

	const form = await superValidate(event, valibot(reasonSchema), { id: 'account-action' });
	if (!form.valid) return fail(400, { form });

	const [response, apiError] = (await request(form.data.reason)) as [
		{ message: string } | null,
		{ status?: number } | null
	];
	if (apiError) {
		setFlash({ type: 'error', message: fallback }, event.cookies);
		return fail(apiError.status ?? 400, { form });
	}

	redirect(
		303,
		`/accounts/${event.params.id}`,
		{ type: 'success', message: response!.message },
		event.cookies
	);
}

export const actions: Actions = {
	resetPassword: (event) =>
		action(
			event,
			(reason) => requestAccountPasswordReset(event, event.params.id, reason),
			'Credential recovery could not be requested.'
		),

	suspend: (event) =>
		action(
			event,
			(reason) => suspendAccount(event, event.params.id, reason),
			'The account could not be suspended.'
		),

	restore: (event) =>
		action(
			event,
			(reason) => restoreAccount(event, event.params.id, reason),
			'The account could not be restored.'
		),

	deactivate: (event) =>
		action(
			event,
			(reason) => deactivateAccount(event, event.params.id, reason),
			'The account could not be deactivated.'
		),

	reactivate: (event) =>
		action(
			event,
			(reason) => reactivateAccount(event, event.params.id, reason),
			'The account could not be reactivated.'
		)
};
