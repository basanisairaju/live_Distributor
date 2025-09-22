

import React, { useState, useEffect, useMemo } from 'react';
import { Order, EnrichedOrderItem, SKU } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { Save, XCircle, CornerUpLeft, TrendingDown } from 'lucide-react';
import Input from './common/Input';
import { formatIndianCurrency } from '../utils/formatting';

interface ReturnOrderModalProps {
    order: Order;
    onClose: () => void;
    onSave: () => void;
}

const ReturnOrderModal: React.FC<ReturnOrderModalProps> = ({ order, onClose, onSave }) => {
    const { currentUser } = useAuth();
    const [items, setItems] = useState<EnrichedOrderItem[]>([]);
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number | string>>({});
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const itemData = await api.getOrderItems(order.id);
                setItems(itemData.filter(i => !i.isFreebie)); // Freebies cannot be returned
            } catch (err) {
                setError("Failed to load order items for return.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [order]);

    const handleQuantityChange = (skuId: string, value: string) => {
        const item = items.find(i => i.skuId === skuId);
        if (!item) return;

        const availableToReturn = item.quantity - item.returnedQuantity;
        let newQuantity = parseInt(value, 10);

        if (isNaN(newQuantity) || newQuantity < 0) {
            setReturnQuantities(prev => ({ ...prev, [skuId]: '' }));
            return;
        }
        
        if (newQuantity > availableToReturn) newQuantity = availableToReturn;

        setReturnQuantities(prev => ({ ...prev, [skuId]: newQuantity }));
    };

    const { returnSubtotal, returnGst, returnTotal } = useMemo(() => {
        let subtotal = 0;
        let gst = 0;
        items.forEach(item => {
            const returnQty = Number(returnQuantities[item.skuId] || 0);
            if (returnQty > 0) {
                const itemSubtotal = returnQty * item.unitPrice;
                subtotal += itemSubtotal;
                gst += itemSubtotal * (item.gstPercentage / 100);
            }
        });
        const total = subtotal + gst;
        return { returnSubtotal: subtotal, returnGst: gst, returnTotal: total };
    }, [items, returnQuantities]);

    const handleProcessReturn = async () => {
        if (!currentUser) return;
        
        const itemsToReturn = Object.entries(returnQuantities)
            .map(([skuId, quantity]) => ({ skuId, quantity: Number(quantity) }))
            .filter(item => item.quantity > 0);

        if (itemsToReturn.length === 0) {
            setError("Please enter a quantity for at least one item to return.");
            return;
        }
        
        if (!remarks.trim()) {
            setError("Remarks are required to submit a return request.");
            return;
        }

        if (!window.confirm(`This will create a return request for ${formatIndianCurrency(returnTotal)}. The request must be confirmed by an admin to credit the distributor's wallet. Proceed?`)) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await api.initiateOrderReturn(order.id, itemsToReturn, currentUser.username, remarks);
            onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while creating the return request.");
        } finally {
            setLoading(false);
        }
    };
    
    // FIX: Explicitly type the accumulator `sum` as a number to resolve the TypeScript error.
    const totalItemsToReturn = Object.values(returnQuantities).reduce((sum: number, qty) => sum + Number(qty || 0), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Return Items for Order <span className="font-mono text-sm text-contentSecondary block sm:inline mt-1 sm:mt-0">{order.id}</span></h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                
                {loading ? <div className="p-8 text-center">Loading...</div> : (
                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold mb-2">Select Items to Return</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="p-2 font-semibold text-contentSecondary">Product</th>
                                        <th className="p-2 font-semibold text-contentSecondary text-center">Delivered</th>
                                        <th className="p-2 font-semibold text-contentSecondary text-center">Returned</th>
                                        <th className="p-2 font-semibold text-contentSecondary text-center w-40">Return Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => {
                                        const availableToReturn = item.quantity - item.returnedQuantity;
                                        return (
                                            <tr key={item.id} className="border-b last:border-0">
                                                <td className="p-2 font-medium">{item.skuName}</td>
                                                <td className="p-2 text-center">{item.quantity}</td>
                                                <td className="p-2 text-center">{item.returnedQuantity}</td>
                                                <td className="p-2">
                                                    <Input 
                                                        type="number" 
                                                        className="text-center"
                                                        placeholder="0"
                                                        max={availableToReturn}
                                                        min={0}
                                                        value={returnQuantities[item.skuId] || ''}
                                                        onChange={e => handleQuantityChange(item.skuId, e.target.value)}
                                                        disabled={availableToReturn <= 0}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold mb-2">Reason for Return (Required)</h3>
                        <div>
                            <textarea
                                id="remarks"
                                rows={3}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition bg-slate-50 text-sm text-content border-border focus:border-primary focus:bg-white"
                                placeholder="e.g., Damaged items, wrong product delivered, etc."
                            />
                        </div>
                    </Card>

                    <Card className="bg-blue-50">
                        <h3 className="font-semibold mb-2 text-content">Return Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Return Subtotal:</span> <span className="font-medium">{formatIndianCurrency(returnSubtotal)}</span></div>
                            <div className="flex justify-between"><span>GST (Calculated):</span> <span className="font-medium">{formatIndianCurrency(returnGst)}</span></div>
                            <div className={`flex justify-between border-t pt-2 mt-2 font-bold text-green-600`}>
                                <span>Total Credit to be Issued:</span>
                                <span className="flex items-center">
                                    {returnTotal > 0 && <TrendingDown size={16} className="mr-1"/>}
                                    {formatIndianCurrency(returnTotal)}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
                )}
                
                {error && <div className="p-4 text-center text-sm bg-red-100 text-red-800">{error}</div>}

                <div className="p-4 bg-background border-t flex justify-end gap-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleProcessReturn} isLoading={loading} disabled={loading || totalItemsToReturn === 0 || !remarks.trim()}>
                        <CornerUpLeft size={16} className="mr-2"/> Submit Return Request
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReturnOrderModal;