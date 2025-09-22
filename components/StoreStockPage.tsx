import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { EnrichedStockItem, StockLedgerEntry, StockMovementType, UserRole, SKU, Store } from '../types';
import Card from './common/Card';
import { useAuth } from '../hooks/useAuth';
import { Package, History } from 'lucide-react';
import { formatIndianNumber, formatDateTimeDDMMYYYY } from '../utils/formatting';

const StoreStockPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const { storeId } = useParams<{ storeId?: string }>();
    const [stock, setStock] = useState<EnrichedStockItem[]>([]);
    const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [storeDetails, setStoreDetails] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const skuMap = useMemo(() => new Map(skus.map(s => [s.id, s.name])), [skus]);
    const locationId = useMemo(() => storeId || (portal?.type === 'store' ? portal.id : null), [storeId, portal]);

    const fetchData = useCallback(async () => {
        if (!locationId) {
            if (currentUser?.role === UserRole.PLANT_ADMIN) {
                 setError("Please select a store to view its stock from the 'Manage Stores' page.");
            } else {
                setError("No store specified for your user account.");
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const storeData = await api.getStoreById(locationId);
            if (!storeData) {
                setError(`Store with ID "${locationId}" not found.`);
                setLoading(false);
                return;
            }
            setStoreDetails(storeData);

            const [stockData, ledgerData, skuData] = await Promise.all([
                api.getStock(locationId),
                api.getStockLedger(locationId),
                api.getSKUs(),
            ]);
            setStock(stockData.sort((a,b) => a.skuName.localeCompare(b.skuName)));
            setLedger(ledgerData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setSkus(skuData);
        } catch (err) {
            setError("Failed to fetch store stock data.");
        } finally {
            setLoading(false);
        }
    }, [locationId, currentUser?.role]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const recentTransfers = useMemo(() => {
        return ledger
            .filter(entry => entry.type === StockMovementType.TRANSFER_IN)
            .slice(0, 10);
    }, [ledger]);

    if (currentUser?.role !== UserRole.STORE_ADMIN && currentUser?.role !== UserRole.PLANT_ADMIN) {
        return <Card className="text-center"><p>You do not have permission to view this page.</p></Card>;
    }
    
    if (loading && !storeDetails) {
        return <div className="text-center p-8">Loading store details...</div>;
    }
    
    if (error) {
        return <Card className="text-center text-red-500">{error}</Card>;
    }
    
    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold">{storeDetails ? `Stock at ${storeDetails.name}` : 'Store Stock'}</h2>
             
             <Card>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Package/> Current Inventory</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-3 font-semibold text-contentSecondary">Product Name</th>
                                <th className="p-3 font-semibold text-contentSecondary text-right">On Hand</th>
                                <th className="p-3 font-semibold text-contentSecondary text-right">Reserved</th>
                                <th className="p-3 font-semibold text-contentSecondary text-right">Available</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.map(item => (
                                <tr key={item.skuId} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-3 font-medium">{item.skuName}</td>
                                    <td className="p-3 text-right">{formatIndianNumber(item.quantity)}</td>
                                    <td className="p-3 text-right text-yellow-700">{formatIndianNumber(item.reserved)}</td>
                                    <td className="p-3 font-semibold text-right text-green-700">{formatIndianNumber(item.quantity - item.reserved)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading && <p className="text-center p-4">Loading stock...</p>}
                    {!loading && stock.length === 0 && <p className="text-center p-8 text-contentSecondary">No stock found for this store.</p>}
                </div>
            </Card>
             <Card>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><History/> Recent Transfers from Plant</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-3 font-semibold text-contentSecondary">Date</th>
                                <th className="p-3 font-semibold text-contentSecondary">Product</th>
                                <th className="p-3 font-semibold text-contentSecondary text-right">Quantity Received</th>
                                <th className="p-3 font-semibold text-contentSecondary">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransfers.map(item => (
                                <tr key={item.id} className="border-b last:border-0">
                                    <td className="p-3 whitespace-nowrap">{formatDateTimeDDMMYYYY(item.date)}</td>
                                    <td className="p-3 font-medium">{skuMap.get(item.skuId) || item.skuId}</td>
                                    <td className="p-3 font-semibold text-right text-green-600">+{formatIndianNumber(item.quantityChange)}</td>
                                    <td className="p-3 text-contentSecondary italic">{item.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading && <p className="text-center p-4">Loading transfer history...</p>}
                    {!loading && recentTransfers.length === 0 && <p className="text-center p-8 text-contentSecondary">No recent transfers have been received from the plant.</p>}
                </div>
            </Card>
        </div>
    );
};

export default StoreStockPage;
