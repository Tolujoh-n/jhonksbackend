/**
 * Database retry utility for handling MongoDB timeout errors
 */

const retryDatabaseOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's a timeout error
      const isTimeoutError = 
        error.message?.includes('buffering timed out') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ENOTFOUND') ||
        error.code === 'ETIMEDOUT';
      
      if (isTimeoutError && attempt < maxRetries) {
        console.warn(`⚠️ Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
        console.log(`🔄 Retrying in ${delay}ms...`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      // If it's not a timeout error or we've exhausted retries, throw the error
      throw error;
    }
  }
  
  throw lastError;
};

module.exports = { retryDatabaseOperation };
