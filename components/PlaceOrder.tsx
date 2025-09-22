
import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Distributor, SKU, Scheme, PriceTier, PriceTierItem, Store, StockTransfer, UserRole } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Select from './common/Select';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, Trash2, CheckCircle, XCircle, Gift, Star, FileText, Send, AlertTriangle, Users, Building2, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/formatting';
import Input from './common/Input';

type OrderType = 'distributor' | 'store';

interface OrderItemState {
  id: string; // to track items for updates
  skuId: string;
  quantity: number;
}

interface DisplayItem {
    skuId: string;
    skuName: string;
    quantity: number;
    unitPrice: number;
    isFreebie: boolean;
    schemeSource?: string;
    hasTierPrice: boolean;
}

interface AppliedSchemeInfo {
    scheme: Scheme;
    timesApplied: number;
}

interface StatusMessage {
    type: 'success' | 'error';
    text: string;
    orderId?: string;
    transferId?: string;
}

interface StockInfo {
    quantity: number;
    reserved: number;
}

const PlaceOrder: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [orderType, setOrderType] = useState<OrderType>('distributor');
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [globalSchemes, setGlobalSchemes] = useState<Scheme[]>([]);
    const [distributorSchemes, setDistributorSchemes] = useState<Scheme[]>([]);
    const [storeSchemes, setStoreSchemes] = useState<Scheme[]>([]);
    const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
    const [allTierItems, setAllTierItems] = useState<PriceTierItem[]>([]);
    const [sourceStock, setSourceStock] = useState<Map<string, StockInfo>>(new Map());
    
    const [selectedDistributorId, setSelectedDistributorId] = useState<string>(location.state?.distributorId || '');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [orderItems, setOrderItems] = useState<OrderItemState[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
    const [lastSuccessfulTransfer, setLastSuccessfulTransfer] = useState<StockTransfer | null>(null);
    
    const [sourceLocationId, setSourceLocationId] = useState<'plant' | string | null>(null);
    const [sourceLocationName, setSourceLocationName] = useState<string>('');

    const selectedDistributor = useMemo(() => distributors.find(d => d.id === selectedDistributorId), [distributors, selectedDistributorId]);
    const selectedStore = useMemo(() => stores.find(s => s.id === selectedStoreId), [stores, selectedStoreId]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!portal) return;
            setIsLoading(true);
            const [
                distributorData, 
                storeData,
                skuData, 
                globalSchemeData, 
                priceTierData, 
                tierItemData,
            ] = await Promise.all([
                api.getDistributors(portal),
                api.getStores(),
                api.getSKUs(),
                api.getGlobalSchemes(),
                api.getPriceTiers(),
                api.getAllPriceTierItems(),
            ]);

            setDistributors(distributorData);
            setStores(storeData);
            setSkus(skuData);
            setGlobalSchemes(globalSchemeData);
            setPriceTiers(priceTierData);
            setAllTierItems(tierItemData);
            setIsLoading(false);
        };
        loadInitialData();
    }, [portal]);
    
    useEffect(() => {
        // Reset selections when order type changes
        setSelectedDistributorId('');
        setSelectedStoreId('');
        setOrderItems([]);
        setStatusMessage(null);
    }, [orderType]);

    useEffect(() => {
        const fetchSchemes = async () => {
            if (orderType === 'distributor' && selectedDistributor) {
                const [distSchemes, sSchemes] = await Promise.all([
                    api.getSchemesByDistributor(selectedDistributor.id),
                    selectedDistributor.storeId ? api.getSchemesByStore(selectedDistributor.storeId) : Promise.resolve([])
                ]);
                setDistributorSchemes(distSchemes);
                setStoreSchemes(sSchemes);
            } else {
                setDistributorSchemes([]);
                setStoreSchemes([]);
            }
        };
        fetchSchemes();
    }, [selectedDistributor, orderType]);

    useEffect(() => {
        let locationId: string | null = null;
        let locationName = '';
        if (orderType === 'store') {
            locationId = 'plant';
            locationName = 'Plant';
        } else if (orderType === 'distributor' && selectedDistributor) {
            locationId = selectedDistributor.storeId || 'plant';
            if (locationId === 'plant') {
                locationName = 'Plant';
            } else {
                locationName = stores.find(s => s.id === locationId)?.name || 'Store';
            }
        }
        setSourceLocationId(locationId);
        setSourceLocationName(locationName);
    }, [orderType, selectedDistributor, stores]);

    useEffect(() => {
        const fetchStockForLocation = async () => {
            if (sourceLocationId) {
                const stockData = await api.getStock(sourceLocationId);
                setSourceStock(new Map(stockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
            } else {
                setSourceStock(new Map());
            }
        };
        fetchStockForLocation();
    }, [sourceLocationId]);

    const { displayItems, subtotal, gstAmount, grandTotal, stockCheck, appliedSchemes } = useMemo(() => {
        let currentSubtotal = 0;
        let currentGstAmount = 0;
        const itemsToDisplay: DisplayItem[] = [];
        const appliedSchemesTracker = new Map<string, AppliedSchemeInfo>();
        const today = new Date().toISOString().split('T')[0];
        
        // --- Logic for Distributor Orders (Sales) ---
        if (orderType === 'distributor') {
            const allFetchedSchemes = [
                ...globalSchemes,
                ...storeSchemes,
                ...(selectedDistributor?.hasSpecialSchemes ? distributorSchemes : [])
            ];
            const applicableSchemes = allFetchedSchemes.filter(s => s.startDate <= today && s.endDate >= today && !s.stoppedDate);
            
            const uniqueApplicableSchemes = Array.from(new Map(applicableSchemes.map(s => [s.id, s])).values());
            
            const tierItemsMap = new Map<string, number>();
            if (selectedDistributor?.priceTierId) {
                allTierItems
                    .filter(item => item.tierId === selectedDistributor.priceTierId)
                    .forEach(item => tierItemsMap.set(item.skuId, item.price));
            }

            orderItems.forEach(item => {
                const sku = skus.find(s => s.id === item.skuId);
                if (!sku || item.quantity <= 0) return;
                const tierPrice = tierItemsMap.get(item.skuId);
                const unitPrice = tierPrice !== undefined ? tierPrice : sku.price;
                const itemSubtotal = item.quantity * unitPrice;
                currentSubtotal += itemSubtotal;
                currentGstAmount += itemSubtotal * (sku.gstPercentage / 100);
                itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: item.quantity, unitPrice, isFreebie: false, hasTierPrice: tierPrice !== undefined });
            });

            const freebies = new Map<string, { quantity: number; source: string }>();
            const schemesByBuySku = uniqueApplicableSchemes.reduce((acc, scheme) => {
                if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
                acc[scheme.buySkuId].push(scheme);
                return acc;
            }, {} as Record<string, Scheme[]>);

            const purchasedQuantities = new Map<string, number>();
            orderItems.forEach(item => {
                if(item.quantity > 0) purchasedQuantities.set(item.skuId, (purchasedQuantities.get(item.skuId) || 0) + item.quantity);
            });

            purchasedQuantities.forEach((quantity, skuId) => {
                const relevantSchemes = schemesByBuySku[skuId]?.sort((a,b) => b.buyQuantity - a.buyQuantity);
                if (relevantSchemes) {
                    let remainingQuantity = quantity;
                    relevantSchemes.forEach(scheme => {
                        if (remainingQuantity >= scheme.buyQuantity) {
                            const timesApplied = Math.floor(remainingQuantity / scheme.buyQuantity);
                            const totalFree = timesApplied * scheme.getQuantity;
                            
                            let schemeSource = 'Global';
                            if (distributorSchemes.some(s => s.id === scheme.id)) {
                                schemeSource = 'Distributor';
                            } else if (storeSchemes.some(s => s.id === scheme.id)) {
                                schemeSource = 'Store';
                            }

                            const existing = freebies.get(scheme.getSkuId) || { quantity: 0, source: 'N/A' };
                            freebies.set(scheme.getSkuId, { quantity: existing.quantity + totalFree, source: schemeSource });
                            remainingQuantity %= scheme.buyQuantity;

                            const existingApplied = appliedSchemesTracker.get(scheme.id) || { scheme, timesApplied: 0 };
                            existingApplied.timesApplied += timesApplied;
                            appliedSchemesTracker.set(scheme.id, existingApplied);
                        }
                    });
                }
            });

            freebies.forEach((data, skuId) => {
                const sku = skus.find(s => s.id === skuId);
                if (sku) itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: data.quantity, unitPrice: 0, isFreebie: true, schemeSource: data.source, hasTierPrice: false });
            });
        }
        // --- Logic for Store Transfers ---
        else if (orderType === 'store') {
             orderItems.forEach(item => {
                const sku = skus.find(s => s.id === item.skuId);
                if (!sku || item.quantity <= 0) return;
                const unitPrice = sku.price; // Internal transfers use base price
                currentSubtotal += item.quantity * unitPrice;
                itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: item.quantity, unitPrice, isFreebie: false, hasTierPrice: false });
            });

            // Apply global schemes for store transfers
            const applicableSchemes = globalSchemes.filter(s => s.startDate <= today && s.endDate >= today && !s.stoppedDate);
            const freebies = new Map<string, { quantity: number; source: string }>();
            const schemesByBuySku = applicableSchemes.reduce((acc, scheme) => {
                if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
                acc[scheme.buySkuId].push(scheme);
                return acc;
            }, {} as Record<string, Scheme[]>);

            const purchasedQuantities = new Map<string, number>();
            orderItems.forEach(item => {
                if(item.quantity > 0) purchasedQuantities.set(item.skuId, (purchasedQuantities.get(item.skuId) || 0) + item.quantity);
            });

            purchasedQuantities.forEach((quantity, skuId) => {
                const relevantSchemes = schemesByBuySku[skuId]?.sort((a,b) => b.buyQuantity - a.buyQuantity);
                if (relevantSchemes) {
                    let remainingQuantity = quantity;
                    relevantSchemes.forEach(scheme => {
                        if (remainingQuantity >= scheme.buyQuantity) {
                            const timesApplied = Math.floor(remainingQuantity / scheme.buyQuantity);
                            const totalFree = timesApplied * scheme.getQuantity;
                            
                            const schemeSource = 'Global';
                            const existing = freebies.get(scheme.getSkuId) || { quantity: 0, source: 'N/A' };
                            freebies.set(scheme.getSkuId, { quantity: existing.quantity + totalFree, source: schemeSource });
                            remainingQuantity %= scheme.buyQuantity;
                            
                            const existingApplied = appliedSchemesTracker.get(scheme.id) || { scheme, timesApplied: 0 };
                            existingApplied.timesApplied += timesApplied;
                            appliedSchemesTracker.set(scheme.id, existingApplied);
                        }
                    });
                }
            });

            freebies.forEach((data, skuId) => {
                const sku = skus.find(s => s.id === skuId);
                if (sku) itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: data.quantity, unitPrice: 0, isFreebie: true, schemeSource: data.source, hasTierPrice: false });
            });
        }
        
        const finalSubtotal = currentSubtotal;
        const calculatedGrandTotal = finalSubtotal + currentGstAmount;

        const issues: string[] = [];
        const requiredStock = new Map<string, number>();
        itemsToDisplay.forEach(item => {
            requiredStock.set(item.skuId, (requiredStock.get(item.skuId) || 0) + item.quantity);
        });
        requiredStock.forEach((quantity, skuId) => {
            const stockInfo = sourceStock.get(skuId);
            const availableStock = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
            if (quantity > availableStock) {
                const skuName = skus.find(s => s.id === skuId)?.name || skuId;
                issues.push(`${skuName}: Required ${quantity}, Available ${availableStock}`);
            }
        });
        const calculatedStockCheck = { hasIssues: issues.length > 0, issues };
        const finalAppliedSchemes = Array.from(appliedSchemesTracker.values());
        
        return { displayItems: itemsToDisplay, subtotal: finalSubtotal, gstAmount: currentGstAmount, grandTotal: calculatedGrandTotal, stockCheck: calculatedStockCheck, appliedSchemes: finalAppliedSchemes };
    }, [orderType, orderItems, skus, globalSchemes, distributorSchemes, storeSchemes, allTierItems, selectedDistributor, sourceStock]);

    const handleAddItem = () => {
        if (skus.length > 0) {
            setOrderItems([...orderItems, { id: Date.now().toString(), skuId: skus[0].id, quantity: 1 }]);
        }
    };
    const handleItemChange = (itemId: string, field: 'skuId' | 'quantity', value: string | number) => {
        setOrderItems(orderItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    };
    const handleRemoveItem = (itemId: string) => {
        setOrderItems(orderItems.filter(item => item.id !== itemId));
    };

    const handleSubmit = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setStatusMessage(null);

        try {
            const itemsToSubmit = orderItems
                .filter(i => i.quantity > 0)
                .map(({ skuId, quantity }) => ({ skuId, quantity: Number(quantity) }));

            if (orderType === 'distributor') {
                if (!selectedDistributor) throw new Error("No distributor selected");
                const availableFunds = selectedDistributor.walletBalance + selectedDistributor.creditLimit;
                if (grandTotal > availableFunds) {
                    throw new Error(`Insufficient funds. Order total is ${formatIndianCurrency(grandTotal)}, but available funds are ${formatIndianCurrency(availableFunds)}.`);
                }
                const newOrder = await api.placeOrder(selectedDistributorId, itemsToSubmit, currentUser.username);
                setStatusMessage({ type: 'success', text: 'Order placed successfully!', orderId: newOrder.id });
                const updatedDistributors = await api.getDistributors(portal);
                setDistributors(updatedDistributors);
            } else if (orderType === 'store') {
                if (!selectedStoreId) throw new Error("No store selected");
                const newTransfer = await api.createStockTransfer(selectedStoreId, itemsToSubmit, currentUser.username);
                setLastSuccessfulTransfer(newTransfer);
                 setStatusMessage({ type: 'success', text: `Stock dispatch created successfully for ${stores.find(s => s.id === selectedStoreId)?.name}!`, transferId: newTransfer.id });
            }
            
            if (sourceLocationId) {
                const updatedStockData = await api.getStock(sourceLocationId);
                setSourceStock(new Map(updatedStockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
            }

            const updatedStores = await api.getStores();
            setStores(updatedStores);
            setOrderItems([]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setStatusMessage({ type: 'error', text: `Failed to submit: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    };

    const fundsCheck = useMemo(() => {
        if (orderType === 'distributor' && selectedDistributor) {
            return grandTotal <= selectedDistributor.walletBalance + selectedDistributor.creditLimit;
        }
        if (orderType === 'store' && selectedStore) {
            return grandTotal <= selectedStore.walletBalance;
        }
        return true;
    }, [orderType, selectedDistributor, selectedStore, grandTotal]);

    const canSubmit = (orderType === 'distributor' ? selectedDistributor : selectedStoreId) && orderItems.length > 0 && grandTotal > 0 && !stockCheck.hasIssues && fundsCheck;
    const isTargetSelected = orderType === 'distributor' ? !!selectedDistributorId : !!selectedStoreId;

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-bold mb-4">Create Outgoing Shipment</h2>
                <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-1/3">
                        <label className="block text-sm font-medium text-contentSecondary mb-1">Shipment For</label>
                        {currentUser?.role === UserRole.PLANT_ADMIN ? (
                            <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                                <Button variant={orderType === 'distributor' ? 'primary' : 'secondary'} size="md" onClick={() => setOrderType('distributor')} className={`w-1/2 ${orderType !== 'distributor' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}><Users size={16}/> Distributor</Button>
                                <Button variant={orderType === 'store' ? 'primary' : 'secondary'} size="md" onClick={() => setOrderType('store')} className={`w-1/2 ${orderType !== 'store' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}><Building2 size={16}/> Store</Button>
                            </div>
                        ) : (
                             <div className="p-2 border rounded-lg bg-slate-100 text-contentSecondary flex items-center justify-center h-[44px]">
                                <Users size={16} className="mr-2"/> Distributor Shipment
                            </div>
                        )}
                    </div>
                    <div className="w-full sm:w-2/3">
                        {orderType === 'distributor' && (
                            <Select id="distributor" label="Select Distributor" value={selectedDistributorId} onChange={(e) => setSelectedDistributorId(e.target.value)} disabled={isLoading}>
                                <option value="">-- Choose Distributor --</option>
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </Select>
                        )}
                         {orderType === 'store' && (
                            <Select id="store" label="Select Destination Store" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} disabled={isLoading}>
                                <option value="">-- Choose Store --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                        )}
                    </div>
                </div>
                 {orderType === 'distributor' && selectedDistributor && (
                    <div className="bg-primary/10 p-3 rounded-lg text-sm space-y-2 mt-4">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-contentSecondary">Available Funds:</span>
                            <span className="font-bold text-content">{formatIndianCurrency(selectedDistributor.walletBalance + selectedDistributor.creditLimit)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-contentSecondary">Wallet: {formatIndianCurrency(selectedDistributor.walletBalance)}</span>
                            <span className="text-contentSecondary">Credit: {formatIndianCurrency(selectedDistributor.creditLimit)}</span>
                        </div>
                    </div>
                )}
                {orderType === 'store' && selectedStore && (
                    <div className="bg-primary/10 p-3 rounded-lg text-sm space-y-2 mt-4">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-contentSecondary">Store Wallet Balance:</span>
                            <span className="font-bold text-content">{formatIndianCurrency(selectedStore.walletBalance)}</span>
                        </div>
                    </div>
                )}
            </Card>

            {isTargetSelected && (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                        <h3 className="text-lg font-semibold">
                            Order Items
                            {sourceLocationId && <span className="text-sm font-normal text-contentSecondary ml-2">(from {sourceLocationName})</span>}
                        </h3>
                        <Button onClick={handleAddItem} variant="secondary" size="sm" disabled={skus.length === 0}><PlusCircle size={14}/> Add Item</Button>
                    </div>
                    <div className="space-y-2">
                        {orderItems.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-slate-50">
                                <div className="col-span-12 sm:col-span-8">
                                    <Select id={`sku-${item.id}`} value={item.skuId} onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(item.id, 'skuId', e.target.value)}>
                                        {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </Select>
                                </div>
                                <div className="col-span-9 sm:col-span-3">
                                    <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} min="1" />
                                    {(() => {
                                        const stockInfo = sourceStock.get(item.skuId);
                                        const onHand = stockInfo?.quantity ?? 0;
                                        const reserved = stockInfo?.reserved ?? 0;
                                        const available = onHand - reserved;
                                        return (
                                            <p className="text-xs text-contentSecondary mt-1" title={`Total On Hand: ${onHand}`}>
                                                Available: <span className="font-semibold text-green-700">{available}</span> | 
                                                On Hold: <span className="font-semibold text-yellow-700">{reserved}</span>
                                            </p>
                                        );
                                    })()}
                                </div>
                                <div className="col-span-3 sm:col-span-1 text-right self-center">
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={20}/></button>
                                </div>
                            </div>
                        ))}
                         {orderItems.length === 0 && (
                            <div className="text-center text-contentSecondary py-6">
                                <p>No items added yet.</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}
            
            {appliedSchemes.length > 0 && (
                <Card>
                    <h3 className="font-semibold mb-4 text-lg flex items-center text-primary">
                        <Sparkles size={20} className="mr-2" />
                        Applied Promotions
                    </h3>
                    <div className="space-y-4">
                        {appliedSchemes.map(({ scheme, timesApplied }) => (
                            <div key={scheme.id} className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-green-800">{scheme.description}</p>
                                    <p className="text-sm text-green-700 mt-1">
                                        Condition met {timesApplied} time(s). You get{' '}
                                        <span className="font-bold">{timesApplied * scheme.getQuantity} x {skus.find(s => s.id === scheme.getSkuId)?.name}</span> free.
                                    </p>
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-green-600 text-white rounded-full flex-shrink-0 ml-4">
                                    APPLIED
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {displayItems.length > 0 && (
                <Card>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                            <tbody>
                                {displayItems.map((item, index) => (
                                    <tr key={`${item.skuId}-${index}`} className={`${item.isFreebie ? 'bg-green-50' : ''} text-sm`}>
                                        <td className="p-2 w-1/2">
                                            {item.skuName}
                                            {item.isFreebie && <Gift size={12} className="inline ml-2 text-green-600"/>}
                                            {item.hasTierPrice && <Star size={12} className="inline ml-2 text-yellow-500"/>}
                                            {item.schemeSource && <span className="text-xs text-contentSecondary ml-2">({item.schemeSource})</span>}
                                        </td>
                                        <td className="p-2 text-center">{item.quantity}</td>
                                        <td className="p-2 text-right">{formatIndianCurrency(item.unitPrice)}</td>
                                        <td className="p-2 text-right font-semibold">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-border">
                                    <td colSpan={3} className="p-2 text-right text-contentSecondary">Subtotal</td>
                                    <td className="p-2 text-right font-semibold">{formatIndianCurrency(subtotal)}</td>
                                </tr>
                                {orderType === 'distributor' && (
                                    <tr>
                                        <td colSpan={3} className="p-2 text-right text-contentSecondary">GST (Calculated)</td>
                                        <td className="p-2 text-right font-semibold">{formatIndianCurrency(gstAmount)}</td>
                                    </tr>
                                )}
                                <tr className="border-t border-border bg-slate-100">
                                    <td colSpan={3} className="p-2 text-right font-bold text-content">{orderType === 'distributor' ? 'Grand Total' : 'Total Value of Goods'}</td>
                                    <td className="p-2 text-right font-bold text-content text-lg">{formatIndianCurrency(grandTotal)}</td>
                                </tr>
                                {orderType === 'store' && selectedStore && (
                                     <tr className="text-sm">
                                        <td colSpan={3} className="pt-2 text-right text-contentSecondary">Store Wallet Balance</td>
                                        <td className="pt-2 text-right">{formatIndianCurrency(selectedStore.walletBalance)}</td>
                                    </tr>
                                )}
                                {orderType === 'store' && selectedStore && (
                                     <tr className={`font-bold ${selectedStore.walletBalance - grandTotal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        <td colSpan={3} className="py-1 text-right">Remaining Balance After</td>
                                        <td className="py-1 text-right">{formatIndianCurrency(selectedStore.walletBalance - grandTotal)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
            
            {stockCheck.hasIssues && (
                <div className="p-3 rounded-lg bg-yellow-100 text-yellow-800 flex items-start text-sm">
                    <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0"/>
                    <div>
                        <h3 className="font-semibold">Stock Alert: Not enough stock at {sourceLocationName}</h3>
                        <ul className="list-disc list-inside">
                            {stockCheck.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                        </ul>
                    </div>
                </div>
            )}
            
            {!fundsCheck && isTargetSelected && (
                 <div className="p-3 rounded-lg bg-red-100 text-red-800 flex items-start text-sm">
                    <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0"/>
                    <div>
                        <h3 className="font-semibold">Insufficient Funds</h3>
                        <p>The total amount exceeds the available wallet balance for this account.</p>
                    </div>
                </div>
            )}

            {statusMessage && (
                <div className={`flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg mt-4 gap-2 text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <div className="flex items-center">
                        {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                        {statusMessage.text}
                    </div>
                    {statusMessage.type === 'success' && (
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            className="bg-green-200 border-green-300 hover:bg-green-300"
                            onClick={() => navigate(statusMessage.orderId ? `/invoice/${statusMessage.orderId}` : `/dispatch-note/${statusMessage.transferId}`)}
                        >
                            <FileText size={14}/> {statusMessage.orderId ? 'View Invoice' : 'View Dispatch Note'}
                        </Button>
                    )}
                </div>
            )}

            <div className="flex justify-end pt-4">
                <Button onClick={handleSubmit} isLoading={isLoading} disabled={!canSubmit}>
                     {orderType === 'distributor' ? <><Users size={16}/> Place Order</> : <><Send size={16}/> Create Dispatch</>}
                </Button>
            </div>
        </div>
    );
};

export default PlaceOrder;
