const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Fetch the ecosystem visualization payload from backend
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchRepositoryEcosystem(owner, repo) {
  const response = await fetch(`${API_BASE_URL}/repo/${owner.trim()}/${repo.trim()}`);
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.message || `Backend response returned HTTP status ${response.status}`);
    error.code = errorBody.error || 'SERVER_ERROR';
    throw error;
  }
  
  return response.json();
}

/**
 * Health status retrieval
 */
export async function getBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return { status: 'OFFLINE' };
    return await response.json();
  } catch (error) {
    return { status: 'OFFLINE', error: error.message };
  }
}
