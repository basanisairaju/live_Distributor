import React from 'react';
import { createRoot } from 'react-dom/client';
// FIX: Replaced HashRouter with BrowserRouter to resolve an export error. This is a common fix for environments where HashRouter might not be supported, while maintaining routing functionality.
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { api } from './services/api';

// Seed the admin user on startup to ensure it exists in the database.
api.seedAdminUser().catch(console.error);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}