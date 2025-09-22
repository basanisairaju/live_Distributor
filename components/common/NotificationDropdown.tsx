import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNotifications = async () => {
            const data = await api.getNotifications();
            setNotifications(data);
        };
        fetchNotifications();

        const interval = setInterval(fetchNotifications, 30000); // Poll for new notifications every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        await api.markNotificationAsRead(id);
        const data = await api.getNotifications();
        setNotifications(data);
    };

    const handleViewAll = () => {
        setIsOpen(false);
        navigate('/notifications');
    };

    const timeSince = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 3600;
        if (interval > 24) return Math.floor(interval/24) + "d ago";
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-background">
                <Bell />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-xl z-20 border border-border">
                    <div className="p-3 border-b border-border">
                        <h4 className="font-semibold text-content">Notifications</h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.slice(0, 5).map(notification => (
                                <div key={notification.id} onClick={() => handleMarkAsRead(notification.id)} className={`flex items-start p-3 hover:bg-background cursor-pointer ${!notification.isRead ? 'bg-primary/10' : ''}`}>
                                    {!notification.isRead && <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-1.5 flex-shrink-0"></div>}
                                    <div className={`flex-grow ${notification.isRead ? 'ml-5' : ''}`}>
                                        <p className="text-sm text-contentSecondary">{notification.message}</p>
                                        <p className="text-xs text-contentSecondary mt-1">{timeSince(notification.date)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-contentSecondary p-4">No notifications yet.</p>
                        )}
                    </div>
                    <div className="p-2 border-t border-border">
                        <button onClick={handleViewAll} className="w-full text-center text-sm text-primary font-semibold hover:underline">
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
