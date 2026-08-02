import type { Data } from 'api/data';

export type DelegationStatus =
	| 'PENDING'
	| 'UPCOMING'
	| 'ACTIVE'
	| 'REJECTED'
	| 'EXPIRED'
	| 'REVOKED'
	| 'RELINQUISHED'
	| 'ADMINISTRATIVELY_TERMINATED';

export type DelegationRelationship = 'PROPOSED_BY_ME' | 'RECEIVED_BY_ME';

export interface DelegationDirectoryQuery {
	page?: number;
	accountId?: string;
	direction?: 'INCOMING' | 'OUTGOING';
	status?: DelegationStatus;
}

export interface DelegationProposalOptionsQuery {
	page?: number;
	search?: string;
	delegateAccountId?: string;
}

export interface CreateDelegationBody {
	delegateAccountId: string;
	assignmentIds: string[];
	startMode: 'NOW' | 'SCHEDULED';
	startsAt?: string;
	expiresAt: string;
	reason: string;
}

export interface DelegationAssignmentPresentation {
	id: string;
	role: { name: string; permissionKeys?: string[] };
	scope: { name: string; path?: string; mode: string };
	startsAt?: unknown;
	expiresAt?: unknown;
	sourceStatus?: string;
	effectiveNow?: boolean;
	source?: {
		role: { permissionKeys: string[] };
		scope: { path: string };
		startsAt: unknown;
		expiresAt: unknown;
	};
}

export type DelegationSummary = Data.Delegation;
export type DelegationProposalOptions = Data.DelegationProposalOptions;
