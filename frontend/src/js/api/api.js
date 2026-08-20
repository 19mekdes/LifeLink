const API_URL = 'http://localhost:5001/api';

/**
 * Base API Client for LifeLink
 * Handles all HTTP requests to the backend
 */
class ApiClient {
  constructor() {
    this.baseURL = API_URL;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token
   */
  setToken(token) {
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
  }

  /**
   * Get token from localStorage
   * @returns {string|null} JWT token
   */
  getToken() {
    return localStorage.getItem('token');
  }

  /**
   * Get user from localStorage
   * @returns {object|null} User object
   */
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Make HTTP request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    
    // Set token if available
    if (token) {
      this.setToken(token);
    }

    const config = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      // Handle 401 Unauthorized (expired, invalid, missing, or stale token)
      if (response.status === 401) {
        this.clearAuth();
        if (!window.location.pathname.includes('login.html')) {
          window.location.href = 'login.html';
        }
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        error: error.message
      };
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @returns {Promise} Response data
   */
  get(endpoint, params = {}) {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise} Response data
   */
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise} Response data
   */
  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise} Response data
   */
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise} Response data
   */
  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Save authentication data
   * @param {string} token - JWT token
   * @param {object} user - User object
   */
  saveAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Get dashboard URL based on user role
   * @param {string} role - User role
   * @returns {string} Dashboard URL
   */
  getDashboardUrl(role) {
    const dashboards = {
      'ADMIN': 'admin-dashboard.html',
      'BLOOD_BANK': 'bloodbank-dashboard.html',
      'HOSPITAL': 'hospital-dashboard.html',
      'DONOR': 'donor-dashboard.html'
    };
    return dashboards[role] || 'dashboard.html';
  }

  /**
   * Handle logout
   */
  logout() {
    this.clearAuth();
    window.location.href = 'login.html';
  }
}

// Create singleton instance
const api = new ApiClient();

// Export for use in other files
export default api;
export { ApiClient };