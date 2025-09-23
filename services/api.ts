// services/api.ts
import { SupabaseApiService } from './supabaseApiService';
import { ApiService } from './apiService.interface';

// The application is now configured to use the Supabase API service exclusively.
// Ensure your environment variables for SUPABASE_URL and SUPABASE_KEY are correctly set.
const api: ApiService = new SupabaseApiService();

export { api };
