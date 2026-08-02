export function apiErrorDetails(apiError: { response?: unknown }, fallback: string) {
	const response = apiError.response;
	if (typeof response !== 'object' || response === null) {
		return { code: undefined, message: fallback };
	}

	return {
		code: 'code' in response && typeof response.code === 'string' ? response.code : undefined,
		message:
			'message' in response && typeof response.message === 'string' ? response.message : fallback
	};
}
