import * as v from 'valibot';
import { fingerprint, reason, requiredText, uuid } from './common';

export const organizationalUnitTypes = [
	'INSTITUTE',
	'DEPARTMENT',
	'SUB_DEPARTMENT'
] as const;
export const creatableOrganizationalUnitTypes = ['DEPARTMENT', 'SUB_DEPARTMENT'] as const;

export const createOrganizationalUnitSchema = v.object({
	name: requiredText('Name'),
	unitType: v.picklist(creatableOrganizationalUnitTypes, 'Select a unit type.'),
	parentId: uuid,
	reason,
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

export const administerOrganizationalUnitSchema = v.object({
	reason,
	impactFingerprint: fingerprint
});

