const API_URL = window.API_BASE_URL || window.API_URL ||
  (window.location.port === '5500' || window.location.port === '5001' || window.location.port === '3000' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : '/api');

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
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  }

  /**
   * Get user from localStorage
   * @returns {object|null} User object
   */
  getUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
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
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
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
      
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      
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
   * @param {object} params - Query parameters or fetch options
   * @returns {Promise} Response data
   */
  get(endpoint, params = {}) {
    if (params && typeof params === 'object' && !params.headers && !params.method) {
      const queryString = Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const url = queryString ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}` : endpoint;
      return this.request(url, { method: 'GET' });
    }
    return this.request(endpoint, { ...params, method: 'GET' });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Fetch options
   * @returns {Promise} Response data
   */
  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Fetch options
   * @returns {Promise} Response data
   */
  put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise} Response data
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Fetch options
   * @returns {Promise} Response data
   */
  patch(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
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
    localStorage.setItem('auth_token', token);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('lifelinkDonor');
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
    return dashboards[role] || 'login.html';
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

// Global compatibility
if (typeof window !== 'undefined') {
  window.api = api;
  window.apiRequest = (endpoint, options) => api.request(endpoint, options);
}

// Export for use in other files
export default api;
export { ApiClient };