// services/api.ts
import { SupabaseApiService } from './supabaseApiService';
import { MockApiService } from './mockApiService';
import { ApiService } from './apiService.interface';

let api: ApiService;

// Vite replaces these with string literals at build time.
// We check if they are defined and not the string 'undefined'.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'undefined' && supabaseKey !== 'undefined') {
  console.log("Supabase credentials found. Initializing Supabase API service.");
  api = new SupabaseApiService();
} else {
  console.warn("Supabase credentials not found in environment variables. Falling back to Mock API Service. Please set SUPABASE_URL and SUPABASE_KEY to connect to your backend.");
  api = new MockApiService();
}

export { api };
