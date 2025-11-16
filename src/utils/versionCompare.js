/**
 * Compare two semantic version strings
 * @param {string} v1 - First version (e.g., "1.0.0")
 * @param {string} v2 - Second version (e.g., "1.0.1")
 * @returns {number} - Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  // Normalize to same length
  const maxLength = Math.max(parts1.length, parts2.length);
  while (parts1.length < maxLength) parts1.push(0);
  while (parts2.length < maxLength) parts2.push(0);
  
  for (let i = 0; i < maxLength; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  
  return 0;
};

/**
 * Check if a client version should see an update based on version ranges
 * @param {string} clientVersion - The app version from the mobile client
 * @param {string} currentVersion - The latest version (users with this won't see update)
 * @param {string} minVersion - Optional minimum version (inclusive)
 * @param {string} maxVersion - Optional maximum version (exclusive)
 * @returns {boolean} - True if client should see the update
 */
const shouldShowUpdate = (clientVersion, currentVersion, minVersion = null, maxVersion = null) => {
  // If client is on current version, don't show update
  if (compareVersions(clientVersion, currentVersion) === 0) {
    return false;
  }
  
  // If client version is greater than current version (shouldn't happen but be safe)
  if (compareVersions(clientVersion, currentVersion) > 0) {
    return false;
  }
  
  // Check min version constraint (inclusive)
  if (minVersion && compareVersions(clientVersion, minVersion) < 0) {
    return false;
  }
  
  // Check max version constraint (exclusive - client version must be < maxVersion)
  if (maxVersion && compareVersions(clientVersion, maxVersion) >= 0) {
    return false;
  }
  
  // Client version is less than current version and within range
  return true;
};

module.exports = {
  compareVersions,
  shouldShowUpdate
};

