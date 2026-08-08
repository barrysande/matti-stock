import type { Data } from 'api/data';

export type PhysicalLocationVersion = Data.PhysicalLocationVersion;

export interface PhysicalLocationDirectoryQuery {
	search?: string;
	includeArchived?: boolean;
}

export interface CreatePhysicalLocationBody {
	name: string;
	parentId?: string;
	reason: string;
}

export interface RenamePhysicalLocationBody {
	name: string;
	reason: string;
}

export interface ReparentPhysicalLocationBody {
	parentId: string | null;
	reason: string;
}
