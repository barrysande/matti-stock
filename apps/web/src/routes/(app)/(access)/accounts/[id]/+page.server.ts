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
import { performAccountAction } from '$lib/server/helpers/account-route';
import { error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const [response, apiError] = await getAccount(event, event.params.id);
	if (apiError) error(apiError.status ?? 404, 'The account could not be found.');

	return {
		account: response.data,
		reasonForm: await superValidate(valibot(reasonSchema), { id: 'account-action' })
	};
};

export const actions: Actions = {
	resetPassword: (event) =>
		performAccountAction(
			event,
			(reason) => requestAccountPasswordReset(event, event.params.id, reason),
			'Credential recovery could not be requested.'
		),

	suspend: (event) =>
		performAccountAction(
			event,
			(reason) => suspendAccount(event, event.params.id, reason),
			'The account could not be suspended.'
		),

	restore: (event) =>
		performAccountAction(
			event,
			(reason) => restoreAccount(event, event.params.id, reason),
			'The account could not be restored.'
		),

	deactivate: (event) =>
		performAccountAction(
			event,
			(reason) => deactivateAccount(event, event.params.id, reason),
			'The account could not be deactivated.'
		),

	reactivate: (event) =>
		performAccountAction(
			event,
			(reason) => reactivateAccount(event, event.params.id, reason),
			'The account could not be reactivated.'
		)
};
