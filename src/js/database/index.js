/**
 * Database Module Index
 * Provides a unified entry point for all database operations
 */

// Export services
export * from './services/index.js';

// Export sync system
export * from './sync/index.js';

// Export Supabase client
export { supabase } from '../auth/supabaseClient.js';
