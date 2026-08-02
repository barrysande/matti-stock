import { delegationReasonSchema, optionalReasonSchema } from '$lib/schemas/delegation';
import { delegationErrorMessage } from '$lib/helpers/delegation-presentation';
import {
	acceptDelegation,
	getDelegation,
	rejectDelegation,
	relinquishDelegation,
	revokeDelegation,
	terminateDelegation
} from '$lib/server/api/delegations';
import { requireAuth } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const formIds = {
	accept: 'delegation-accept',
	reject: 'delegation-reject',
	revoke: 'delegation-revoke',
	relinquish: 'delegation-relinquish',
	terminate: 'delegation-terminate'
} as const;

function redirectToDelegation(event: RequestEvent, message: string) {
	redirect(303, `/delegations/${event.params.id}`, { type: 'success', message }, event.cookies);
}

function mutationFailure<T>(
	event: RequestEvent,
	apiError: { status?: number; response?: unknown },
	form: T,
	fallback: string
) {
	const details = apiErrorDetails(apiError, fallback);
	setFlash(
		{ type: 'error', message: delegationErrorMessage(details.message, fallback) },
		event.cookies
	);
	return fail(apiError.status ?? 400, { form });
}

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const [delegationResponse, delegationError] = await getDelegation(event, event.params.id);
	if (delegationError)
		error(delegationError.status ?? 404, 'The temporary coverage record could not be found.');

	return {
		delegation: delegationResponse.data,
		acceptForm: await superValidate({ reason: '' }, valibot(optionalReasonSchema), {
			id: formIds.accept
		}),
		rejectForm: await superValidate({ reason: '' }, valibot(delegationReasonSchema), {
			id: formIds.reject
		}),
		revokeForm: await superValidate({ reason: '' }, valibot(delegationReasonSchema), {
			id: formIds.revoke
		}),
		relinquishForm: await superValidate({ reason: '' }, valibot(delegationReasonSchema), {
			id: formIds.relinquish
		}),
		terminateForm: await superValidate({ reason: '' }, valibot(delegationReasonSchema), {
			id: formIds.terminate
		})
	};
};

export const actions: Actions = {
	accept: async (event) => {
		requireAuth(event);

		const form = await superValidate(event, valibot(optionalReasonSchema), {
			id: formIds.accept
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await acceptDelegation(
			event,
			event.params.id,
			form.data.reason || undefined
		);
		if (apiError)
			return mutationFailure(event, apiError, form, 'The proposal could not be accepted.');

		redirectToDelegation(event, response.message);
	},

	reject: async (event) => {
		requireAuth(event);

		const form = await superValidate(event, valibot(delegationReasonSchema), {
			id: formIds.reject
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await rejectDelegation(event, event.params.id, form.data.reason);
		if (apiError)
			return mutationFailure(event, apiError, form, 'The proposal could not be declined.');

		redirectToDelegation(event, response.message);
	},

	revoke: async (event) => {
		requireAuth(event);

		const form = await superValidate(event, valibot(delegationReasonSchema), {
			id: formIds.revoke
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await revokeDelegation(event, event.params.id, form.data.reason);
		if (apiError)
			return mutationFailure(event, apiError, form, 'The temporary coverage could not be ended.');

		redirectToDelegation(event, response.message);
	},

	relinquish: async (event) => {
		requireAuth(event);

		const form = await superValidate(event, valibot(delegationReasonSchema), {
			id: formIds.relinquish
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await relinquishDelegation(
			event,
			event.params.id,
			form.data.reason
		);
		if (apiError)
			return mutationFailure(
				event,
				apiError,
				form,
				'The temporary responsibility could not be relinquished.'
			);

		redirectToDelegation(event, response.message);
	},

	terminate: async (event) => {
		requireAuth(event);

		const form = await superValidate(event, valibot(delegationReasonSchema), {
			id: formIds.terminate
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await terminateDelegation(
			event,
			event.params.id,
			form.data.reason
		);
		if (apiError)
			return mutationFailure(
				event,
				apiError,
				form,
				'The administrative termination could not be completed.'
			);

		redirectToDelegation(event, response.message);
	}
};
