import api from './api.js';

/**
 * Authentication API Service
 * Handles all authentication-related requests
 */
export const authApi = {
  /**
   * Register a new user
   * @param {object} userData - User registration data
   * @returns {Promise} Response
   */
  register: async (userData) => {
    return api.post('/auth/register', userData);
  },

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Response
   */
  login: async (email, password) => {
    return api.post('/auth/login', { email, password });
  },

  /**
   * Get current user profile
   * @returns {Promise} Response
   */
  getMe: async () => {
    return api.get('/auth/me');
  },

  /**
   * Logout user
   * @returns {Promise} Response
   */
  logout: async () => {
    return api.post('/auth/logout');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return api.isAuthenticated();
  },

  /**
   * Get current user from localStorage
   * @returns {object|null}
   */
  getCurrentUser: () => {
    return api.getUser();
  },

  /**
   * Save authentication data
   * @param {string} token - JWT token
   * @param {object} user - User object
   */
  saveAuth: (token, user) => {
    api.saveAuth(token, user);
  },

  /**
   * Clear authentication data
   */
  clearAuth: () => {
    api.clearAuth();
  },

  /**
   * Get dashboard URL for user role
   * @param {string} role - User role
   * @returns {string} Dashboard URL
   */
  getDashboardUrl: (role) => {
    return api.getDashboardUrl(role);
  },

  /**
   * Logout and redirect to login
   */
  logoutAndRedirect: () => {
    api.logout();
  }
};

export default authApi;
