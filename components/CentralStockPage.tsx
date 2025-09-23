

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { EnrichedStockItem, SKU, UserRole, StockLedgerEntry, StockMovementType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { useAuth } from '../hooks/useAuth';
import { Package, History, XCircle, PlusCircle, Trash2, Save, CheckCircle, List, Layers, Download, X } from 'lucide-react';
import { formatIndianNumber, formatDateTimeDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import DateRangePicker from './common/DateRangePicker';


interface ProductionItem {
    id: string;
    skuId: string;
    quantity: number | string;
}

const CentralStockPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [stock, setStock] = useState<EnrichedStockItem[]>([]);
    const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview');
    
    // Ledger Filters
    const [ledgerSkuFilter, setLedgerSkuFilter] = useState('all');
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
    const getInitialLedgerDateRange = () => {
        const to = new Date();
        const from = new Date();
        from.setMonth(to.getMonth() - 1);
        to.setHours(23, 59, 59, 999);
        from.setHours(0, 0, 0, 0);
        return { from, to };
    };
    const [ledgerDateRange, setLedgerDateRange] = useState(getInitialLedgerDateRange());

    const skuMap = useMemo(() => new Map(skus.map(s => [s.id, s.name])), [skus]);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setStatusMessage(null);
        try {
            const [stockData, skuData, ledgerData] = await Promise.all([
                api.getStock('plant'),
                api.getSKUs(),
                api.getStockLedger('plant'),
            ]);
            setStock(stockData);
            setSkus(skuData);
            setLedger(ledgerData);
        } catch (err) {
            setError('Failed to fetch stock data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const recentProductions = useMemo(() => {
        return ledger
            .filter(entry => entry.type === StockMovementType.PRODUCTION)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 15);
    }, [ledger]);
    
    const formatMovementType = (type: StockMovementType) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    const filteredLedger = useMemo(() => {
        return ledger.filter(entry => {
            if (ledgerSkuFilter !== 'all' && entry.skuId !== ledgerSkuFilter) return false;
            if (ledgerTypeFilter !== 'all' && entry.type !== ledgerTypeFilter) return false;
            if (ledgerDateRange.from && new Date(entry.date) < ledgerDateRange.from) return false;
            if (ledgerDateRange.to && new Date(entry.date) > ledgerDateRange.to) return false;
            return true;
        });
    }, [ledger, ledgerSkuFilter, ledgerTypeFilter, ledgerDateRange]);

    const { items: sortedLedger, requestSort: requestLedgerSort, sortConfig: ledgerSortConfig } = useSortableData(filteredLedger, { key: 'date', direction: 'descending' });
    
    // FIX: Added a calculated 'available' property to stock items for correct sorting.
    const stockWithAvailable = useMemo(() => stock.map(item => ({
        ...item,
        available: item.quantity - item.reserved,
    })), [stock]);
    const { items: sortedStock, requestSort: requestStockSort, sortConfig: stockSortConfig } = useSortableData(stockWithAvailable, { key: 'skuName', direction: 'ascending' });

    const handleResetFilters = () => {
        setLedgerSkuFilter('all');
        setLedgerTypeFilter('all');
        setLedgerDateRange(getInitialLedgerDateRange());
    };
    
    const handleAddProductionItem = () => {
        if (skus.length > 0) {
            const newItem: ProductionItem = {
                id: Date.now().toString(),
                skuId: skus[0].id,
                quantity: '',
            };
            setProductionItems(prev => [...prev, newItem]);
        }
    };

    const handleProductionItemChange = (id: string, field: 'skuId' | 'quantity', value: string) => {
        setProductionItems(prev =>
            prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const handleRemoveProductionItem = (id: string) => {
        setProductionItems(prev => prev.filter(item => item.id !== id));
    };
    
    const handleSubmitProduction = async () => {
        if (!currentUser) return;
        
        const itemsToSubmit = productionItems
            .map(item => ({
                skuId: item.skuId,
                quantity: Number(item.quantity)
            }))
            .filter(item => item.quantity > 0 && !isNaN(item.quantity));

        if (itemsToSubmit.length === 0) {
            setStatusMessage({ type: 'error', text: 'Please add at least one item with a valid quantity.' });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            await api.addPlantProduction(itemsToSubmit);
            setStatusMessage({ type: 'success', text: 'Production successfully recorded!' });
            setProductionItems([]);
            await fetchData();
        } catch (err) {
            setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'An unknown error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExportLedgerCsv = () => {
        if (sortedLedger.length === 0) {
            alert("No data to export for the current filters.");
            return;
        }

        const escapeCsvCell = (cell: any): string => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        
        const headers = [
            'Date', 'Product', 'Change', 'Balance After', 'Type', 'Notes', 'Initiated By'
        ];

        const rows = sortedLedger.map(entry => [
            formatDateTimeDDMMYYYY(entry.date),
            skuMap.get(entry.skuId),
            entry.quantityChange,
            entry.balanceAfter,
            formatMovementType(entry.type),
            entry.notes || '',
            entry.initiatedBy
        ].map(escapeCsvCell));

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `stock_ledger_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    if (currentUser?.role !== UserRole.PLANT_ADMIN) {
        return <Card className="text-center"><p>You do not have permission to view this page.</p></Card>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Central Stock Management</h2>

            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                        <Layers size={16} /> Overview
                    </button>
                    <button onClick={() => setActiveTab('ledger')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                        <List size={16} /> Stock Ledger
                    </button>
                </nav>
            </div>

            {statusMessage && (
                <div className={`flex items-center p-3 rounded-lg text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                    {statusMessage.text}
                </div>
            )}
            
            {activeTab === 'overview' && (
                 <div className="space-y-6">
                     <Card>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">Add Daily Production</h3>
                        <div className="space-y-2">
                            {productionItems.map(item => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-background">
                                    <div className="col-span-12 sm:col-span-7">
                                        <Select
                                            value={item.skuId}
                                            onChange={(e) => handleProductionItemChange(item.id, 'skuId', e.target.value)}
                                        >
                                            {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </Select>
                                    </div>
                                    <div className="col-span-8 sm:col-span-3">
                                        <Input
                                            type="number"
                                            placeholder="Quantity"
                                            value={item.quantity}
                                            onChange={(e) => handleProductionItemChange(item.id, 'quantity', e.target.value)}
                                            min="1"
                                        />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2 text-right self-center flex justify-end">
                                        <Button onClick={() => handleRemoveProductionItem(item.id)} variant="secondary" size="sm" className="p-2" title="Remove Item"><Trash2 size={16} className="text-red-500"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <Button onClick={handleAddProductionItem} variant="secondary" size="sm" disabled={skus.length === 0}><PlusCircle size={16}/> Add Product</Button>
                            <Button onClick={handleSubmitProduction} isLoading={isSubmitting} disabled={productionItems.length === 0}>
                                <Save size={16}/> Submit Production Run
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Package /> Current Plant Inventory</h3>
                         {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <SortableTableHeader label="Product Name" sortKey="skuName" requestSort={requestStockSort} sortConfig={stockSortConfig} />
                                        <SortableTableHeader label="Quantity on Hand" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                        <SortableTableHeader label="Reserved" sortKey="reserved" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                        {/* FIX: Changed sortKey to 'available' and removed 'as any' casts to fix TypeScript error. */}
                                        <SortableTableHeader label="Available" sortKey="available" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStock.map(item => (
                                        <tr key={item.skuId} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="p-3 font-medium">{item.skuName}</td>
                                            <td className="p-3 text-right text-content">{formatIndianNumber(item.quantity)}</td>
                                            <td className="p-3 text-right text-yellow-700">{formatIndianNumber(item.reserved)}</td>
                                            <td className="p-3 font-semibold text-right text-green-700">{formatIndianNumber(item.available)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                             {sortedStock.map(item => (
                                <Card key={item.skuId}>
                                    <p className="font-bold text-content">{item.skuName}</p>
                                    <div className="grid grid-cols-3 gap-4 text-center mt-3 pt-3 border-t">
                                        <div>
                                            <p className="text-xs font-semibold text-contentSecondary">On Hand</p>
                                            <p className="font-semibold text-lg text-content">{formatIndianNumber(item.quantity)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-contentSecondary">Reserved</p>
                                            <p className="font-semibold text-lg text-yellow-700">{formatIndianNumber(item.reserved)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-contentSecondary">Available</p>
                                            <p className="font-bold text-lg text-green-700">{formatIndianNumber(item.available)}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {loading && <p className="text-center p-4">Loading stock...</p>}
                        {!loading && stock.length === 0 && <p className="text-center p-8 text-contentSecondary">No stock recorded yet.</p>}
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><History /> Recent Production Runs</h3>
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="p-3 font-semibold text-contentSecondary">Date</th>
                                        <th className="p-3 font-semibold text-contentSecondary">Product</th>
                                        <th className="p-3 font-semibold text-contentSecondary text-right">Quantity Added</th>
                                        <th className="p-3 font-semibold text-contentSecondary">Recorded By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentProductions.map(item => (
                                        <tr key={item.id} className="border-b last:border-0">
                                            <td className="p-3 whitespace-nowrap">{formatDateTimeDDMMYYYY(item.date)}</td>
                                            <td className="p-3 font-medium">{skuMap.get(item.skuId) || item.skuId}</td>
                                            <td className="p-3 font-semibold text-right text-green-600">+{formatIndianNumber(item.quantityChange)}</td>
                                            <td className="p-3 text-contentSecondary">{item.initiatedBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden space-y-4">
                            {recentProductions.map(item => (
                                <Card key={item.id}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-content">{skuMap.get(item.skuId) || item.skuId}</p>
                                            <p className="text-xs text-contentSecondary">{formatDateTimeDDMMYYYY(item.date)}</p>
                                        </div>
                                        <p className="font-bold text-lg text-green-600">+{formatIndianNumber(item.quantityChange)}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {loading && <p className="text-center p-4">Loading production history...</p>}
                        {!loading && recentProductions.length === 0 && <p className="text-center p-8 text-contentSecondary">No recent production runs found.</p>}
                    </Card>
                 </div>
            )}
            
            {activeTab === 'ledger' && (
                 <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">Stock Movement History</h3>
                        <Button onClick={handleExportLedgerCsv} size="sm" variant="secondary" disabled={sortedLedger.length === 0}>
                            <Download size={14} className="mr-2"/> Export CSV
                        </Button>
                    </div>
                     <div className="p-4 bg-slate-50 rounded-lg border border-border mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <Select label="Filter by Product" value={ledgerSkuFilter} onChange={e => setLedgerSkuFilter(e.target.value)}>
                                <option value="all">All Products</option>
                                {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                            <Select label="Filter by Type" value={ledgerTypeFilter} onChange={e => setLedgerTypeFilter(e.target.value)}>
                                <option value="all">All Movement Types</option>
                                {Object.values(StockMovementType).map(type => <option key={type} value={type}>{formatMovementType(type)}</option>)}
                            </Select>
                             <div className="lg:col-span-2">
                                <DateRangePicker label="Filter by Date" value={ledgerDateRange} onChange={setLedgerDateRange} />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleResetFilters} variant="secondary" size="sm">
                                <X size={14} className="mr-2"/> Reset Filters
                            </Button>
                        </div>
                    </div>
                    {/* Desktop Table View */}
                    <div className="relative max-h-[600px] overflow-auto border rounded-lg hidden md:block">
                        <table className="w-full text-sm min-w-[1000px] border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100">
                                <tr className="border-b border-border">
                                    <SortableTableHeader label="Date" sortKey="date" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <th className="p-3 font-semibold text-contentSecondary">Product</th>
                                    <SortableTableHeader label="Change" sortKey="quantityChange" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} className="text-right" />
                                    <SortableTableHeader label="Balance After" sortKey="balanceAfter" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} className="text-right" />
                                    <SortableTableHeader label="Type" sortKey="type" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <th className="p-3 font-semibold text-contentSecondary">Notes</th>
                                    <th className="p-3 font-semibold text-contentSecondary">Initiated By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && sortedLedger.map(entry => (
                                    <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-3 whitespace-nowrap">{formatDateTimeDDMMYYYY(entry.date)}</td>
                                        <td className="p-3 font-medium">{skuMap.get(entry.skuId)}</td>
                                        <td className={`p-3 font-semibold text-right ${entry.quantityChange > 0 ? 'text-green-600' : entry.quantityChange < 0 ? 'text-red-600' : 'text-contentSecondary'}`}>
                                            {entry.quantityChange > 0 ? '+' : ''}{formatIndianNumber(entry.quantityChange)}
                                        </td>
                                        <td className="p-3 text-right font-medium">{formatIndianNumber(entry.balanceAfter)}</td>
                                        <td className="p-3">{formatMovementType(entry.type)}</td>
                                        <td className="p-3 text-xs italic text-contentSecondary">{entry.notes}</td>
                                        <td className="p-3 text-contentSecondary">{entry.initiatedBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {sortedLedger.map(entry => (
                            <Card key={entry.id}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-content">{skuMap.get(entry.skuId)}</p>
                                        <p className="text-xs text-contentSecondary">{formatDateTimeDDMMYYYY(entry.date)}</p>
                                    </div>
                                    <p className={`font-bold text-lg ${entry.quantityChange > 0 ? 'text-green-600' : entry.quantityChange < 0 ? 'text-red-600' : 'text-contentSecondary'}`}>
                                        {entry.quantityChange > 0 ? '+' : ''}{formatIndianNumber(entry.quantityChange)}
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                     <div className="flex justify-between">
                                        <span className="text-contentSecondary">Type</span>
                                        <span className="font-medium">{formatMovementType(entry.type)}</span>
                                    </div>
                                     <div className="flex justify-between font-bold">
                                        <span className="text-contentSecondary">Balance After</span>
                                        <span>{formatIndianNumber(entry.balanceAfter)}</span>
                                    </div>
                                    {entry.notes && (
                                        <div className="text-xs italic pt-2">
                                            <p>{entry.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                    {loading && <p className="text-center p-4">Loading ledger...</p>}
                    {!loading && sortedLedger.length === 0 && (
                        <p className="text-center p-8 text-contentSecondary">
                            No stock movements found for the selected filters.
                        </p>
                    )}
                 </Card>
            )}

        </div>
    );
};

export default CentralStockPage;