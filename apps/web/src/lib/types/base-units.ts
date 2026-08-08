import type { Data } from 'api/data';

export type BaseUnit = Data.BaseUnit;
export type BaseUnitDetail = Data.BaseUnit.Variants['forDetailedView'];
export type BaseUnitVersion = Data.BaseUnitVersion;
export type BaseUnitKind = 'COUNTABLE' | 'MEASURED';

export interface BaseUnitDirectoryQuery {
	page?: number;
	search?: string;
	includeArchived?: boolean;
	kind?: BaseUnitKind;
}

export type BaseUnitOptionsQuery = Omit<BaseUnitDirectoryQuery, 'page'>;

export interface BaseUnitDetailsBody {
	name: string;
	symbol: string;
	kind: BaseUnitKind;
	precision: number;
	reason: string;
}
