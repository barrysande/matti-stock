import type { RequestEvent } from '@sveltejs/kit';
import type {
	AccountDirectoryQuery,
	AccountAccessEventQuery,
	CreateAccountBody
} from '$lib/types/accounts';

export function getAccounts(event: RequestEvent, query: AccountDirectoryQuery) {
	return event.locals.client.api.accounts.index({ query }).safe();
}

export function getAccount(event: RequestEvent, id: string) {
	return event.locals.client.api.accounts.show({ params: { id } }).safe();
}

export function getAccountAccessEvents(
	event: RequestEvent,
	id: string,
	query: AccountAccessEventQuery
) {
	return event.locals.client.api.accountAccessEvents.index({ params: { id }, query }).safe();
}

export function createAccount(event: RequestEvent, body: CreateAccountBody) {
	return event.locals.client.api.accounts.store({ body }).safe();
}

export function requestAccountPasswordReset(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.accounts
		.resetPassword({ params: { id }, body: { reason } })
		.safe();
}

export function suspendAccount(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.accounts.suspend({ params: { id }, body: { reason } }).safe();
}

export function restoreAccount(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.accounts.restore({ params: { id }, body: { reason } }).safe();
}

export function deactivateAccount(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.accounts.deactivate({ params: { id }, body: { reason } }).safe();
}

export function reactivateAccount(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.accounts.reactivate({ params: { id }, body: { reason } }).safe();
}
