import React, { useState } from 'react';
import { Order } from '../types';
import { api } from '../services/api';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { XCircle, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteOrderModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({ order, onClose, onConfirm }) => {
    const { currentUser } = useAuth();
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirmDeletion = async () => {
        if (!currentUser || !remarks.trim()) {
            setError("Remarks are required to delete an order.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await api.deleteOrder(order.id, remarks, currentUser.username);
            onConfirm();
            onClose();
        } catch (err) {
            let message = "An unknown error occurred.";
            if (err instanceof Error) {
                message = err.message;
            } else if (err && typeof err === 'object' && 'message' in err) {
                message = String((err as { message: unknown }).message);
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-red-600">Delete Order</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p>
                        Are you sure you want to delete order <span className="font-mono font-semibold">{order.id}</span>?
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-lg flex items-start">
                        <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            This action will permanently remove the order and credit the distributor's wallet for the full amount. This cannot be undone.
                        </div>
                    </div>
                    <div>
                        <label htmlFor="remarks" className="block text-sm font-medium text-contentSecondary mb-1">
                            Reason for Deletion (Required)
                        </label>
                        <textarea
                            id="remarks"
                            rows={3}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition bg-slate-50 text-sm text-content border-border focus:border-primary focus:bg-white"
                            placeholder="e.g., Customer cancellation, incorrect order entry..."
                        />
                    </div>
                </div>
                
                {error && <div className="p-4 text-center text-sm bg-red-100 text-red-800">{error}</div>}

                <div className="p-4 bg-background border-t flex justify-end gap-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button 
                        variant="danger" 
                        onClick={handleConfirmDeletion} 
                        isLoading={loading} 
                        disabled={loading || !remarks.trim()}
                    >
                        <Trash2 size={16} /> Confirm Deletion
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DeleteOrderModal;