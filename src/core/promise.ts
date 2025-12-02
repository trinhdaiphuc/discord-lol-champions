/**
 * Helper function to handle promise execution and error capturing
 * Returns tuple with [result, error]
 */
export async function toAwait<T>(promise: Promise<T>): Promise<[T, null] | [null, Error]> {
	try {
		const result = await promise;
		return [result, null];
	} catch (error) {
		return [null, error as Error];
	}
}

/**
 * Enhanced version of toAwait that includes context information
 */
export async function toAwaitWithContext<T>(
	promise: Promise<T>,
	context: string
): Promise<[T, null] | [null, Error]> {
	try {
		const result = await promise;
		return [result, null];
	} catch (error) {
		const err = error as Error;
		const enhancedError = new Error(`${context}: ${err.message}`);
		(enhancedError as Error & { originalError: Error }).originalError = err;
		return [null, enhancedError];
	}
}

export default toAwait;

