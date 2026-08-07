import { forward, object, partialCheck, picklist, pipe } from 'valibot';
import { reason, requiredText } from './common';

export const baseUnitKinds = ['COUNTABLE', 'MEASURED'] as const;
export const baseUnitPrecisions = ['0', '1', '2', '3'] as const;

export const baseUnitDetailsSchema = pipe(
	object({
		name: requiredText('Name'),
		symbol: requiredText('Symbol', 32),
		kind: picklist(baseUnitKinds, 'Select whether this unit is countable or measured.'),
		precision: picklist(baseUnitPrecisions, 'Select the allowed decimal places.'),
		reason
	}),
	forward(
		partialCheck(
			[['kind'], ['precision']],
			({ kind, precision }) =>
				(kind === 'COUNTABLE' && precision === '0') || (kind === 'MEASURED' && precision !== '0'),
			'Countable units use no decimals; measured units use one to three decimal places.'
		),
		['precision']
	)
);

export const administerBaseUnitSchema = object({ reason });
