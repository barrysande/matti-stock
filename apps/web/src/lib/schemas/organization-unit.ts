import { literal, object, picklist, union } from 'valibot';
import { fingerprint, reason, requiredText, uuid } from './common';

export const organizationalUnitTypes = ['INSTITUTE', 'DEPARTMENT', 'SUB_DEPARTMENT'] as const;
export const creatableOrganizationalUnitTypes = ['DEPARTMENT', 'SUB_DEPARTMENT'] as const;

export type OrganizationalAccessImpact = {
	operation: 'CREATE_CHILD' | 'REPARENT' | 'ARCHIVE' | 'RESTORE';
	fingerprint: string;
	assignments: Array<{
		id: string;
		account: { id: string; displayName: string; status: string };
		role: { id: string; key: string; name: string; version: number };
		scope: { organizationalUnitId: string; name: string; mode: string };
		startsAt: unknown;
		expiresAt: unknown;
	}>;
};

const createOrganizationalUnitFields = {
	name: requiredText('Name'),
	unitType: picklist(creatableOrganizationalUnitTypes, 'Select a unit type.'),
	parentId: uuid,
	reason
};

export const createOrganizationalUnitFormSchema = object({
	...createOrganizationalUnitFields,
	impactFingerprint: union([fingerprint, literal('')])
});

export const createOrganizationalUnitSchema = object({
	...createOrganizationalUnitFields,
	impactFingerprint: fingerprint
});

export const renameOrganizationalUnitSchema = object({
	name: requiredText('Name'),
	reason
});

export const reparentOrganizationalUnitSchema = object({
	parentId: uuid,
	reason,
	impactFingerprint: fingerprint
});

export const reparentOrganizationalUnitFormSchema = object({
	parentId: uuid,
	reason,
	impactFingerprint: union([fingerprint, literal('')])
});

export const administerOrganizationalUnitSchema = object({
	reason,
	impactFingerprint: fingerprint
});

export const administerOrganizationalUnitFormSchema = object({
	reason,
	impactFingerprint: union([fingerprint, literal('')])
});
