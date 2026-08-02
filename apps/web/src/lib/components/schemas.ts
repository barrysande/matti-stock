import { number, object, string, type InferOutput } from 'valibot';

export const schema = object({
	id: number(),
	header: string(),
	type: string(),
	status: string(),
	target: string(),
	limit: string(),
	reviewer: string()
});

export type Schema = InferOutput<typeof schema>;
