type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
type AccountSetupStatus = 'PENDING' | 'COMPLETE';
type AccountAccessEventCategory =
	'ACCOUNT' | 'AUTHENTICATION' | 'CREDENTIAL' | 'ROLE_ASSIGNMENT' | 'DELEGATION';

export interface AccountDirectoryQuery {
	page?: number;
	search?: string;
	status?: AccountStatus;
	setupStatus?: AccountSetupStatus;
}

export interface AccountAccessEventQuery {
	page?: number;
	category?: AccountAccessEventCategory;
	eventType?: string;
}

export interface CreateAccountBody {
	displayName: string;
	staffNumber: string | null;
	email: string;
	reason: string;
}
