import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

interface ProtectedRouteProps {
    children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { currentUser, isLoading, portal, setPortal } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Verifying authentication...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // If user has a single store role, auto-select their portal and let them through
    if (!portal && currentUser.role === UserRole.STORE_ADMIN && currentUser.storeId) {
        // This is a side-effect in render, but acceptable for this one-time setup
        Promise.resolve().then(() => {
            setPortal({ type: 'store', id: currentUser.storeId });
        });
        // Render loading or the children, as it will re-render once portal is set
        return <div className="flex items-center justify-center min-h-screen">Setting up your store...</div>;
    }
    
    // For plant admins or multi-role users, if no portal is selected, redirect
    if (!portal && currentUser.role === UserRole.PLANT_ADMIN) {
        // Allow access to the selection page itself
        if (location.pathname === '/select-portal') {
            return children;
        }
        return <Navigate to="/select-portal" state={{ from: location }} replace />;
    }


    return children;
};

export default ProtectedRoute;