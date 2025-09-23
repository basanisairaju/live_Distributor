

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Order, Distributor, OrderStatus, OrderItem, SKU, Scheme, User, UserRole } from '../types';
import Card from './common/Card';
import Select from './common/Select';
import { DollarSign, Package, Gift, Download, TrendingUp, BarChart, Table, UserCheck, Users, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import DateRangePicker from './common/DateRangePicker';
import Button from './common/Button';
import { ResponsiveContainer, LineChart, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Bar } from 'recharts';
import { formatIndianCurrency, formatIndianNumber, formatIndianCurrencyShort, formatDateDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    iconBgClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBgClass }) => (
    <Card>
        <div className="flex items-center">
            <div className={`p-3 rounded-full ${iconBgClass} mr-4`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-contentSecondary">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    </Card>
);

type ChartGranularity = 'daily' | 'monthly' | 'quarterly' | 'yearly';

const CustomStateTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const total = data.value;
        return (
            <div className="bg-white p-3 border rounded-lg shadow-lg text-sm max-w-xs">
                <p className="font-bold mb-2 text-content">{label}: {formatIndianCurrency(total)}</p>
                <div className="space-y-1">
                    {/* FIX: Explicitly typed 'area' to resolve property access errors. */}
                    {data.areas.slice(0, 5).map((area: { name: string; value: number; }) => (
                        <div key={area.name} className="flex justify-between items-center text-contentSecondary">
                            <span>{area.name}</span>
                            <span className="ml-4 font-medium text-content">({((area.value / total) * 100).toFixed(1)}%)</span>
                        </div>
                    ))}
                    {data.areas.length > 5 && <p className="text-xs text-contentSecondary mt-1">...and {data.areas.length - 5} more</p>}
                </div>
            </div>
        );
    }
    return null;
};

const CustomSalesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-card p-3 border rounded-lg shadow-lg text-sm">
                <p className="font-bold mb-1 text-content">{label.includes('-') ? formatDateDDMMYYYY(label) : label}</p>
                {payload.map((pld: any) => (
                    <p key={pld.name} style={{ color: pld.stroke || pld.fill }}>
                        {`${pld.name}: ${formatIndianCurrency(pld.value)}`}
                    </p>
                ))}
                {data.quantity > 0 && <p className="text-contentSecondary text-xs mt-1">Units Sold: {formatIndianNumber(data.quantity)}</p>}
                {data.orderCount > 0 && <p className="text-contentSecondary text-xs mt-1">from {data.orderCount} order(s)</p>}
            </div>
        );
    }
    return null;
};

const CustomProductTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-card p-3 border rounded-lg shadow-lg text-sm">
                <p className="font-bold mb-1 text-content">{label}</p>
                <p className="text-blue-600">Paid Units: {formatIndianNumber(data.paid)}</p>
                <p className="text-green-600">Free Units: {formatIndianNumber(data.free)}</p>
                <div className="mt-2 pt-2 border-t">
                    <p className="font-semibold text-content">Sales Value: {formatIndianCurrency(data.salesValue)}</p>
                </div>
            </div>
        );
    }
    return null;
};


const EXEC_COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
    '#a4de6c', '#d0ed57', '#8dd1e1', '#83a6ed', '#8e44ad', '#16a085', '#f1c40f',
    '#e67e22', '#e74c3c', '#3498db', '#2ecc71'
];

const CustomExecutiveTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const chartData = payload[0].payload;
        return (
            <div className="bg-card p-3 border rounded-lg shadow-lg text-sm max-w-xs">
                <p className="font-bold mb-2 text-content">{label}</p>
                <ul className="space-y-1">
                    {payload.sort((a:any, b:any) => b.value - a.value).map((entry: any) => {
                        const execName = entry.name;
                        const qty = chartData[`${execName}_qty`];
                        return (
                            <li key={entry.dataKey} className="flex justify-between items-center">
                                <span className="flex items-center">
                                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                    {execName}
                                </span>
                                <span className="font-semibold ml-4">
                                    {formatIndianCurrency(entry.value)}
                                    {qty > 0 && <span className="text-xs font-normal text-contentSecondary ml-1">({formatIndianNumber(qty)} units)</span>}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }
    // FIX: A custom tooltip component must return a valid ReactNode. Returning null when not active is the standard practice.
    return null;
};

// FIX: Added a type for distributor sales data to fix type errors.
interface DistributorSale {
    distributorId: string;
    distributorName: string;
    walletBalance: number;
    frequency: number;
    totalWithGst: number;
    [key: string]: string | number;
}


const SalesPage: React.FC = () => {
    const { portal } = useAuth();
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [allOrderItems, setAllOrderItems] = useState<OrderItem[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [loading, setLoading] = useState(true);
    
    const getInitialDateRange = () => {
        const to = new Date();
        const from = new Date(to.getFullYear(), to.getMonth(), 1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        return { from, to };
    };

    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>(getInitialDateRange());
    
    const [selectedDistributorId, setSelectedDistributorId] = useState<string>('all');
    const [selectedAsmName, setSelectedAsmName] = useState<string>('all');
    const [selectedState, setSelectedState] = useState<string>('all');
    const [selectedArea, setSelectedArea] = useState<string>('all');
    const [selectedSchemeId, setSelectedSchemeId] = useState<string>('all');
    const [selectedSkuId, setSelectedSkuId] = useState<string>('all');
    const [topProductsCount, setTopProductsCount] = useState<5 | 10>(5);
    const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('daily');
    const [expandedDistributor, setExpandedDistributor] = useState<string | null>(null);
    const [showAov, setShowAov] = useState<boolean>(false);


    useEffect(() => {
        const fetchData = async () => {
            if (!portal) return;
            setLoading(true);
            try {
                const [orderData, distributorData, skuData, orderItemData, schemeData] = await Promise.all([
                    api.getOrders(portal),
                    api.getDistributors(portal),
                    api.getSKUs(),
                    api.getAllOrderItems(portal),
                    api.getSchemes(portal),
                ]);
                setOrders(orderData);
                setDistributors(distributorData);
                setSkus(skuData);
                setAllOrderItems(orderItemData);
                setSchemes(schemeData);
            } catch (error) {
                console.error("Failed to fetch sales data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [portal]);

    const uniqueAsmNames = useMemo(() => [...new Set(distributors.map(d => d.asmName))].sort(), [distributors]);

    const uniqueStates = useMemo(() => [...new Set(distributors.map(d => d.state))].sort(), [distributors]);

    const availableDistributors = useMemo(() => {
        return distributors.filter(d => selectedAsmName === 'all' || d.asmName === selectedAsmName);
    }, [distributors, selectedAsmName]);

    const availableAreas = useMemo(() => {
        const relevantDistributors = distributors.filter(d => 
            (selectedAsmName === 'all' || d.asmName === selectedAsmName) &&
            (selectedState === 'all' || d.state === selectedState)
        );
        return [...new Set(relevantDistributors.map(d => d.area))].sort();
    }, [distributors, selectedState, selectedAsmName]);

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedState(e.target.value);
        setSelectedArea('all');
    };
    
    const handleAsmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAsmName(e.target.value);
        setSelectedDistributorId('all');
        setSelectedState('all');
        setSelectedArea('all');
    };

    const salesData = useMemo(() => {
        const initialResult = {
            totalSalesValue: 0,
            distributorSales: [] as DistributorSale[],
            totalPaidQty: 0,
            totalFreeQty: 0,
            salesTrendData: [] as any[],
            topProductsData: [] as any[],
            salesByStateData: [] as any[],
            salesByExecutiveChartData: [] as any[],
            uniqueExecutives: [] as string[],
        };

        const { from, to } = dateRange;
        if (!from || !to) return initialResult;

        const start = from;
        start.setHours(0, 0, 0, 0);
        const end = to;
        end.setHours(23, 59, 59, 999);
        
        const itemsFilteredByProduct = selectedSkuId === 'all'
            ? allOrderItems
            : allOrderItems.filter(item => item.skuId === selectedSkuId);
        
        const orderIdsWithSelectedProduct = new Set(itemsFilteredByProduct.map(item => item.orderId));

        const filteredDistributorIds = new Set(
            distributors
                .filter(d => (selectedAsmName === 'all' || d.asmName === selectedAsmName))
                .filter(d => (selectedState === 'all' || d.state === selectedState))
                .filter(d => (selectedArea === 'all' || d.area === selectedArea))
                .map(d => d.id)
        );

        const selectedScheme = selectedSchemeId !== 'all' ? schemes.find(s => s.id === selectedSchemeId) : null;

        const filteredOrders = orders.filter(order => {
            if (order.status !== OrderStatus.DELIVERED) return false;
            
            const orderDate = new Date(order.date);
            if (!(orderDate >= start && orderDate <= end)) return false;
            
            if (!filteredDistributorIds.has(order.distributorId)) return false;

            if (selectedDistributorId !== 'all' && order.distributorId !== selectedDistributorId) return false;

            if (selectedSkuId !== 'all' && !orderIdsWithSelectedProduct.has(order.id)) {
                return false;
            }

            if (selectedScheme) {
                const orderItemsForThisOrder = allOrderItems.filter(i => i.orderId === order.id && !i.isFreebie);
                const buySkuQuantity = orderItemsForThisOrder
                    .filter(i => i.skuId === selectedScheme.buySkuId)
                    .reduce((sum, item) => sum + item.quantity, 0);
                
                if (buySkuQuantity < selectedScheme.buyQuantity) {
                    return false;
                }
            }
            
            return true;
        });
        
        const filteredOrderIds = new Set(filteredOrders.map(o => o.id));
        const filteredOrderItems = itemsFilteredByProduct.filter(item => filteredOrderIds.has(item.orderId));

        const totalSalesValue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        let totalPaidQty = 0;
        let totalFreeQty = 0;
        const productSales: Record<string, { paid: number; free: number; salesValue: number; }> = {};
        const distributorSalesMap = new Map<string, { totalWithGst: number; frequency: number; }>();
        const salesByDate = new Map<string, { sales: number; orderCount: number; quantity: number }>();
        const salesByState = new Map<string, { value: number, areas: Map<string, number> }>();
        const salesByExecutive = new Map<string, { sales: number; quantity: number }>();
        const skuMap = new Map(skus.map(s => [s.id, s.name]));

        const getGroupKey = (date: Date, granularity: ChartGranularity) => {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            switch (granularity) {
                case 'monthly': return `${year}-${String(month).padStart(2, '0')}`;
                case 'quarterly': return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
                case 'yearly': return `${year}`;
                case 'daily': default: return date.toISOString().split('T')[0];
            }
        };

        filteredOrders.forEach(order => {
            const dist = distributors.find(d => d.id === order.distributorId);
            if (dist) {
                const current = distributorSalesMap.get(dist.id) || { totalWithGst: 0, frequency: 0 };
                current.totalWithGst += order.totalAmount;
                current.frequency += 1;
                distributorSalesMap.set(dist.id, current);

                const stateCurrent = salesByState.get(dist.state) || { value: 0, areas: new Map() };
                stateCurrent.value += order.totalAmount;
                const areaCurrent = stateCurrent.areas.get(dist.area) || 0;
                stateCurrent.areas.set(dist.area, areaCurrent + order.totalAmount);
                salesByState.set(dist.state, stateCurrent);

                if (dist.executiveName) {
                    const execCurrent = salesByExecutive.get(dist.executiveName) || { sales: 0, quantity: 0 };
                    execCurrent.sales += order.totalAmount;
                    salesByExecutive.set(dist.executiveName, execCurrent);
                }
            }
            const dateKey = getGroupKey(new Date(order.date), chartGranularity);
            const dateEntry = salesByDate.get(dateKey) || { sales: 0, orderCount: 0, quantity: 0 };
            dateEntry.sales += order.totalAmount;
            dateEntry.orderCount += 1;
            salesByDate.set(dateKey, dateEntry);
        });
        
        filteredOrderItems.forEach(item => {
            if (item.isFreebie) {
                totalFreeQty += item.quantity;
            } else {
                totalPaidQty += item.quantity;
            }
            const skuSale = productSales[item.skuId] || { paid: 0, free: 0, salesValue: 0 };
            if (item.isFreebie) {
                skuSale.free += item.quantity;
            } else {
                skuSale.paid += item.quantity;
                skuSale.salesValue += item.quantity * item.unitPrice;
            }
            productSales[item.skuId] = skuSale;

            const order = filteredOrders.find(o => o.id === item.orderId);
            if (order) {
                const dateKey = getGroupKey(new Date(order.date), chartGranularity);
                const dateEntry = salesByDate.get(dateKey);
                if (dateEntry) dateEntry.quantity += item.quantity;

                const dist = distributors.find(d => d.id === order.distributorId);
                if (dist?.executiveName) {
                    const execEntry = salesByExecutive.get(dist.executiveName);
                    if (execEntry) execEntry.quantity += item.quantity;
                }
            }
        });

        const distributorSales: DistributorSale[] = [];
        distributorSalesMap.forEach((value, key) => {
            const dist = distributors.find(d => d.id === key);
            if (dist) {
                distributorSales.push({
                    distributorId: key,
                    distributorName: dist.name,
                    walletBalance: dist.walletBalance,
                    ...value
                });
            }
        });

        const salesTrendData = Array.from(salesByDate.entries()).map(([key, value]) => ({
            name: key,
            Sales: value.sales,
            'Avg. Order Value': value.orderCount > 0 ? value.sales / value.orderCount : 0,
            quantity: value.quantity,
            orderCount: value.orderCount
        })).sort((a,b) => a.name.localeCompare(b.name));

        const topProductsData = Object.entries(productSales).map(([skuId, data]) => ({
            name: skuMap.get(skuId) || skuId, ...data
        })).sort((a, b) => b.salesValue - a.salesValue).slice(0, topProductsCount);

        const salesByStateData = Array.from(salesByState.entries()).map(([state, data]) => ({
            name: state, value: data.value, areas: Array.from(data.areas.entries()).map(([area, value]) => ({ name: area, value })).sort((a,b) => b.value - a.value)
        })).sort((a, b) => b.value - a.value);

        const uniqueExecutives = [...salesByExecutive.keys()].sort();
        const salesByExecutiveChartData = salesTrendData.map(datePoint => {
            const data: any = { name: datePoint.name };
            uniqueExecutives.forEach(exec => {
                const ordersForExecOnDate = filteredOrders.filter(o => {
                    const dist = distributors.find(d => d.id === o.distributorId);
                    const dateKey = getGroupKey(new Date(o.date), chartGranularity);
                    return dist?.executiveName === exec && dateKey === datePoint.name;
                });
                const sales = ordersForExecOnDate.reduce((sum, o) => sum + o.totalAmount, 0);
                const qty = allOrderItems.filter(i => ordersForExecOnDate.some(o => o.id === i.orderId)).reduce((sum, i) => sum + i.quantity, 0);
                data[exec] = sales;
                data[`${exec}_qty`] = qty;
            });
            return data;
        });

        return {
            totalSalesValue,
            distributorSales,
            totalPaidQty,
            totalFreeQty,
            salesTrendData,
            topProductsData,
            salesByStateData,
            salesByExecutiveChartData,
            uniqueExecutives,
        };
    }, [dateRange, orders, allOrderItems, distributors, skus, schemes, selectedDistributorId, selectedAsmName, selectedState, selectedArea, selectedSchemeId, selectedSkuId, topProductsCount, chartGranularity]);

    const { items: sortedDistributorSales, requestSort, sortConfig } = useSortableData(salesData.distributorSales, { key: 'totalWithGst', direction: 'descending' });

    if (loading) {
        return <div className="text-center p-8">Loading sales data...</div>;
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <h2 className="text-2xl font-bold">Sales Reports</h2>
                    <div className="w-full sm:w-auto sm:max-w-md mt-4 sm:mt-0">
                        <DateRangePicker value={dateRange} onChange={setDateRange} label="Select Date Range"/>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
                    <Select label="ASM" value={selectedAsmName} onChange={handleAsmChange}><option value="all">All ASMs</option>{uniqueAsmNames.map(name => <option key={name} value={name}>{name}</option>)}</Select>
                    <Select label="Distributor" value={selectedDistributorId} onChange={e => setSelectedDistributorId(e.target.value)}><option value="all">All Distributors</option>{availableDistributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
                    <Select label="State" value={selectedState} onChange={handleStateChange}><option value="all">All States</option>{uniqueStates.map(state => <option key={state} value={state}>{state}</option>)}</Select>
                    <Select label="Area" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}><option value="all">All Areas</option>{availableAreas.map(area => <option key={area} value={area}>{area}</option>)}</Select>
                    <Select label="Scheme" value={selectedSchemeId} onChange={e => setSelectedSchemeId(e.target.value)}><option value="all">All Schemes</option>{schemes.map(s => <option key={s.id} value={s.id}>{s.description}</option>)}</Select>
                    <Select label="Product" value={selectedSkuId} onChange={e => setSelectedSkuId(e.target.value)}><option value="all">All Products</option>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Sales" value={formatIndianCurrency(salesData.totalSalesValue)} icon={<DollarSign />} iconBgClass="bg-primary/10 text-primary" />
                <StatCard title="Paid Units" value={formatIndianNumber(salesData.totalPaidQty)} icon={<Package />} iconBgClass="bg-blue-500/10 text-blue-600" />
                <StatCard title="Free Units" value={formatIndianNumber(salesData.totalFreeQty)} icon={<Gift />} iconBgClass="bg-green-500/10 text-green-600" />
            </div>
            
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <h3 className="text-lg font-semibold text-content">Sales Trend</h3>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <div className="flex items-center">
                            <input type="checkbox" id="showAov" checked={showAov} onChange={() => setShowAov(!showAov)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                            <label htmlFor="showAov" className="ml-2 text-sm text-contentSecondary">Show Avg. Order Value</label>
                        </div>
                        <Select value={chartGranularity} onChange={e => setChartGranularity(e.target.value as any)} size="sm" className="!w-auto">
                            <option value="daily">Daily</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                        </Select>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData.salesTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tickFormatter={(label) => label.includes('-') ? formatDateDDMMYYYY(label) : label}/>
                        <YAxis yAxisId="left" tickFormatter={(value) => formatIndianCurrencyShort(value)} />
                        {showAov && <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatIndianCurrencyShort(value)} />}
                        <Tooltip content={<CustomSalesTooltip />}/>
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="Sales" stroke="#8884d8" strokeWidth={2} />
                        {showAov && <Line yAxisId="right" type="monotone" dataKey="Avg. Order Value" stroke="#82ca9d" strokeDasharray="5 5" />}
                    </LineChart>
                </ResponsiveContainer>
            </Card>

             <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <h3 className="text-lg font-semibold text-content">Sales by Executive</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={salesData.salesByExecutiveChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tickFormatter={(label) => label.includes('-') ? formatDateDDMMYYYY(label) : label} />
                        <YAxis tickFormatter={(value) => formatIndianCurrencyShort(value)} />
                        <Tooltip content={<CustomExecutiveTooltip />}/>
                        <Legend />
                        {salesData.uniqueExecutives.map((exec, index) => (
                             <Bar key={exec} dataKey={exec} stackId="a" fill={EXEC_COLORS[index % EXEC_COLORS.length]} />
                        ))}
                    </RechartsBarChart>
                </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-content">Top {topProductsCount} Products by Sales</h3>
                        <div className="flex gap-1 p-1 bg-background rounded-lg border">
                           <button onClick={() => setTopProductsCount(5)} className={`px-2 py-1 text-xs rounded ${topProductsCount === 5 ? 'bg-primary text-white' : ''}`}>Top 5</button>
                           <button onClick={() => setTopProductsCount(10)} className={`px-2 py-1 text-xs rounded ${topProductsCount === 10 ? 'bg-primary text-white' : ''}`}>Top 10</button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={salesData.topProductsData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatIndianCurrencyShort(value)} />
                            <YAxis type="category" dataKey="name" width={150} />
                            <Tooltip content={<CustomProductTooltip />}/>
                            <Legend />
                            <Bar dataKey="paid" name="Paid Units" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="free" name="Free Units" stackId="a" fill="#22c55e" />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold text-content mb-4">Sales by State</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={salesData.salesByStateData} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis type="number" tickFormatter={(value) => formatIndianCurrencyShort(value)} />
                           <YAxis type="category" dataKey="name" width={80} />
                           <Tooltip content={<CustomStateTooltip />} />
                           <Bar dataKey="value" name="Total Sales" fill="#8884d8" />
                        </RechartsBarChart>
                     </ResponsiveContainer>
                </Card>
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-content mb-4">Distributor Sales Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <SortableTableHeader label="Distributor" sortKey="distributorName" requestSort={requestSort} sortConfig={sortConfig}/>
                                <SortableTableHeader label="Wallet Balance" sortKey="walletBalance" requestSort={requestSort} sortConfig={sortConfig} className="text-right"/>
                                <SortableTableHeader label="Order Count" sortKey="frequency" requestSort={requestSort} sortConfig={sortConfig} className="text-right"/>
                                <SortableTableHeader label="Total Sales" sortKey="totalWithGst" requestSort={requestSort} sortConfig={sortConfig} className="text-right"/>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDistributorSales.map(d => (
                                <tr key={d.distributorId} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-3 font-medium">{d.distributorName}</td>
                                    <td className={`p-3 text-right font-semibold ${d.walletBalance < 0 ? 'text-red-600' : ''}`}>{formatIndianCurrency(d.walletBalance)}</td>
                                    <td className="p-3 text-right">{d.frequency}</td>
                                    <td className="p-3 font-bold text-right">{formatIndianCurrency(d.totalWithGst)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
};

// FIX: Added default export to resolve module import error in App.tsx.
export default SalesPage;

```
  </change>
</changes>
```