import { reasonSchema } from '$lib/schemas/account';
import { requireRoot } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { fail, type RequestEvent } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

interface AccountActionError {
	status?: number;
	response?: unknown;
}

type AccountActionResult = [{ message: string }, null] | [null, AccountActionError];

export async function performAccountAction(
	event: RequestEvent,
	request: (reason: string) => Promise<unknown>,
	fallback: string
) {
	requireRoot(event);

	const form = await superValidate(event, valibot(reasonSchema), { id: 'account-action' });
	if (!form.valid) {
		return fail(400, { form });
	}

	const result = await request(form.data.reason);
	const [response, apiError] = result as AccountActionResult;

	if (apiError) {
		const details = apiErrorDetails(apiError, fallback);

		setFlash({ type: 'error', message: details.message }, event.cookies);

		return fail(apiError.status ?? 400, { form });
	}

	redirect(
		303,
		`/accounts/${event.params.id}`,
		{ type: 'success', message: response.message },
		event.cookies
	);
}
