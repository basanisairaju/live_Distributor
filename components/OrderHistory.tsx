
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
            await api.updateOrderStatus(orderId, OrderStatus.DELIVERED, currentUser.username);
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
            await api.updateStockTransferStatus(transferId, StockTransferStatus.DELIVERED, currentUser.username);
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
  
  // Common UI helpers
  const getOrderStatusChip = (status: OrderStatus) => status === OrderStatus.DELIVERED ? <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">{status}</span> : <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">{status}</span>;
  const getTransferStatusChip = (status: StockTransferStatus) => status === StockTransferStatus.DELIVERED ? <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">{status}</span> : <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">{status}</span>;
  
  const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;

  return (
    <>
      {statusMessage && (
        <div className={`mb-4 flex items-center p-3 rounded-lg text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
            {statusMessage.text}
        </div>
      )}
      <Card>
        <div className="border-b border-border">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setActiveTab('orders')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                    Distributor Orders
                </button>
                {showDispatches && (
                    <button onClick={() => setActiveTab('dispatches')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'dispatches' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                        Store Dispatches
                    </button>
                )}
            </nav>
        </div>
        
        {activeTab === 'orders' && (
            <div className="pt-4">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Distributor Order History</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                        <Select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value as any)}><option value="all">All Statuses</option><option value={OrderStatus.PENDING}>Pending</option><option value={OrderStatus.DELIVERED}>Delivered</option></Select>
                        <Input placeholder="Search by Order ID or Name..." value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} icon={<Search size={16} />} />
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-left min-w-[700px] text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 w-12"></th>
                        <SortableTableHeader label="Order ID" sortKey="id" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                        <SortableTableHeader label="Distributor" sortKey="distributorName" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                        <SortableTableHeader label="Date" sortKey="date" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                        <SortableTableHeader label="Status" sortKey="status" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                        <SortableTableHeader label="Total Amount" sortKey="totalAmount" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                        <th className="p-3 font-semibold text-contentSecondary">Invoice</th>
                        <th className="p-3 font-semibold text-contentSecondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOrders.map(order => {
                        const isReturnWindowOpen = order.deliveredDate ? (new Date().getTime() - new Date(order.deliveredDate).getTime()) < twoDaysInMs : false;
                        return (
                        <React.Fragment key={order.id}>
                          <tr className="border-b border-border last:border-b-0">
                            <td className="p-3 text-center"><button onClick={() => toggleOrderExpand(order.id)} className="hover:bg-slate-100 rounded-full p-1 disabled:opacity-50" disabled={!!updatingOrderId}><ChevronRight size={16} className={`transition-transform ${expandedOrderId === order.id ? 'rotate-90' : ''}`} /></button></td>
                            <td className="p-3 font-mono text-xs">{order.id}</td>
                            <td className="p-3 font-medium">{order.distributorName}</td>
                            <td className="p-3">{formatDateDDMMYYYY(order.date)}</td>
                            <td className="p-3">{getOrderStatusChip(order.status)}</td>
                            <td className="p-3 font-semibold">{formatIndianCurrency(order.totalAmount)}</td>
                            <td className="p-3">
                                {order.status === OrderStatus.DELIVERED && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => navigate(`/invoice/${order.id}`)} title="View Invoice"><FileText size={14}/> View</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleDownloadInvoice(order.id)} isLoading={downloadingInvoiceId === order.id} title="Download Invoice PDF"><Download size={14}/> Download</Button>
                                    </div>
                                )}
                            </td>
                            <td className="p-3">
                                {order.status === OrderStatus.PENDING && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => setEditingOrder(order)} disabled={!!updatingOrderId}><Edit size={14}/> Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => setDeletingOrder(order)} disabled={!!updatingOrderId}><Trash2 size={14}/> Delete</Button>
                                        <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMarkOrderDelivered(order.id)} isLoading={updatingOrderId === order.id} disabled={!!updatingOrderId}><CheckCircle size={14}/> Deliver</Button>
                                    </div>
                                )}
                                {order.status === OrderStatus.DELIVERED && (
                                    <Button size="sm" variant="secondary" onClick={() => setReturningOrder(order)} disabled={!isReturnWindowOpen} title={!isReturnWindowOpen ? 'Return window is closed (2 days after delivery)' : 'Initiate a return'}><CornerUpLeft size={14}/> Return</Button>
                                )}
                            </td>
                          </tr>
                          {expandedOrderId === order.id && <tr className="bg-slate-50"><td colSpan={8} className="p-0"><div className="p-4"><OrderDetails orderId={order.id} /></div></td></tr>}
                        </React.Fragment>
                      )})}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedOrders.map(order => {
                         const isReturnWindowOpen = order.deliveredDate ? (new Date().getTime() - new Date(order.deliveredDate).getTime()) < twoDaysInMs : false;
                         return (
                            <Card key={order.id}>
                                <div className="flex justify-between items-start" onClick={() => toggleOrderExpand(order.id)}>
                                    <div>
                                        <p className="font-bold text-content">{order.distributorName}</p>
                                        <p className="font-mono text-xs text-contentSecondary">{order.id}</p>
                                    </div>
                                    <ChevronRight size={20} className={`transition-transform ${expandedOrderId === order.id ? 'rotate-90' : ''}`} />
                                </div>
                                <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-contentSecondary">Date:</span>
                                        <span className="font-medium">{formatDateDDMMYYYY(order.date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-contentSecondary">Status:</span>
                                        {getOrderStatusChip(order.status)}
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-contentSecondary">Amount:</span>
                                        <span className="font-bold">{formatIndianCurrency(order.totalAmount)}</span>
                                    </div>
                                </div>
                                {expandedOrderId === order.id && <div className="mt-4"><OrderDetails orderId={order.id} /></div>}
                                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-end">
                                    {order.status === OrderStatus.PENDING && (
                                        <>
                                            <Button size="sm" variant="secondary" onClick={() => setEditingOrder(order)} disabled={!!updatingOrderId}><Edit size={14}/> Edit</Button>
                                            <Button size="sm" variant="danger" onClick={() => setDeletingOrder(order)} disabled={!!updatingOrderId}><Trash2 size={14}/> Delete</Button>
                                            <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMarkOrderDelivered(order.id)} isLoading={updatingOrderId === order.id} disabled={!!updatingOrderId}><CheckCircle size={14}/> Deliver</Button>
                                        </>
                                    )}
                                    {order.status === OrderStatus.DELIVERED && (
                                        <>
                                            <Button size="sm" variant="secondary" onClick={() => navigate(`/invoice/${order.id}`)} title="View Invoice"><FileText size={14}/></Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleDownloadInvoice(order.id)} isLoading={downloadingInvoiceId === order.id} title="Download Invoice PDF"><Download size={14}/></Button>
                                            <Button size="sm" variant="secondary" onClick={() => setReturningOrder(order)} disabled={!isReturnWindowOpen} title={!isReturnWindowOpen ? 'Return window is closed' : 'Initiate a return'}><CornerUpLeft size={14}/> Return</Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                         )
                    })}
                </div>

                {loading ? <p className="text-center p-4">Loading...</p> : sortedOrders.length === 0 && <p className="text-center p-4 text-contentSecondary">No orders found.</p>}
            </div>
        )}

        {showDispatches && activeTab === 'dispatches' && (
            <div className="pt-4">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Store Dispatch History</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                        <Select value={dispatchStatusFilter} onChange={(e) => setDispatchStatusFilter(e.target.value as any)}><option value="all">All Statuses</option><option value={StockTransferStatus.PENDING}>Pending</option><option value={StockTransferStatus.DELIVERED}>Delivered</option></Select>
                        <Input placeholder="Search by ID or Store..." value={dispatchSearchTerm} onChange={(e) => setDispatchSearchTerm(e.target.value)} icon={<Search size={16} />} />
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left min-w-[700px] text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-3 w-12"></th>
                                <SortableTableHeader label="Dispatch ID" sortKey="id" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Destination Store" sortKey="destinationStoreName" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Date" sortKey="date" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Status" sortKey="status" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <SortableTableHeader label="Total Value" sortKey="totalValue" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                <th className="p-3 font-semibold text-contentSecondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTransfers.map(transfer => (
                                <React.Fragment key={transfer.id}>
                                    <tr className="border-b border-border last:border-b-0">
                                        <td className="p-3 text-center"><button onClick={() => toggleTransferExpand(transfer.id)} className="hover:bg-slate-100 rounded-full p-1 disabled:opacity-50" disabled={!!updatingTransferId}><ChevronRight size={16} className={`transition-transform ${expandedTransferId === transfer.id ? 'rotate-90' : ''}`} /></button></td>
                                        <td className="p-3 font-mono text-xs">{transfer.id}</td>
                                        <td className="p-3 font-medium">{transfer.destinationStoreName}</td>
                                        <td className="p-3">{formatDateDDMMYYYY(transfer.date)}</td>
                                        <td className="p-3">{getTransferStatusChip(transfer.status)}</td>
                                        <td className="p-3 font-semibold">{formatIndianCurrency(transfer.totalValue)}</td>
                                        <td className="p-3">
                                            {transfer.status === StockTransferStatus.PENDING && (
                                                <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkTransferDelivered(transfer.id)} isLoading={updatingTransferId === transfer.id} disabled={!!updatingTransferId}><CheckCircle size={14} /> Deliver</Button>
                                            )}
                                            {transfer.status === StockTransferStatus.DELIVERED && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => navigate(`/dispatch-note/${transfer.id}`)} title="View Note"><FileText size={14} /> View</Button>
                                                    <Button size="sm" variant="secondary" onClick={() => handleDownloadDispatchNote(transfer.id)} isLoading={downloadingNoteId === transfer.id} title="Download Note"><Download size={14} /> Download</Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedTransferId === transfer.id && <tr className="bg-slate-50"><td colSpan={7} className="p-0"><div className="p-4"><TransferDetails transferId={transfer.id} /></div></td></tr>}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedTransfers.map(transfer => (
                        <Card key={transfer.id}>
                            <div className="flex justify-between items-start" onClick={() => toggleTransferExpand(transfer.id)}>
                                <div>
                                    <p className="font-bold text-content">{transfer.destinationStoreName}</p>
                                    <p className="font-mono text-xs text-contentSecondary">{transfer.id}</p>
                                </div>
                                <ChevronRight size={20} className={`transition-transform ${expandedTransferId === transfer.id ? 'rotate-90' : ''}`} />
                            </div>
                             <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Date:</span>
                                    <span className="font-medium">{formatDateDDMMYYYY(transfer.date)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Status:</span>
                                    {getTransferStatusChip(transfer.status)}
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Value:</span>
                                    <span className="font-bold">{formatIndianCurrency(transfer.totalValue)}</span>
                                </div>
                            </div>
                            {expandedTransferId === transfer.id && <div className="mt-4"><TransferDetails transferId={transfer.id} /></div>}
                            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-end">
                                {transfer.status === StockTransferStatus.PENDING && (
                                    <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkTransferDelivered(transfer.id)} isLoading={updatingTransferId === transfer.id} disabled={!!updatingTransferId}><CheckCircle size={14} /> Deliver</Button>
                                )}
                                {transfer.status === StockTransferStatus.DELIVERED && (
                                    <>
                                        <Button size="sm" variant="secondary" onClick={() => navigate(`/dispatch-note/${transfer.id}`)} title="View Note"><FileText size={14} /> View</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleDownloadDispatchNote(transfer.id)} isLoading={downloadingNoteId === transfer.id} title="Download Note"><Download size={14} /> Download</Button>
                                    </>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                {loading ? <p className="text-center p-4">Loading...</p> : sortedTransfers.length === 0 && <p className="text-center p-4 text-contentSecondary">No dispatches found.</p>}
            </div>
        )}
      </Card>

      {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={() => { setEditingOrder(null); fetchData(); }} />}
      {deletingOrder && <DeleteOrderModal order={deletingOrder} onClose={() => setDeletingOrder(null)} onConfirm={() => { setDeletingOrder(null); fetchData(); setStatusMessage({ type: 'success', text: `Order ${deletingOrder.id} has been deleted.` }); setTimeout(() => setStatusMessage(null), 4000); }} />}
      {returningOrder && <ReturnOrderModal order={returningOrder} onClose={() => setReturningOrder(null)} onSave={() => { setReturningOrder(null); fetchData(); }} />}
    </>
  );
};

export default OrderHistory;
