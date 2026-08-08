export interface RoleDirectoryQuery {
	page?: number;
	search?: string;
	includeArchived?: boolean;
	systemManaged?: boolean;
}

export type RoleOptionsQuery = Omit<RoleDirectoryQuery, 'page'>;

export interface CreateRoleBody {
	name: string;
	permissionKeys: string[];
	reason: string;
}

export interface RenameRoleBody {
	name: string;
	reason: string;
}

export interface ReplaceRolePermissionsBody {
	permissionKeys: string[];
	reason: string;
}
