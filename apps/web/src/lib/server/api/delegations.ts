import type { RequestEvent } from '@sveltejs/kit';
import type {
	CreateDelegationBody,
	DelegationDirectoryQuery,
	DelegationProposalOptionsQuery
} from '$lib/types/delegation';

export function getDelegations(event: RequestEvent, query: DelegationDirectoryQuery) {
	return event.locals.client.api.delegations.index({ query }).safe();
}

export function getDelegation(event: RequestEvent, id: string) {
	return event.locals.client.api.delegations.show({ params: { id } }).safe();
}

export function getDelegationProposalOptions(
	event: RequestEvent,
	query: DelegationProposalOptionsQuery
) {
	return event.locals.client.api.delegations.proposalOptions({ query }).safe();
}

export function createDelegation(event: RequestEvent, body: CreateDelegationBody) {
	return event.locals.client.api.delegations.store({ body }).safe();
}

export function acceptDelegation(event: RequestEvent, id: string, reason?: string) {
	return event.locals.client.api.delegations.accept({ params: { id }, body: { reason } }).safe();
}

export function rejectDelegation(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.delegations.reject({ params: { id }, body: { reason } }).safe();
}

export function revokeDelegation(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.delegations.revoke({ params: { id }, body: { reason } }).safe();
}

export function relinquishDelegation(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.delegations
		.relinquish({ params: { id }, body: { reason } })
		.safe();
}

export function terminateDelegation(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.delegations.terminate({ params: { id }, body: { reason } }).safe();
}
