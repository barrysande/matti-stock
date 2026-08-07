import { reasonSchema } from '$lib/schemas/account';
import { requireRoot } from '$lib/server/auth/guards';
import { fail, type RequestEvent } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';

export async function performAccountAction(
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
