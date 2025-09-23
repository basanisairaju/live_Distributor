import { SupabaseApiService } from './supabaseApiService';
import { MockApiService } from './mockApiService';
import { ApiService } from './apiService.interface';

const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;

let api: ApiService;

if (useSupabase) {
    console.log("Using Supabase API service.");
    api = new SupabaseApiService();
} else {
    console.warn("Supabase credentials not found. Falling back to Mock API service. Any data changes will not be saved.");
    api = new MockApiService();
}

export { api };
