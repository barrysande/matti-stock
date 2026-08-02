export interface RoleDirectoryQuery {
	search?: string;
	includeArchived?: boolean;
	systemManaged?: boolean;
}

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
