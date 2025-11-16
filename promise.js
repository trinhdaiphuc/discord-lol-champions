/**
 * Helper function to handle promise execution and error capturing
 * Returns array with [result, error]
 *
 * @param {Promise} promise - Promise to await
 * @returns {Array} - [result, error]
 */
const toAwait = async (promise) => {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    // Capture stack trace at the point of error
    if (!error.stack) {
      Error.captureStackTrace(error);
    }
    return [null, error];
  }
};

/**
 * Enhanced version of toAwait that includes context information
 *
 * @param {Promise} promise - Promise to await
 * @param {String} context - Context description for better error tracing
 * @returns {Array} - [result, error]
 */
const toAwaitWithContext = async (promise, context) => {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    // Add context to the error
    const enhancedError = new Error(`${context}: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.originalStack = error.stack;
    Error.captureStackTrace(enhancedError);
    return [null, enhancedError];
  }
};

module.exports = toAwait;
module.exports.withContext = toAwaitWithContext;
