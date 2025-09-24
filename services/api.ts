import { SupabaseApiService } from './supabaseApiService';
import { ApiService } from './apiService.interface';

// The application now exclusively uses the Supabase API service.
// The conditional logic for the mock service has been removed.
const api: ApiService = new SupabaseApiService();

export { api };