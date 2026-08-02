import { createDelegationSchema } from '$lib/schemas/delegation';
import { delegationErrorMessage } from '$lib/helpers/delegation-presentation';
import { createDelegation, getDelegationProposalOptions } from '$lib/server/api/delegations';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { eatInputToIso } from '$lib/server/helpers/date-time';
import { optionalFilter, positivePage } from '$lib/server/helpers/list-filters';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formId = 'delegation-create';

export const load: PageServerLoad = async (event) => {
	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		search: optionalFilter(event.url.searchParams.get('search')),
		delegateAccountId: optionalFilter(event.url.searchParams.get('delegateAccountId'))
	};
	const [optionsResponse, optionsError] = await getDelegationProposalOptions(event, query);
	if (optionsError)
		error(optionsError.status ?? 502, 'Eligible temporary-coverage options could not be loaded.');
	if (query.delegateAccountId && !optionsResponse.data.selectedDelegate) {
		error(400, 'The selected recipient is no longer eligible for this temporary coverage.');
	}

	return {
		options: optionsResponse.data,
		filters: query,
		form: await superValidate(
			{
				delegateAccountId: optionsResponse.data.selectedDelegate?.accountId ?? '',
				assignmentIds: [],
				startMode: 'NOW' as const,
				startsAt: '',
				expiresAt: '',
				reason: ''
			},
			valibot(createDelegationSchema),
			{ id: formId }
		)
	};
};

export const actions: Actions = {
	create: async (event) => {
		const form = await superValidate(event, valibot(createDelegationSchema), { id: formId });
		if (!form.valid) return fail(400, { form });

		const body = {
			...form.data,
			startsAt: form.data.startMode === 'SCHEDULED' ? eatInputToIso(form.data.startsAt) : undefined,
			expiresAt: eatInputToIso(form.data.expiresAt)
		};
		const [response, apiError] = await createDelegation(event, body);
		if (apiError) {
			const fallback = 'The temporary coverage could not be proposed.';
			const details = apiErrorDetails(apiError, fallback);
			setFlash(
				{ type: 'error', message: delegationErrorMessage(details.message, fallback) },
				event.cookies
			);
			return fail(apiError.status ?? 400, { form });
		}

		redirect(
			303,
			'/delegations?relationship=PROPOSED_BY_ME',
			{ type: 'success', message: response.message },
			event.cookies
		);
	}
};
