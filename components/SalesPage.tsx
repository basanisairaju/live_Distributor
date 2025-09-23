

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
            distributorSales: [],
            totalPaidQty: 0,
            totalFreeQty: 0,
            productSalesSummary: [],
            salesTotals: {
                frequency: 0,
                totalWithGst: 0,
            },
            productColumns: [],
            filteredOrders: [],
            filteredOrderItems: [],
            salesTrendData: [],
            topProductsData: [],
            salesByStateData: [],
            salesByDistributorData: [],
            salesByAsmData: [],
            salesByExecutiveChartData: [],
            uniqueExecutives: [],
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
        
        // FIX: Explicitly type Maps to ensure correct type inference downstream.
        const skuMap = new Map<string, string>(skus.map(s => [s.id, s.name]));
        const distributorMap = new Map<string, Distributor>(distributors.map(d => [d.id, d]));

        let totalPaidQty = 0;
        let totalFreeQty = 0;
        
        const productSummary = new Map<string, { paid: number, free: number, salesValue: number }>();
        filteredOrderItems.forEach(item => {
            const skuName = skuMap.get(item.skuId);
            if(skuName) {
                const current = productSummary.get(skuName) || { paid: 0, free: 0, salesValue: 0 };
                if (item.isFreebie) {
                    current.free += item.quantity;
                    totalFreeQty += item.quantity;
                } else {
                    current.paid += item.quantity;
                    totalPaidQty += item.quantity;
                    current.salesValue += item.quantity * item.unitPrice;
                }
                productSummary.set(skuName, current);
            }
        });

        const productSalesSummary = Array.from(productSummary, ([skuName, data]) => ({
            skuName,
            paid: data.paid,
            free: data.free,
            total: data.paid + data.free,
            salesValue: data.salesValue,
        }));
        
        const productColumns = [...new Set(
            filteredOrderItems
                .map(item => skuMap.get(item.skuId))
                .filter((name): name is string => !!name)
        )].sort();

        // FIX: Strongly typed the map to prevent 'any' type issues.
        const distributorSalesMap = new Map<string, DistributorSale>();
        filteredOrders.forEach(order => {
            const distId = order.distributorId;
            const distributor = distributorMap.get(distId);
            if (!distributor) return;

            let distData = distributorSalesMap.get(distId);
            if (!distData) {
// FIX: Cast the initial object to DistributorSale to allow adding dynamic product keys, resolving numerous downstream type errors.
                distData = {
                    distributorId: distId,
                    distributorName: distributor.name,
                    walletBalance: distributor.walletBalance,
                    frequency: 0,
                    totalWithGst: 0,
                } as DistributorSale;
                productColumns.forEach(name => {
                    distData[name] = 0;
                    distData[`${name} free`] = 0;
                });
                distributorSalesMap.set(distId, distData);
            }
            
            distData.frequency += 1;
            distData.totalWithGst += order.totalAmount;

            const itemsForThisOrder = filteredOrderItems.filter(item => item.orderId === order.id);
            itemsForThisOrder.forEach(item => {
                const skuName = skuMap.get(item.skuId);
                if (!skuName) return;

                if (item.isFreebie) {
                    // FIX: Cast dynamic properties to number to ensure correct arithmetic operations and satisfy TypeScript.
                    distData[`${skuName} free`] = (distData[`${skuName} free`] as number || 0) + item.quantity;
                } else {
                    // FIX: Cast dynamic properties to number to ensure correct arithmetic operations and satisfy TypeScript.
                    distData[skuName] = (distData[skuName] as number || 0) + item.quantity;
                }
            });
        });
        const distributorSales = Array.from(distributorSalesMap.values());
        
        // FIX: Strongly typed salesTotals to prevent 'any' type issues.
        const salesTotals: Record<string, number> = {
            frequency: 0,
            totalWithGst: 0,
        };
        distributorSales.forEach(sale => {
            productColumns.forEach(name => {
                salesTotals[name] = (salesTotals[name] || 0) + (sale[name] as number || 0);
                salesTotals[`${name} free`] = (salesTotals[`${name} free`] || 0) + (sale[`${name} free`] as number || 0);
            });
            salesTotals.frequency += sale.frequency || 0;
            salesTotals.totalWithGst += sale.totalWithGst || 0;
        });

        const totalSalesValue = salesTotals.totalWithGst;
        
        // --- Data for Charts ---
        const salesByDateAggregation = new Map<string, { sales: number; orderCount: number; quantity: number }>();
        const processedOrdersForTrend = new Set<string>();
        const itemsByOrderId = new Map<string, OrderItem[]>();
        filteredOrderItems.forEach(item => {
            if (!itemsByOrderId.has(item.orderId)) {
                itemsByOrderId.set(item.orderId, []);
            }
            itemsByOrderId.get(item.orderId)!.push(item);
        });

        filteredOrders.forEach(order => {
            const date = new Date(order.date);
            let key = '';
            switch (chartGranularity) {
                case 'monthly':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarterly':
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    key = `${date.getFullYear()}-Q${quarter}`;
                    break;
                case 'yearly':
                    key = `${date.getFullYear()}`;
                    break;
                case 'daily':
                default:
                    key = date.toLocaleDateString('en-CA'); // YYYY-MM-DD for sorting
                    break;
            }
            const existing = salesByDateAggregation.get(key) || { sales: 0, orderCount: 0, quantity: 0 };
            existing.sales += order.totalAmount;
            
            const orderKey = `${order.id}-${key}`;
            if(!processedOrdersForTrend.has(orderKey)) {
                existing.orderCount += 1;
                processedOrdersForTrend.add(orderKey);
            }
            
            const orderItemsForThisOrder = itemsByOrderId.get(order.id) || [];
            const orderQty = orderItemsForThisOrder
                .filter(item => !item.isFreebie)
                .reduce((sum, item) => sum + item.quantity, 0);
            existing.quantity += orderQty;

            salesByDateAggregation.set(key, existing);
        });
        
        const salesTrendData = Array.from(salesByDateAggregation.entries())
            .map(([date, data]) => ({
                 date, 
                 sales: data.sales, 
                 orderCount: data.orderCount,
                 quantity: data.quantity,
                 aov: data.orderCount > 0 ? data.sales / data.orderCount : 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
            
        const topProductsData = productSalesSummary.sort((a, b) => b.total - a.total);

        const salesByStateAndArea = new Map<string, { total: number; areas: Map<string, number> }>();
        // FIX: Strongly typed the map to ensure type safety.
        const distributorDetailsMapForCharts = new Map<string, { state: string; area: string; asmName: string; executiveName: string; }>(distributors.map(d => [d.id, { state: d.state, area: d.area, asmName: d.asmName, executiveName: d.executiveName }]));
        filteredOrders.forEach(order => {
            const details = distributorDetailsMapForCharts.get(order.distributorId);
            if (details) {
                const { state, area } = details;
                const stateData = salesByStateAndArea.get(state) || { total: 0, areas: new Map<string, number>() };
                stateData.total += order.totalAmount;
                stateData.areas.set(area, (stateData.areas.get(area) || 0) + order.totalAmount);
                salesByStateAndArea.set(state, stateData);
            }
        });

        const salesByStateData = Array.from(salesByStateAndArea.entries())
            .map(([name, { total, areas }]) => ({
                name,
                value: total,
                areas: Array.from(areas.entries())
                    .map(([areaName, areaValue]) => ({ name: areaName, value: areaValue }))
                    .sort((a,b) => b.value - a.value)
            }))
            .sort((a, b) => b.value - a.value);

        const salesByDistributor = new Map<string, number>();
        filteredOrders.forEach(order => {
            const distName = distributorMap.get(order.distributorId)?.name;
            if (distName) {
                salesByDistributor.set(distName, (salesByDistributor.get(distName) || 0) + order.totalAmount);
            }
        });

        const salesByDistributorData = Array.from(salesByDistributor.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const salesByAsm = new Map<string, { totalSales: number; totalQty: number; orderCount: number }>();
        filteredOrders.forEach(order => {
            const dist = distributorMap.get(order.distributorId);
            if(dist?.asmName) {
                const orderQty = allOrderItems
                    .filter(item => item.orderId === order.id && !item.isFreebie)
                    .reduce((sum, item) => sum + item.quantity, 0);

                const current = salesByAsm.get(dist.asmName) || { totalSales: 0, totalQty: 0, orderCount: 0 };
                current.totalSales += order.totalAmount;
                current.totalQty += orderQty;
                current.orderCount += 1;
                salesByAsm.set(dist.asmName, current);
            }
        });
        
        const salesByAsmData = Array.from(salesByAsm.entries())
            .map(([name, data]) => ({ name, value: data.totalSales, quantity: data.totalQty, orderCount: data.orderCount }))
            .sort((a, b) => b.value - a.value);

        const salesByAsmAndExecutive = new Map<string, Map<string, { sales: number; qty: number }>>();
        filteredOrders.forEach(order => {
            const details = distributorDetailsMapForCharts.get(order.distributorId);
            if (details && details.asmName && details.executiveName) {
                const { asmName, executiveName } = details;
                 const orderQty = allOrderItems
                    .filter(item => item.orderId === order.id && !item.isFreebie)
                    .reduce((sum, item) => sum + item.quantity, 0);

                const asmData = salesByAsmAndExecutive.get(asmName) || new Map<string, { sales: number; qty: number }>();
                const execData = asmData.get(executiveName) || { sales: 0, qty: 0 };
                execData.sales += order.totalAmount;
                execData.qty += orderQty;
                asmData.set(executiveName, execData);
                salesByAsmAndExecutive.set(asmName, asmData);
            }
        });

        const uniqueExecutivesSet = new Set<string>();
        const salesByExecutiveChartData = Array.from(salesByAsmAndExecutive.entries()).map(([asmName, execMap]) => {
            const row: { [key: string]: string | number } = { asmName };
            let totalAsmSales = 0;
            execMap.forEach(({ sales, qty }, execName) => {
                row[`${execName}_sales`] = sales;
                row[`${execName}_qty`] = qty;
                totalAsmSales += sales;
                uniqueExecutivesSet.add(execName);
            });
            row._total = totalAsmSales;
            return row;
        }).sort((a,b) => (b._total as number) - (a._total as number));
        salesByExecutiveChartData.forEach(row => delete row._total);
        const uniqueExecutives = Array.from(uniqueExecutivesSet).sort();


        return { totalSalesValue, distributorSales, totalPaidQty, totalFreeQty, productSalesSummary, salesTotals, productColumns, filteredOrders, filteredOrderItems, salesTrendData, topProductsData, salesByStateData, salesByDistributorData, salesByAsmData, salesByExecutiveChartData, uniqueExecutives };
    }, [orders, allOrderItems, distributors, skus, schemes, dateRange, selectedDistributorId, selectedState, selectedArea, selectedSchemeId, chartGranularity, selectedAsmName, selectedSkuId]);
    
    const { items: sortedProductSummary, requestSort: requestProductSort, sortConfig: productSortConfig } = useSortableData(salesData.productSalesSummary, { key: 'total', direction: 'descending' });
    const { items: sortedDistributorSales, requestSort: requestDistributorSalesSort, sortConfig: distributorSalesSortConfig } = useSortableData(salesData.distributorSales, { key: 'totalWithGst', direction: 'descending' });

    const formatDateForFilename = (date: Date | null) => date ? date.toISOString().split('T')[0] : '';
    const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    // FIX: Typed 'cell' to avoid 'any' type errors.
    const escapeCsvCell = (cell: string | number | null | undefined): string => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const getBaseFilename = () => {
        const distributorName = selectedDistributorId === 'all'
            ? 'All_Distributors'
            : sanitize(distributors.find(d => d.id === selectedDistributorId)?.name || 'Unknown');
        const stateName = selectedState === 'all' ? 'All_States' : sanitize(selectedState);
        const areaName = selectedArea === 'all' ? 'All_Areas' : sanitize(selectedArea);
        const schemeName = selectedSchemeId === 'all'
            ? 'All_Schemes'
            : sanitize(schemes.find(s => s.id === selectedSchemeId)?.description.substring(0, 30) || 'Unknown_Scheme');

        return `sales_${formatDateForFilename(dateRange.from)}_to_${formatDateForFilename(dateRange.to)}_${distributorName}_${stateName}_${areaName}_${schemeName}`;
    }

    const triggerCsvDownload = (content: string, filename: string) => {
         const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    const handleExportDetailedCsv = () => {
        if (loading) return;

        const { filteredOrders, filteredOrderItems } = salesData;

        const skuMap = new Map(skus.map(s => [s.id, s]));
        const distributorMap = new Map(distributors.map(d => [d.id, d]));

        const filename = `detailed_report_${getBaseFilename()}.csv`;
        
        const filterSummary = [
            ['Sales Report Filters'],
            ['Date Range', `${dateRange.from ? formatDateDDMMYYYY(dateRange.from) : 'N/A'} to ${dateRange.to ? formatDateDDMMYYYY(dateRange.to) : 'N/A'}`],
            ['State', selectedState],
            ['Area', selectedArea],
            ['Distributor', distributors.find(d => d.id === selectedDistributorId)?.name || 'All'],
            ['Scheme', schemes.find(s => s.id === selectedSchemeId)?.description || 'All'],
            []
        ].map(row => row.map(escapeCsvCell).join(',')).join('\n');

        const headers = [
            'Order ID', 'Order Date', 'Distributor ID', 'Distributor Name', 'State', 'Area',
            'SKU ID', 'Product Name', 'Item Type', 'Quantity', 'Base Price',
            'Unit Price', 'Total Amount'
        ];

        const rows = filteredOrderItems.map(item => {
            const order = filteredOrders.find(o => o.id === item.orderId);
            if (!order) return null;

            const distributor = distributorMap.get(order.distributorId);
            const sku = skuMap.get(item.skuId);
            const skuName = sku ? sku.name : 'Unknown SKU';
            const basePrice = sku ? sku.price : 0;

            return [
                order.id,
                formatDateDDMMYYYY(order.date),
                order.distributorId,
                distributor?.name || 'Unknown',
                distributor?.state || '',
                distributor?.area || '',
                item.skuId,
                skuName,
                item.isFreebie ? 'Free' : 'Paid',
                item.quantity,
                basePrice,
                item.unitPrice,
                item.quantity * item.unitPrice
            ].map(escapeCsvCell);
        }).filter((row): row is string[] => row !== null);

        const csvContent = filterSummary + '\n' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, filename);
    };

    const handleExportTableCsv = () => {
        const { salesTotals, productColumns } = salesData;
        
        const filename = `summary_report_${getBaseFilename()}.csv`;
        
        const headers: string[] = ['Distributor ID', 'Distributor Name', 'Frequency'];
        productColumns.forEach(name => {
            headers.push(name);
            headers.push(`${name} free`);
        });
        headers.push('Total (incl. GST)');
        headers.push('Wallet Balance');

        const rows = sortedDistributorSales.map(sale => {
            const row: (string | number)[] = [sale.distributorId, sale.distributorName, sale.frequency];
            productColumns.forEach(name => {
                row.push(sale[name] as number || 0);
                row.push(sale[`${name} free`] as number || 0);
            });
            row.push(sale.totalWithGst);
            row.push(sale.walletBalance);
            return row.map(escapeCsvCell);
        });

        const totalRow: (string | number)[] = ['Total', '', salesTotals.frequency];
        productColumns.forEach(name => {
            totalRow.push(salesTotals[name] || 0);
            totalRow.push(salesTotals[`${name} free`] || 0);
        });
        totalRow.push(salesTotals.totalWithGst);
        totalRow.push('');
        rows.push(totalRow.map(escapeCsvCell));

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, filename);
    };

    const handleExportProductSummaryCsv = () => {
        const filename = `product_summary_report_${getBaseFilename()}.csv`;

        const headers = ['Product Name', 'Paid Units', 'Free Units', 'Total Units'];

        const rows = sortedProductSummary.map(p => [
            p.skuName,
            p.paid,
            p.free,
            p.total
        ].map(escapeCsvCell));
        
        const totalRow = [
            'Total',
            sortedProductSummary.reduce((sum, p) => sum + p.paid, 0),
            sortedProductSummary.reduce((sum, p) => sum + p.free, 0),
            sortedProductSummary.reduce((sum, p) => sum + p.total, 0)
        ].map(escapeCsvCell);

        rows.push(totalRow);

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, filename);
    };


    if (loading) {
        return <div className="text-center p-8">Loading sales data...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-bold mb-4">Sales Report Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <DateRangePicker label="Date Range" value={dateRange} onChange={setDateRange} />
                    </div>
                    <Select label="Filter by ASM" value={selectedAsmName} onChange={handleAsmChange}>
                        <option value="all">All ASMs</option>
                        {uniqueAsmNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </Select>
                    <Select label="Filter by State" value={selectedState} onChange={handleStateChange}>
                        <option value="all">All States</option>
                        {uniqueStates.map(state => <option key={state} value={state}>{state}</option>)}
                    </Select>
                    <Select label="Filter by Area" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                        <option value="all">All Areas</option>
                        {availableAreas.map(area => <option key={area} value={area}>{area}</option>)}
                    </Select>
                    <Select label="Filter by Distributor" value={selectedDistributorId} onChange={e => setSelectedDistributorId(e.target.value)}>
                        <option value="all">All Distributors</option>
                        {availableDistributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                    <Select label="Filter by Product" value={selectedSkuId} onChange={e => setSelectedSkuId(e.target.value)}>
                        <option value="all">All Products</option>
                        {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label="Filter by Scheme" value={selectedSchemeId} onChange={e => setSelectedSchemeId(e.target.value)}>
                        <option value="all">All Schemes</option>
                        {schemes.filter(s => s.isGlobal).map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                    </Select>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Sales" value={formatIndianCurrency(salesData.totalSalesValue)} icon={<DollarSign />} iconBgClass="bg-primary/10 text-primary" />
                <StatCard title="Total Units Sold (Paid)" value={formatIndianNumber(salesData.totalPaidQty)} icon={<Package />} iconBgClass="bg-blue-500/10 text-blue-600" />
                <StatCard title="Total Units Given (Free)" value={formatIndianNumber(salesData.totalFreeQty)} icon={<Gift />} iconBgClass="bg-green-500/10 text-green-600" />
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h3 className="text-lg font-semibold text-content flex items-center"><TrendingUp size={20} className="mr-2 text-primary" /> Sales Trend</h3>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="showAov"
                                checked={showAov}
                                onChange={() => setShowAov(!showAov)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="showAov" className="text-sm text-contentSecondary cursor-pointer">
                                Show Avg. Order Value
                            </label>
                        </div>
                        <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                            {(['daily', 'monthly', 'quarterly', 'yearly'] as ChartGranularity[]).map(g => (
                                <Button key={g} variant={chartGranularity === g ? 'primary' : 'secondary'} size="sm" onClick={() => setChartGranularity(g)} className={`capitalize ${chartGranularity !== g ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>{g}</Button>
                            ))}
                        </div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData.salesTrendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(tick) => tick.includes('-') ? formatDateDDMMYYYY(tick) : tick} />
                        <YAxis yAxisId="left" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                        <Tooltip content={<CustomSalesTooltip />} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2} name="Sales" />
                        {showAov && (
                            <Line yAxisId="right" type="monotone" dataKey="aov" stroke="#f97316" strokeDasharray="5 5" name="Avg. Order Value" />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-content">Top {topProductsCount} Products by Volume</h3>
                        <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                            <Button variant={topProductsCount === 5 ? 'primary' : 'secondary'} size="sm" onClick={() => setTopProductsCount(5)} className={`${topProductsCount !== 5 ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>Top 5</Button>
                            <Button variant={topProductsCount === 10 ? 'primary' : 'secondary'} size="sm" onClick={() => setTopProductsCount(10)} className={`${topProductsCount !== 10 ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>Top 10</Button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={salesData.topProductsData.slice(0, topProductsCount)} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="skuName" type="category" width={80} />
                            <Tooltip content={<CustomProductTooltip />} />
                            <Legend />
                            <Bar dataKey="paid" stackId="a" fill="#3b82f6" name="Paid Units" />
                            <Bar dataKey="free" stackId="a" fill="#16a34a" name="Free Units" />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold text-content mb-4 flex items-center"><UserCheck size={20} className="mr-2 text-primary"/> Sales by ASM</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={salesData.salesByAsmData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip content={<CustomSalesTooltip />} />
                            <Bar dataKey="value" fill="#8b5cf6" name="Total Sales" />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-content mb-4 flex items-center"><Users size={20} className="mr-2 text-primary"/> Executive Performance by ASM</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <RechartsBarChart
                        data={salesData.salesByExecutiveChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                        <YAxis dataKey="asmName" type="category" width={150} />
                        <Tooltip content={<CustomExecutiveTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}/>
                        <Legend />
                        {salesData.uniqueExecutives.map((execName, index) => (
                            <Bar
                                key={execName}
                                dataKey={`${execName}_sales`}
                                stackId="a"
                                name={execName}
                                fill={EXEC_COLORS[index % EXEC_COLORS.length]}
                            />
                        ))}
                    </RechartsBarChart>
                </ResponsiveContainer>
            </Card>

            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-content flex items-center"><Table size={20} className="mr-2 text-primary" /> Product Sales Summary</h3>
                    <Button onClick={handleExportProductSummaryCsv} size="sm" variant="secondary"><Download size={14} /> Export CSV</Button>
                </div>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left min-w-[600px] text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <SortableTableHeader label="Product Name" sortKey="skuName" requestSort={requestProductSort} sortConfig={productSortConfig} />
                                <SortableTableHeader label="Paid Units" sortKey="paid" requestSort={requestProductSort} sortConfig={productSortConfig} className="text-right" />
                                <SortableTableHeader label="Free Units" sortKey="free" requestSort={requestProductSort} sortConfig={productSortConfig} className="text-right" />
                                <SortableTableHeader label="Total Units" sortKey="total" requestSort={requestProductSort} sortConfig={productSortConfig} className="text-right" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProductSummary.map(p => (
                                <tr key={p.skuName} className="border-b border-border last:border-b-0">
                                    <td className="p-3 font-medium">{p.skuName}</td>
                                    <td className="p-3 text-right">{formatIndianNumber(p.paid)}</td>
                                    <td className="p-3 text-right">{formatIndianNumber(p.free)}</td>
                                    <td className="p-3 font-semibold text-right">{formatIndianNumber(p.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedProductSummary.map(p => (
                        <Card key={p.skuName}>
                            <p className="font-bold text-content">{p.skuName}</p>
                            <div className="grid grid-cols-3 gap-4 text-center mt-3 pt-3 border-t">
                                <div>
                                    <p className="text-xs font-semibold text-contentSecondary">Paid</p>
                                    <p className="font-semibold text-lg text-content">{formatIndianNumber(p.paid)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-contentSecondary">Free</p>
                                    <p className="font-semibold text-lg text-green-600">{formatIndianNumber(p.free)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-contentSecondary">Total</p>
                                    <p className="font-bold text-lg text-primary">{formatIndianNumber(p.total)}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>
            
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-content flex items-center"><BarChart size={20} className="mr-2 text-primary" /> Distributor Sales Table</h3>
                    <div className="flex gap-2">
                        <Button onClick={handleExportTableCsv} size="sm" variant="secondary"><Download size={14} /> Export Summary</Button>
                        <Button onClick={handleExportDetailedCsv} size="sm" variant="secondary"><Download size={14} /> Export Detailed</Button>
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left min-w-[1200px] text-sm relative border-collapse">
                        <thead className="bg-slate-100">
                            <tr>
                                <th rowSpan={2} className="p-3 align-bottom">
                                    <SortableTableHeader label="Distributor ID" sortKey="distributorId" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} />
                                </th>
                                <th rowSpan={2} className="p-3 align-bottom sticky left-0 bg-slate-100 z-10 border-r border-border">
                                    <SortableTableHeader label="Distributor Name" sortKey="distributorName" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} />
                                </th>
                                <th rowSpan={2} className="p-3 align-bottom">
                                    <SortableTableHeader label="Frequency" sortKey="frequency" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} className="text-center"/>
                                </th>
                                {salesData.productColumns.map(name => (
                                    <th key={name} colSpan={2} className="p-2 font-semibold text-contentSecondary text-center border-x border-border whitespace-nowrap">{name}</th>
                                ))}
                                <th rowSpan={2} className="p-3 align-bottom">
                                    <SortableTableHeader label="Total (incl. GST)" sortKey="totalWithGst" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} className="text-right" />
                                </th>
                                <th rowSpan={2} className="p-3 align-bottom sticky right-0 bg-slate-100 z-10 border-l border-border">
                                    <SortableTableHeader label="Wallet Balance" sortKey="walletBalance" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} className="text-right" />
                                </th>
                            </tr>
                            <tr>
                                {salesData.productColumns.map(name => (
                                    <React.Fragment key={`${name}-sub`}>
                                        <th className="p-2 font-semibold text-contentSecondary text-center border-l border-border">Paid</th>
                                        <th className="p-2 font-semibold text-contentSecondary text-center text-green-700 border-r border-border">Free</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDistributorSales.map(sale => (
                                <tr key={sale.distributorId} className="border-b border-border last:border-b-0 group hover:bg-slate-50">
                                    <td className="p-3 font-mono text-xs">{sale.distributorId}</td>
                                    <td className="p-3 font-medium sticky left-0 bg-white group-hover:bg-slate-50 border-r border-border">{sale.distributorName}</td>
                                    <td className="p-3 text-center">{sale.frequency}</td>
                                    {salesData.productColumns.map(name => (
                                        <React.Fragment key={name}>
                                            <td className="p-3 text-center border-l border-border">
                                                {formatIndianNumber(sale[name] as number || 0)}
                                            </td>
                                            <td className="p-3 text-center text-green-600 font-medium border-r border-border">
                                                {formatIndianNumber(sale[`${name} free`] as number || 0)}
                                            </td>
                                        </React.Fragment>
                                    ))}
                                    <td className="p-3 font-semibold text-right">{formatIndianCurrency(sale.totalWithGst)}</td>
                                    <td className={`p-3 text-right font-semibold sticky right-0 bg-white group-hover:bg-slate-50 border-l border-border ${sale.walletBalance < 0 ? 'text-red-600' : 'text-content'}`}>{formatIndianCurrency(sale.walletBalance)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-border">
                            <tr className="font-bold">
                                <td className="p-3"></td>
                                <td className="p-3 sticky left-0 bg-slate-100 z-10 border-r border-border">Total</td>
                                <td className="p-3 text-center">{formatIndianNumber(salesData.salesTotals.frequency)}</td>
                                {salesData.productColumns.map(name => (
                                    <React.Fragment key={name}>
                                        <td className="p-3 text-center border-l border-border">
                                            {formatIndianNumber(salesData.salesTotals[name] || 0)}
                                        </td>
                                        <td className="p-3 text-center text-green-600 font-medium border-r border-border">
                                            {formatIndianNumber(salesData.salesTotals[`${name} free`] || 0)}
                                        </td>
                                    </React.Fragment>
                                ))}
                                <td className="p-3 text-right">{formatIndianCurrency(salesData.salesTotals.totalWithGst)}</td>
                                <td className="p-3 text-right sticky right-0 bg-slate-100 z-10 border-l border-border"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedDistributorSales.map(sale => (
                        <Card key={sale.distributorId} onClick={() => setExpandedDistributor(prev => prev === sale.distributorId ? null : sale.distributorId)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-primary">{sale.distributorName}</p>
                                    <p className="font-mono text-xs text-contentSecondary">{sale.distributorId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{formatIndianCurrency(sale.totalWithGst)}</p>
                                    <p className="text-xs text-contentSecondary">from {sale.frequency} order(s)</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                                <div>
                                    <p className="text-xs font-semibold text-contentSecondary">Wallet Balance</p>
                                    <p className={`font-semibold ${sale.walletBalance < 0 ? 'text-red-600' : 'text-content'}`}>{formatIndianCurrency(sale.walletBalance)}</p>
                                </div>
                                <div className="flex items-center text-primary font-semibold">
                                    {expandedDistributor === sale.distributorId ? 'Hide Details' : 'Show Details'}
                                    {expandedDistributor === sale.distributorId ? <ChevronDown size={16} className="ml-1"/> : <ChevronRight size={16} className="ml-1"/>}
                                </div>
                            </div>
                             {expandedDistributor === sale.distributorId && (
                                <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                    <h4 className="font-semibold text-content mb-1">Product Quantities</h4>
                                    {salesData.productColumns.map(name => {
                                        const paidQty = sale[name] as number || 0;
                                        const freeQty = sale[`${name} free`] as number || 0;
                                        if (paidQty === 0 && freeQty === 0) return null;
                                        return (
                                            <div key={name} className="flex justify-between items-center">
                                                <span className="text-contentSecondary">{name}</span>
                                                <span className="font-medium">
                                                    {paidQty > 0 && <span>{formatIndianNumber(paidQty)} Paid</span>}
                                                    {paidQty > 0 && freeQty > 0 && <span className="mx-1">/</span>}
                                                    {freeQty > 0 && <span className="text-green-600">{formatIndianNumber(freeQty)} Free</span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

            </Card>
        </div>
    );
};

export default SalesPage;