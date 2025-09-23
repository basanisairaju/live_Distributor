

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import { api } from '../services/api';
import { Order, Distributor, EnrichedOrderItem, OrderStatus, EnrichedStockTransfer, StockTransferStatus, EnrichedStockTransferItem, UserRole } from '../types';
import { ChevronDown, ChevronRight, Gift, Edit, CheckCircle, XCircle, Search, Download, CornerUpLeft, Trash2, FileText } from 'lucide-react';
import EditOrderModal from './EditOrderModal';
import ReturnOrderModal from './ReturnOrderModal';
import DeleteOrderModal from './DeleteOrderModal';
import { useAuth } from '../hooks/useAuth';
import Input from './common/Input';
import Select from './common/Select';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
// FIX: Corrected the import for 'useNavigate' to resolve the module export error.
import { useNavigate } from 'react-router-dom';
import { generateAndDownloadInvoice } from '../utils/invoiceGenerator';
import { generateAndDownloadDispatchNote } from '../utils/dispatchNoteGenerator';

// Sub-component for showing dispatch items
const TransferDetails: React.FC<{ transferId: string }> = ({ transferId }) => {
    const [items, setItems] = useState<EnrichedStockTransferItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getEnrichedStockTransferItems(transferId).then(data => {
            setItems(data);
            setLoading(false);
        });
    }, [transferId]);

    if (loading) return <div className="p-2 text-sm">Loading items...</div>;

    return (
        <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-content">Dispatched Items</h4>
            <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-md min-w-[500px] text-sm">
                    <thead>
                        <tr className="text-left border-b border-border">
                            <th className="p-2 font-semibold text-contentSecondary">Product</th>
                            <th className="p-2 font-semibold text-contentSecondary text-center">Quantity</th>
                            <th className="p-2 font-semibold text-contentSecondary text-right">Unit Value</th>
                            <th className="p-2 font-semibold text-contentSecondary text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className={`border-b border-border last:border-none ${item.isFreebie ? 'bg-green-50' : ''}`}>
                                <td className="p-2">{item.skuName} {item.isFreebie && <Gift size={12} className="inline ml-1 text-green-700"/>}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-right">{!item.isFreebie ? formatIndianCurrency(item.unitPrice) : 'FREE'}</td>
                                <td className="p-2 font-semibold text-right">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// Sub-component for showing order items
const OrderDetails: React.FC<{ orderId: string }> = ({ orderId }) => {
    const [items, setItems] = useState<EnrichedOrderItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getOrderItems(orderId).then(data => {
            setItems(data);
            setLoading(false);
        });
    }, [orderId]);

    if (loading) return <div className="p-2 text-sm">Loading items...</div>

    return (
        <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-content">Order Items</h4>
            <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-md min-w-[500px] text-sm">
                    <thead>
                        <tr className="text-left border-b border-border">
                            <th className="p-2 font-semibold text-contentSecondary">Product</th>
                            <th className="p-2 font-semibold text-contentSecondary text-center">Delivered</th>
                            <th className="p-2 font-semibold text-contentSecondary text-center">Returned</th>
                            <th className="p-2 font-semibold text-contentSecondary text-right">Unit Price</th>
                            <th className="p-2 font-semibold text-contentSecondary text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className={`border-b border-border last:border-none ${item.isFreebie ? 'bg-green-50' : ''}`}>
                                <td className="p-2">{item.skuName} {item.isFreebie && <Gift size={12} className="inline ml-1 text-green-700"/>}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-center text-red-600">{item.returnedQuantity > 0 ? item.returnedQuantity : '-'}</td>
                                <td className="p-2 text-right">{formatIndianCurrency(item.unitPrice)}</td>
                                <td className="p-2 font-semibold text-right">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const OrderHistory: React.FC = () => {
  const { currentUser, portal } = useAuth();
  const navigate = useNavigate();

  // Common state
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'dispatches'>('orders');

  // Order state
  const [orders, setOrders] = useState<Order[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Dispatch state
  const [transfers, setTransfers] = useState<EnrichedStockTransfer[]>([]);
  const [expandedTransferId, setExpandedTransferId] = useState<string | null>(null);
  const [updatingTransferId, setUpdatingTransferId] = useState<string | null>(null);
  const [dispatchSearchTerm, setDispatchSearchTerm] = useState('');
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState<StockTransferStatus | 'all'>('all');
  const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);

  const getDistributorName = useCallback((id: string) => distributors.find(d => d.id === id)?.name || 'Unknown', [distributors]);

  const fetchData = useCallback(async () => {
    if (!portal) return;
    setLoading(true);
    try {
      const [orderData, distributorData, transferData] = await Promise.all([
        api.getOrders(portal),
        api.getDistributors(portal),
        api.getStockTransfers(),
      ]);
      setOrders(orderData);
      setDistributors(distributorData);
      setTransfers(transferData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showDispatches = currentUser?.role === UserRole.PLANT_ADMIN;

  // Order handlers and memoized data
  const handleMarkOrderDelivered = async (orderId: string) => {
    if (window.confirm("Are you sure you want to mark this order as delivered? It cannot be edited further.")) {
        if (!currentUser) return;
        setUpdatingOrderId(orderId);
        try {
            await api.updateOrderStatus(orderId, OrderStatus.DELIVERED);
            setStatusMessage({ type: 'success', text: `Order ${orderId} has been marked as delivered.`});
            setTimeout(() => setStatusMessage(null), 4000);
            await fetchData();
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to update order. Please try again.' });
        } finally {
            setUpdatingOrderId(null);
        }
    }
  };
  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoiceId(orderId);
    try {
        await generateAndDownloadInvoice(orderId);
    } catch (error) {
        alert(`Failed to download invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setDownloadingInvoiceId(null);
    }
  };
  const toggleOrderExpand = (orderId: string) => !updatingOrderId && setExpandedOrderId(prev => prev === orderId ? null : orderId);
  const filteredOrders = useMemo(() => orders.map(o => ({ ...o, distributorName: getDistributorName(o.distributorId) })).filter(o => (o.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) || o.distributorName.toLowerCase().includes(orderSearchTerm.toLowerCase())) && (orderStatusFilter === 'all' || o.status === orderStatusFilter)), [orders, orderSearchTerm, orderStatusFilter, getDistributorName]);
  const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData(filteredOrders, { key: 'date', direction: 'descending' });
  
  // Dispatch handlers and memoized data
  const handleMarkTransferDelivered = async (transferId: string) => {
    if (window.confirm("Mark this dispatch as delivered? This adds stock to the store's inventory and cannot be undone.")) {
        if (!currentUser) return;
        setUpdatingTransferId(transferId);
        try {
            await api.updateStockTransferStatus(transferId, StockTransferStatus.DELIVERED);
            setStatusMessage({ type: 'success', text: `Dispatch ${transferId} marked as delivered.` });
            setTimeout(() => setStatusMessage(null), 4000);
            await fetchData();
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to update status.' });
        } finally {
            setUpdatingTransferId(null);
        }
    }
  };
  const handleDownloadDispatchNote = async (transferId: string) => {
    setDownloadingNoteId(transferId);
    try {
        await generateAndDownloadDispatchNote(transferId);
    } catch (error) {
        alert(`Failed to download dispatch note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setDownloadingNoteId(null);
    }
  };
  const toggleTransferExpand = (transferId: string) => !updatingTransferId && setExpandedTransferId(prev => prev === transferId ? null : transferId);
  const filteredTransfers = useMemo(() => transfers.filter(t => (t.id.toLowerCase().includes(dispatchSearchTerm.toLowerCase()) || t.destinationStoreName.toLowerCase().includes(dispatchSearchTerm.toLowerCase())) && (dispatchStatusFilter === 'all' || t.status === dispatchStatusFilter)), [transfers, dispatchSearchTerm, dispatchStatusFilter]);
  const { items: sortedTransfers, requestSort: requestTransferSort, sortConfig: transferSortConfig } = useSortableData(filteredTransfers, { key: 'date', direction: 'descending' });
  
  if (loading) {
    return <div className="text-center p-8">Loading history...</div>;
  }
  
  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className={`p-3 rounded-lg flex items-center text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
          {statusMessage.text}
        </div>
      )}
      
      <Card>
        {showDispatches && (
            <div className="border-b border-border mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>Sales Orders</button>
                    <button onClick={() => setActiveTab('dispatches')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'dispatches' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>Stock Dispatches</button>
                </nav>
            </div>
        )}

        {activeTab === 'orders' && (
            <div>
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold">Sales Order History</h2>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <div className="flex-grow sm:max-w-xs">
                            <Input id="search-order" placeholder="Search by ID or Distributor" value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} icon={<Search size={16} />} />
                        </div>
                        <Select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value as any)}>
                            <option value="all">All Statuses</option>
                            <option value={OrderStatus.PENDING}>{OrderStatus.PENDING}</option>
                            <option value={OrderStatus.DELIVERED}>{OrderStatus.DELIVERED}</option>
                        </Select>
                    </div>
                </div>

                {/* Orders Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                     <table className="w-full text-left min-w-[900px] text-sm">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="p-2 w-10"></th>
                                <SortableTableHeader label="Order ID" sortKey="id" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                <SortableTableHeader label="Distributor" sortKey="distributorName" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                <SortableTableHeader label="Date" sortKey="date" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                <SortableTableHeader label="Status" sortKey="status" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                <SortableTableHeader label="Amount" sortKey="totalAmount" requestSort={requestOrderSort} sortConfig={orderSortConfig} className="text-right" />
                                <th className="p-2 font-semibold text-contentSecondary text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.map(o => {
                                const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
                                const isReturnWindowOpen = o.deliveredDate ? (new Date().getTime() - new Date(o.deliveredDate).getTime()) < twoDaysInMs : false;
                                return (
                                <React.Fragment key={o.id}>
                                    <tr className="border-b border-border last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => toggleOrderExpand(o.id)}>
                                        <td className="p-2 text-center"><button className="p-1 rounded-full hover:bg-slate-100"><ChevronRight size={16} className={`transition-transform ${expandedOrderId === o.id ? 'rotate-90' : ''}`} /></button></td>
                                        <td className="p-2 font-mono text-xs">{o.id}</td>
                                        <td className="p-2 font-medium">{o.distributorName}</td>
                                        <td className="p-2">{formatDateDDMMYYYY(o.date)}</td>
                                        <td className="p-2">{o.status === 'Delivered' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Delivered</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</td>
                                        <td className="p-2 font-semibold text-right">{formatIndianCurrency(o.totalAmount)}</td>
                                        <td className="p-2 text-right">
                                            <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                {o.status === 'Pending' ? (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => setEditingOrder(o)} disabled={!!updatingOrderId} title="Edit"><Edit size={14}/></Button>
                                                        <Button size="sm" variant="danger" onClick={() => setDeletingOrder(o)} disabled={!!updatingOrderId} title="Delete"><Trash2 size={14}/></Button>
                                                        <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkOrderDelivered(o.id)} isLoading={updatingOrderId === o.id} disabled={!!updatingOrderId} title="Deliver"><CheckCircle size={14}/></Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => handleDownloadInvoice(o.id)} isLoading={downloadingInvoiceId === o.id} title="Download Invoice"><Download size={14}/></Button>
                                                        <Button size="sm" variant="secondary" onClick={() => setReturningOrder(o)} disabled={!isReturnWindowOpen} title={!isReturnWindowOpen ? 'Return window closed' : 'Initiate Return'}><CornerUpLeft size={14}/></Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedOrderId === o.id && <tr className="bg-slate-100"><td colSpan={7} className="p-0"><div className="p-4"><OrderDetails orderId={o.id} /></div></td></tr>}
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* Orders Mobile View */}
                <div className="md:hidden space-y-4">
                    {sortedOrders.map(o => {
                         const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
                         const isReturnWindowOpen = o.deliveredDate ? (new Date().getTime() - new Date(o.deliveredDate).getTime()) < twoDaysInMs : false;
                        return (
                        <Card key={o.id}>
                            <div className="flex justify-between items-start" onClick={() => toggleOrderExpand(o.id)}>
                                <p className="font-bold">{o.distributorName}</p>
                                <ChevronRight size={20} className={`transition-transform ${expandedOrderId === o.id ? 'rotate-90' : ''}`} />
                            </div>
                            <div className="mt-2 text-sm space-y-2">
                                <div className="flex justify-between items-center"><span className="text-contentSecondary">Order ID</span><span className="font-mono text-xs">{o.id}</span></div>
                                <div className="flex justify-between items-center"><span className="text-contentSecondary">Status</span><span>{o.status === 'Delivered' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Delivered</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</span></div>
                                <div className="flex justify-between items-center"><span className="text-contentSecondary">Amount</span><span className="font-bold">{formatIndianCurrency(o.totalAmount)}</span></div>
                            </div>
                            {expandedOrderId === o.id && <div className="mt-4"><OrderDetails orderId={o.id} /></div>}
                            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-end">
                                {o.status === 'Pending' ? (
                                    <>
                                        <Button size="sm" variant="secondary" onClick={() => setEditingOrder(o)} disabled={!!updatingOrderId} title="Edit"><Edit size={14}/></Button>
                                        <Button size="sm" variant="danger" onClick={() => setDeletingOrder(o)} disabled={!!updatingOrderId} title="Delete"><Trash2 size={14}/></Button>
                                        <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkOrderDelivered(o.id)} isLoading={updatingOrderId === o.id} disabled={!!updatingOrderId} title="Deliver"><CheckCircle size={14}/></Button>
                                    </>
                                ) : (
                                    <>
                                        <Button size="sm" variant="secondary" onClick={() => handleDownloadInvoice(o.id)} isLoading={downloadingInvoiceId === o.id} title="Download Invoice"><Download size={14}/></Button>
                                        <Button size="sm" variant="secondary" onClick={() => setReturningOrder(o)} disabled={!isReturnWindowOpen} title={!isReturnWindowOpen ? 'Return window closed' : 'Initiate Return'}><CornerUpLeft size={14}/></Button>
                                    </>
                                )}
                            </div>
                        </Card>
                    )})}
                </div>

                {sortedOrders.length === 0 && <p className="text-center p-6 text-contentSecondary">No orders found.</p>}
            </div>
        )}
        
        {activeTab === 'dispatches' && (
            <div>
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold">Stock Dispatch History</h2>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <div className="flex-grow sm:max-w-xs">
                             <Input id="search-dispatch" placeholder="Search by ID or Store" value={dispatchSearchTerm} onChange={(e) => setDispatchSearchTerm(e.target.value)} icon={<Search size={16} />} />
                        </div>
                        <Select value={dispatchStatusFilter} onChange={(e) => setDispatchStatusFilter(e.target.value as any)}>
                            <option value="all">All Statuses</option>
                            <option value={StockTransferStatus.PENDING}>{StockTransferStatus.PENDING}</option>
                            <option value={StockTransferStatus.DELIVERED}>{StockTransferStatus.DELIVERED}</option>
                        </Select>
                    </div>
                </div>
                 {/* Dispatches Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                     <table className="w-full text-left min-w-[900px] text-sm">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="p-2 w-10"></th>
                                <SortableTableHeader label="Dispatch ID" sortKey="id" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Destination Store" sortKey="destinationStoreName" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Date" sortKey="date" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Status" sortKey="status" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Total Value" sortKey="totalValue" requestSort={requestTransferSort} sortConfig={transferSortConfig} className="text-right" />
                                <th className="p-2 font-semibold text-contentSecondary text-right">Actions</th>
                            </tr>
                        </thead>
                         <tbody>
                            {sortedTransfers.map(t => (
                                <React.Fragment key={t.id}>
                                    <tr className="border-b border-border last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => toggleTransferExpand(t.id)}>
                                        <td className="p-2 text-center"><button className="p-1 rounded-full hover:bg-slate-100"><ChevronRight size={16} className={`transition-transform ${expandedTransferId === t.id ? 'rotate-90' : ''}`} /></button></td>
                                        <td className="p-2 font-mono text-xs">{t.id}</td>
                                        <td className="p-2 font-medium">{t.destinationStoreName}</td>
                                        <td className="p-2">{formatDateDDMMYYYY(t.date)}</td>
                                        <td className="p-2">{t.status === 'Delivered' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Delivered</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</td>
                                        <td className="p-2 font-semibold text-right">{formatIndianCurrency(t.totalValue)}</td>
                                        <td className="p-2 text-right">
                                            <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                {t.status === 'Pending' ? (
                                                    <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkTransferDelivered(t.id)} isLoading={updatingTransferId === t.id} disabled={!!updatingTransferId} title="Mark Delivered"><CheckCircle size={14}/></Button>
                                                ) : (
                                                    <Button size="sm" variant="secondary" onClick={() => handleDownloadDispatchNote(t.id)} isLoading={downloadingNoteId === t.id} title="Download Note"><FileText size={14}/></Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                     {expandedTransferId === t.id && <tr className="bg-slate-100"><td colSpan={7} className="p-0"><div className="p-4"><TransferDetails transferId={t.id} /></div></td></tr>}
                                </React.Fragment>
                            ))}
                        </tbody>
                     </table>
                </div>

                 {/* Dispatches Mobile View */}
                 <div className="md:hidden space-y-4">
                    {sortedTransfers.map(t => (
                        <Card key={t.id}>
                            <div className="flex justify-between items-start" onClick={() => toggleTransferExpand(t.id)}>
                                <p className="font-bold">{t.destinationStoreName}</p>
                                <ChevronRight size={20} className={`transition-transform ${expandedTransferId === t.id ? 'rotate-90' : ''}`} />
                            </div>
                             <div className="mt-2 text-sm space-y-2">
                                <div className="flex justify-between items-center"><span className="text-contentSecondary">Dispatch ID</span><span className="font-mono text-xs">{t.id}</span></div>
                                <div className="flex justify-between items-center"><span className="text-contentSecondary">Status</span><span>{t.status === 'Delivered' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Delivered</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</span></div>
                                <div className="flex justify-between items-center"><span className="text-contentSecondary">Value</span><span className="font-bold">{formatIndianCurrency(t.totalValue)}</span></div>
                            </div>
                            {expandedTransferId === t.id && <div className="mt-4"><TransferDetails transferId={t.id} /></div>}
                            <div className="mt-4 pt-4 border-t flex justify-end">
                                {t.status === 'Pending' ? (
                                    <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkTransferDelivered(t.id)} isLoading={updatingTransferId === t.id} disabled={!!updatingTransferId} title="Mark Delivered"><CheckCircle size={14}/></Button>
                                ) : (
                                    <Button size="sm" variant="secondary" onClick={() => handleDownloadDispatchNote(t.id)} isLoading={downloadingNoteId === t.id} title="Download Note"><FileText size={14}/></Button>
                                )}
                            </div>
                        </Card>
                    ))}
                 </div>
                 {sortedTransfers.length === 0 && <p className="text-center p-6 text-contentSecondary">No dispatches found.</p>}
            </div>
        )}
      </Card>
      
      {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={() => { setEditingOrder(null); fetchData(); }} />}
      {deletingOrder && <DeleteOrderModal order={deletingOrder} onClose={() => setDeletingOrder(null)} onConfirm={() => { setDeletingOrder(null); fetchData(); setStatusMessage({ type: 'success', text: `Order ${deletingOrder.id} has been deleted.` }); }} />}
      {returningOrder && <ReturnOrderModal order={returningOrder} onClose={() => setReturningOrder(null)} onSave={() => { setReturningOrder(null); fetchData(); }} />}
    </div>
  );
};

export default OrderHistory;
