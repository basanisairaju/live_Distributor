

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
// FIX: Import 'process' to provide type definitions for 'process.cwd()'
import process from 'process';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1800,
      },
    };
});
