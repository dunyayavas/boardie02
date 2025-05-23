/**
 * Schema Service
 * Utilities for inspecting and working with the Supabase database schema
 */

import { supabase } from '../../auth/supabaseClient.js';

/**
 * Get the column information for a table
 * @param {string} tableName - The name of the table to inspect
 * @returns {Promise<Array>} Array of column information
 */
export async function getTableColumns(tableName) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    // Query the information_schema.columns table to get column information
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName);
    
    if (error) {
      console.error(`Error fetching schema for table ${tableName}:`, error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getTableColumns:', error);
    return [];
  }
}

/**
 * Log the schema of a table to the console
 * @param {string} tableName - The name of the table to inspect
 */
export async function logTableSchema(tableName) {
  try {
    const columns = await getTableColumns(tableName);
    
    console.log(`Schema for table '${tableName}':`);
    console.table(columns);
    
    return columns;
  } catch (error) {
    console.error('Error logging table schema:', error);
    return [];
  }
}

/**
 * Check if a column exists in a table
 * @param {string} tableName - The name of the table
 * @param {string} columnName - The name of the column to check
 * @returns {Promise<boolean>} True if the column exists
 */
export async function columnExists(tableName, columnName) {
  try {
    const columns = await getTableColumns(tableName);
    return columns.some(col => col.column_name === columnName);
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
    return false;
  }
}

/**
 * Get a list of all tables in the database
 * @returns {Promise<Array>} Array of table names
 */
export async function listTables() {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    // Query the information_schema.tables table to get table information
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
    
    return (data || []).map(table => table.table_name);
  } catch (error) {
    console.error('Error in listTables:', error);
    return [];
  }
}
