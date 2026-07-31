import * as v from 'valibot';
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
	unitType: v.picklist(creatableOrganizationalUnitTypes, 'Select a unit type.'),
	parentId: uuid,
	reason
};

export const createOrganizationalUnitFormSchema = v.object({
	...createOrganizationalUnitFields,
	impactFingerprint: v.union([fingerprint, v.literal('')])
});

export const createOrganizationalUnitSchema = v.object({
	...createOrganizationalUnitFields,
	impactFingerprint: fingerprint
});

export const renameOrganizationalUnitSchema = v.object({
	name: requiredText('Name'),
	reason
});

export const reparentOrganizationalUnitSchema = v.object({
	parentId: uuid,
	reason,
	impactFingerprint: fingerprint
});

export const reparentOrganizationalUnitFormSchema = v.object({
	parentId: uuid,
	reason,
	impactFingerprint: v.union([fingerprint, v.literal('')])
});

export const administerOrganizationalUnitSchema = v.object({
	reason,
	impactFingerprint: fingerprint
});

export const administerOrganizationalUnitFormSchema = v.object({
	reason,
	impactFingerprint: v.union([fingerprint, v.literal('')])
});
