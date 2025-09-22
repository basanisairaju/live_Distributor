import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Distributor, Order, OrderStatus, EnrichedStockItem, Store } from '../types';
import Card from './common/Card';
import { DollarSign, Search, Users, Package, CheckCircle, Warehouse, Store as StoreIcon, TrendingUp, Calendar, Building, Landmark } from 'lucide-react';
import Input from './common/Input';
import { formatIndianCurrency, formatIndianNumber, formatDateDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { portal } = useAuth();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [plantStock, setPlantStock] = useState<EnrichedStockItem[]>([]);
  const [storeStock, setStoreStock] = useState<EnrichedStockItem[]>([]);
  const [portalStockItems, setPortalStockItems] = useState<EnrichedStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!portal) return;
      setLoading(true);
      try {
        const stockLocationId = portal.type === 'plant' ? 'plant' : portal.id!;

        const [distributorData, orderData, portalStockData, storesData] = await Promise.all([
            api.getDistributors(portal),
            api.getOrders(portal),
            api.getStock(stockLocationId),
            api.getStores(),
        ]);

        setDistributors(distributorData);
        setOrders(orderData);
        setPortalStockItems(portalStockData);
        setStores(storesData);

        if (portal.type === 'plant') {
            setPlantStock(portalStockData);
            const storeStockPromises = storesData.map(store => api.getStock(store.id));
            const allStoreStockArrays = await Promise.all(storeStockPromises);
            setStoreStock(allStoreStockArrays.flat());
        }

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [portal]);

  const totalSales = orders
    .filter(o => o.status === OrderStatus.DELIVERED)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const totalDistributors = distributors.length;
  
  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING).length;
  
  const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  const totalPlantStockUnits = useMemo(() =>
    plantStock.reduce((sum, item) => sum + item.quantity, 0),
    [plantStock]
  );

  const totalStoreStockUnits = useMemo(() =>
    storeStock.reduce((sum, item) => sum + item.quantity, 0),
    [storeStock]
  );
  
  const storeMap = useMemo(() => new Map(stores.map(s => [s.id, s.name])), [stores]);

  const distributorSnapshots = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return distributors.map(d => {
        const distOrders = orders
            .filter(o => o.distributorId === d.id && o.status === OrderStatus.DELIVERED)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const salesLast30Days = distOrders
            .filter(o => new Date(o.date) >= thirtyDaysAgo)
            .reduce((sum, o) => sum + o.totalAmount, 0);
        
        const lastOrderDate = distOrders.length > 0 ? distOrders[0].date : null;
        
        const assignment = d.storeId ? storeMap.get(d.storeId) || 'Unknown Store' : 'Plant';
        const availableFunds = d.walletBalance + d.creditLimit;

        return {
            ...d,
            lastOrderDate,
            salesLast30Days,
            assignment,
            availableFunds,
        };
    });
  }, [distributors, orders, storeMap]);


  const filteredDistributors = useMemo(() => distributorSnapshots.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.asmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.executiveName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.assignment.toLowerCase().includes(searchTerm.toLowerCase())
  ), [distributorSnapshots, searchTerm]);
  
  const { items: sortedDistributors, requestSort, sortConfig } = useSortableData(filteredDistributors, { key: 'name', direction: 'ascending' });
  
  // FIX: Added a calculated 'available' property to stock items for correct sorting.
  const portalStockItemsWithAvailable = useMemo(() => portalStockItems.map(item => ({
      ...item,
      available: item.quantity - item.reserved,
  })), [portalStockItems]);

  const { items: sortedStock, requestSort: requestStockSort, sortConfig: stockSortConfig } = useSortableData(portalStockItemsWithAvailable, { key: 'skuName', direction: 'ascending' });


  if (loading) {
    return <div className="flex justify-center items-center h-full"><p>Loading dashboard...</p></div>;
  }
  
  const renderAvailableFunds = (distributor: (typeof sortedDistributors)[0]) => {
      const availableFunds = distributor.availableFunds;
      const totalCredit = distributor.walletBalance > 0 ? distributor.walletBalance + distributor.creditLimit : distributor.creditLimit > 0 ? distributor.creditLimit : 1;
      
      const percentage = Math.max(0, Math.min(100, (availableFunds / totalCredit) * 100));

      let barColorClass = 'bg-green-500';
      if (distributor.walletBalance <= 0) {
          barColorClass = 'bg-yellow-500';
      }
      if (availableFunds <= 0) {
          barColorClass = 'bg-red-500';
      }

      return (
          <div className="w-full">
              <div className="w-full bg-slate-200 rounded-full h-2 my-1" title={`Wallet: ${formatIndianCurrency(distributor.walletBalance)} | Credit: ${formatIndianCurrency(distributor.creditLimit)}`}>
                  <div className={`${barColorClass} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
              </div>
              <span className={`font-semibold ${availableFunds < 0 ? 'text-red-600' : 'text-content'}`}>
                  {formatIndianCurrency(availableFunds)}
              </span>
          </div>
      );
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary mr-4">
              <DollarSign />
            </div>
            <div>
              <p className="text-sm font-medium text-contentSecondary">Total Sales (Delivered)</p>
              <p className="text-2xl font-bold">{formatIndianCurrency(totalSales)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-500/10 text-green-600 mr-4">
              <Users />
            </div>
            <div>
              <p className="text-sm font-medium text-contentSecondary">Active Distributors</p>
              <p className="text-2xl font-bold">{totalDistributors}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-600 mr-4">
              <Package />
            </div>
            <div>
              <p className="text-sm font-medium text-contentSecondary">Pending Orders</p>
              <p className="text-2xl font-bold">{pendingOrders}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-600 mr-4">
              <CheckCircle />
            </div>
            <div>
              <p className="text-sm font-medium text-contentSecondary">Delivered Orders</p>
              <p className="text-2xl font-bold">{deliveredOrders}</p>
            </div>
          </div>
        </Card>
        {portal?.type === 'plant' && (
          <>
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-600 mr-4">
                  <Warehouse />
                </div>
                <div>
                  <p className="text-sm font-medium text-contentSecondary">Plant Stock (Total Units)</p>
                  <p className="text-2xl font-bold">{formatIndianNumber(totalPlantStockUnits)}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-500/10 text-purple-600 mr-4">
                  <StoreIcon />
                </div>
                <div>
                  <p className="text-sm font-medium text-contentSecondary">Stores Stock (Total Units)</p>
                  <p className="text-2xl font-bold">{formatIndianNumber(totalStoreStockUnits)}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h3 className="text-lg font-semibold text-content">Distributor Snapshot</h3>
          <div className="w-full sm:w-auto sm:max-w-xs">
            <Input
              id="search-distributor"
              placeholder="Search distributors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left min-w-[1400px] text-sm">
            <thead className="bg-slate-100">
              <tr>
                <SortableTableHeader label="Distributor" sortKey="name" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableTableHeader label="Location" sortKey="area" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableTableHeader label="Assigned To" sortKey="assignment" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableTableHeader label="Wallet Balance" sortKey="walletBalance" requestSort={requestSort} sortConfig={sortConfig} className="text-right" />
                <SortableTableHeader label="Available Funds" sortKey="availableFunds" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableTableHeader label="Last Order" sortKey="lastOrderDate" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableTableHeader label="Sales (30d)" sortKey="salesLast30Days" requestSort={requestSort} sortConfig={sortConfig} className="text-right" />
                <SortableTableHeader label="Sales Team" sortKey="asmName" requestSort={requestSort} sortConfig={sortConfig} />
              </tr>
            </thead>
            <tbody>
              {sortedDistributors.map(d => (
                <tr key={d.id} onClick={() => navigate(`/distributors/${d.id}`)} className="border-b border-border last:border-b-0 hover:bg-slate-50 cursor-pointer">
                  <td className="p-3">
                    <p className="font-semibold text-primary hover:underline">{d.name}</p>
                    <p className="font-mono text-xs text-contentSecondary">{d.id}</p>
                  </td>
                  <td className="p-3 text-content">{d.area}, {d.state}</td>
                  <td className="p-3 text-content">
                    <span className="flex items-center gap-2">
                        {d.storeId ? <Building size={14} className="text-contentSecondary"/> : <Landmark size={14} className="text-contentSecondary"/>}
                        {d.assignment}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-semibold ${d.walletBalance < 0 ? 'text-red-600' : 'text-content'}`}>
                    {formatIndianCurrency(d.walletBalance)}
                  </td>
                  <td className="p-3 min-w-[150px]">
                      {renderAvailableFunds(d)}
                  </td>
                  <td className="p-3 text-content">
                      {d.lastOrderDate ? (
                          <span className="flex items-center gap-2">
                              <Calendar size={14} className="text-contentSecondary"/> {formatDateDDMMYYYY(d.lastOrderDate)}
                          </span>
                      ) : (
                          <span className="text-contentSecondary">No orders yet</span>
                      )}
                  </td>
                  <td className="p-3 text-right">
                      <span className="font-semibold flex items-center justify-end gap-2">
                          <TrendingUp size={14} className="text-primary"/> {formatIndianCurrency(d.salesLast30Days)}
                      </span>
                  </td>
                  <td className="p-3 text-content">
                      <p>ASM: <span className="font-medium">{d.asmName}</span></p>
                      <p className="text-xs">Exec: <span className="font-medium">{d.executiveName}</span></p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
            {sortedDistributors.map(d => (
                <Card key={d.id} className="cursor-pointer" onClick={() => navigate(`/distributors/${d.id}`)}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-primary">{d.name}</p>
                            <p className="font-mono text-xs text-contentSecondary">{d.id}</p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                        <div>
                            <p className="text-xs font-semibold text-contentSecondary">Available Funds</p>
                            {renderAvailableFunds(d)}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                                <p className="text-xs font-semibold text-contentSecondary">Last Order</p>
                                <p className="text-content">{d.lastOrderDate ? formatDateDDMMYYYY(d.lastOrderDate) : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-contentSecondary">Sales (30d)</p>
                                <p className="font-semibold text-content">{formatIndianCurrency(d.salesLast30Days)}</p>
                            </div>
                             <div>
                                <p className="text-xs font-semibold text-contentSecondary">Location</p>
                                <p className="text-content">{d.area}, {d.state}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-contentSecondary">Assigned To</p>
                                <p className="text-content">{d.assignment}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>

        {sortedDistributors.length === 0 && (
          <div className="text-center p-6 text-contentSecondary">
            <p>No distributors found for "{searchTerm}".</p>
          </div>
        )}
      </Card>
      
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-content flex items-center gap-2">
            <Package size={20} />
            {portal?.name} Stock Inventory
          </h3>
        </div>
        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <SortableTableHeader label="Product Name" sortKey="skuName" requestSort={requestStockSort} sortConfig={stockSortConfig} />
                <SortableTableHeader label="Quantity on Hand" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                <SortableTableHeader label="Reserved" sortKey="reserved" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                {/* FIX: Changed sortKey to 'available' and removed 'as any' casts to fix TypeScript error and enable correct sorting. */}
                <SortableTableHeader label="Available" sortKey="available" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
              </tr>
            </thead>
            <tbody>
              {sortedStock.map(item => (
                <tr key={item.skuId} className="border-b border-border last:border-b-0">
                  <td className="p-3 font-medium text-content">{item.skuName}</td>
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
        
        {sortedStock.length === 0 && (
          <div className="text-center p-6 text-contentSecondary">
            <p>No stock items found for this location.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
