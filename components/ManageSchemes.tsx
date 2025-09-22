import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { api } from '../services/api';
import { Scheme, SKU, UserRole, Distributor, Store } from '../types';
import { useAuth } from '../hooks/useAuth';
// FIX: Imported 'CheckCircle' from lucide-react to resolve an undefined component error.
import { PlusCircle, Edit, Save, X, Trash2, XCircle, History, ChevronDown, ChevronRight, RefreshCw, CheckCircle, Sparkles, Search } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/formatting';

type SchemeFormInputs = Omit<Scheme, 'id'> & { schemeType: 'global' | 'store' | 'distributor' };

const ManageSchemes: React.FC = () => {
  const { currentUser, portal } = useAuth();
  const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [stoppingSchemeId, setStoppingSchemeId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [showAssignments, setShowAssignments] = useState(false);
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');

  const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch } = useForm<SchemeFormInputs>({
    mode: 'onBlur',
    defaultValues: {
        schemeType: 'global'
    }
  });
  const schemeType = watch('schemeType');

  const fetchData = useCallback(async () => {
    if (!portal) return;
    setLoading(true);
    try {
        const [schemesData, skusData, distsData, storesData] = await Promise.all([
            api.getSchemes(portal),
            api.getSKUs(),
            api.getDistributors(portal),
            api.getStores(),
        ]);
        setAllSchemes(schemesData);
        setSkus(skusData);
        setDistributors(distsData);
        setStores(storesData);
    } catch (error) {
        console.error("Failed to fetch scheme data:", error);
    } finally {
        setLoading(false);
    }
  }, [portal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { activeSchemes, inactiveSchemes } = useMemo(() => {
    const today = new Date();
    const active: Scheme[] = [];
    const inactive: Scheme[] = [];
    allSchemes.forEach(scheme => {
        if (new Date(scheme.endDate) >= today && !scheme.stoppedDate) {
            active.push(scheme);
        } else {
            inactive.push(scheme);
        }
    });
    return { activeSchemes: active, inactiveSchemes: inactive };
  }, [allSchemes]);

  const { items: sortedActiveSchemes, requestSort: requestActiveSort, sortConfig: activeSortConfig } = useSortableData(activeSchemes, { key: 'description', direction: 'ascending' });
  const { items: sortedInactiveSchemes, requestSort: requestInactiveSort, sortConfig: inactiveSortConfig } = useSortableData(inactiveSchemes, { key: 'endDate', direction: 'descending' });

  const getSkuName = (id: string) => skus.find(s => s.id === id)?.name || 'N/A';

  const getSchemeScope = (scheme: Scheme): string => {
    if (scheme.isGlobal) return 'Global';
    if (scheme.distributorId) {
        const distName = distributors.find(d => d.id === scheme.distributorId)?.name;
        return `Distributor: ${distName || 'Unknown'}`;
    }
    if (scheme.storeId) {
        const storeName = stores.find(s => s.id === scheme.storeId)?.name;
        return `Store: ${storeName || 'Unknown'}`;
    }
    return 'Unknown';
  };

  const getStatusInfo = (scheme: Scheme) => {
    if (scheme.stoppedDate) {
        return {
            status: 'Stopped',
            date: scheme.stoppedDate,
            by: scheme.stoppedBy || 'N/A',
            chip: <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800"><XCircle size={12} /> Stopped</span>
        };
    }
    return {
        status: 'Ended',
        date: scheme.endDate,
        by: 'System (Expired)',
        chip: <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-contentSecondary"><CheckCircle size={12} /> Ended</span>
    };
  };

  const handleEdit = (scheme: Scheme) => {
    setEditingSchemeId(scheme.id);
    let type: 'global' | 'store' | 'distributor' = 'global';
    if (scheme.storeId) type = 'store';
    if (scheme.distributorId) type = 'distributor';

    reset({
        ...scheme,
        schemeType: type
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingSchemeId(null);
    reset({ schemeType: 'global' });
  };

  const handleAddNew = () => {
    setEditingSchemeId('new');
    reset({
      description: '',
      buySkuId: skus[0]?.id || '',
      buyQuantity: 10,
      getSkuId: skus[0]?.id || '',
      getQuantity: 1,
      startDate: '',
      endDate: '',
      schemeType: 'global',
      storeId: '',
      distributorId: ''
    });
  };
  
  const handleDelete = async (schemeId: string) => {
    if (currentUser?.role && window.confirm('Are you sure you want to delete this scheme?')) {
        try {
            await api.deleteScheme(schemeId, currentUser.role);
            fetchData();
        } catch (err) {
            alert((err as Error).message);
        }
    }
  };

  const handleStopScheme = async (scheme: Scheme) => {
    if (!currentUser) return;
    if (window.confirm(`Are you sure you want to stop the scheme "${scheme.description}"? This action will set its end date to today and cannot be undone.`)) {
        setStoppingSchemeId(scheme.id);
        try {
            await api.stopScheme(scheme.id, currentUser.username, currentUser.role);
            fetchData();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setStoppingSchemeId(null);
        }
    }
  };

  const handleReactivate = async (scheme: Scheme) => {
    if (!currentUser || currentUser.role !== UserRole.PLANT_ADMIN) return;
    if (window.confirm(`Are you sure you want to reactivate the scheme "${scheme.description}"? It will be active for the next 30 days.`)) {
        setReactivatingId(scheme.id);
        try {
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + 30);
            await api.reactivateScheme(scheme.id, newEndDate.toISOString(), currentUser.username, currentUser.role);
            await fetchData();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setReactivatingId(null);
        }
    }
  };
  
  const handleDurationChange = (duration: string) => {
    if (!duration) {
        setValue('startDate', '');
        setValue('endDate', '');
        return;
    }
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    if (duration === '3m') endDate.setMonth(endDate.getMonth() + 3);
    else if (duration === '6m') endDate.setMonth(endDate.getMonth() + 6);
    else if (duration === '1y') endDate.setFullYear(endDate.getFullYear() + 1);
    else if (duration === 'lifetime') endDate.setFullYear(endDate.getFullYear() + 100);
    
    setValue('startDate', startDate, { shouldValidate: true, shouldDirty: true });
    setValue('endDate', endDate.toISOString().split('T')[0], { shouldValidate: true, shouldDirty: true });
  };

  const onSave: SubmitHandler<SchemeFormInputs> = async (data) => {
    if (!currentUser?.role) return;
    setLoading(true);
    try {
      const { schemeType, storeId, distributorId, ...schemeCore } = data;
      const schemePayload: Omit<Scheme, 'id'> = {
        ...schemeCore,
        isGlobal: schemeType === 'global',
        storeId: schemeType === 'store' ? storeId : undefined,
        distributorId: schemeType === 'distributor' ? distributorId : undefined,
      };

      if (editingSchemeId === 'new') {
        await api.addScheme(schemePayload, currentUser.role);
      } else {
        await api.updateScheme({ ...schemePayload, id: editingSchemeId! }, currentUser.role);
      }
      fetchData();
      handleCancel();
    } catch (err) {
      console.error("Failed to save scheme:", err);
    } finally {
        setLoading(false);
    }
  };

  const schemesForDistributor = useMemo(() => {
    const map = new Map<string, Scheme[]>();
    const nonGlobalSchemes = allSchemes.filter(s => !s.isGlobal);
    const storeSchemes = nonGlobalSchemes.filter(s => s.storeId);
    const distSchemes = nonGlobalSchemes.filter(s => s.distributorId);

    distributors.forEach(dist => {
        const applicable: Scheme[] = [];
        if (dist.storeId) {
            applicable.push(...storeSchemes.filter(s => s.storeId === dist.storeId));
        }
        if (dist.hasSpecialSchemes) {
            applicable.push(...distSchemes.filter(s => s.distributorId === dist.id));
        }

        if (applicable.length > 0) {
            map.set(dist.id, applicable);
        }
    });

    return map;
  }, [allSchemes, distributors]);

  const filteredDistributorsForAssignments = useMemo(() => {
      return distributors.filter(d => 
          schemesForDistributor.has(d.id) &&
          d.name.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
      );
  }, [distributors, schemesForDistributor, assignmentSearchTerm]);
  
  if (!currentUser?.permissions?.includes('/schemes/manage')) {
    return <Card className="text-center"><p>You do not have permission to manage schemes.</p></Card>;
  }

  return (
    <div className="space-y-6">
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Manage Active Schemes</h2>
        <Button onClick={handleAddNew} disabled={!!editingSchemeId || loading || skus.length === 0} className="w-full sm:w-auto" title={skus.length === 0 ? "Add products before creating schemes" : undefined}><PlusCircle size={14}/> Add New Scheme</Button>
      </div>
      {/* Desktop Table View */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left min-w-[900px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <SortableTableHeader label="Description" sortKey="description" requestSort={requestActiveSort} sortConfig={activeSortConfig} />
              <th className="p-3 font-semibold text-contentSecondary">Details</th>
              <SortableTableHeader label="Scope" sortKey="isGlobal" requestSort={requestActiveSort} sortConfig={activeSortConfig} />
              <SortableTableHeader label="Start Date" sortKey="startDate" requestSort={requestActiveSort} sortConfig={activeSortConfig} />
              <SortableTableHeader label="End Date" sortKey="endDate" requestSort={requestActiveSort} sortConfig={activeSortConfig} />
              <th className="p-3 font-semibold text-contentSecondary text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedActiveSchemes.map(scheme => (
              <tr key={scheme.id} className="border-b border-border hover:bg-slate-50">
                <td className="p-3 font-medium">{scheme.description}</td>
                <td className="p-3">Buy {scheme.buyQuantity} x {getSkuName(scheme.buySkuId)}, Get {scheme.getQuantity} x {getSkuName(scheme.getSkuId)}</td>
                <td className="p-3">{getSchemeScope(scheme)}</td>
                <td className="p-3">{formatDateDDMMYYYY(scheme.startDate)}</td>
                <td className="p-3">{formatDateDDMMYYYY(scheme.endDate)}</td>
                <td className="p-3 text-right space-x-2">
                  <Button onClick={() => handleStopScheme(scheme)} variant="secondary" size="sm" className="p-2" isLoading={stoppingSchemeId === scheme.id} disabled={!!editingSchemeId || !!stoppingSchemeId} title="Stop Scheme"><XCircle size={16}/></Button>
                  <Button onClick={() => handleEdit(scheme)} variant="secondary" size="sm" className="p-2" disabled={!!editingSchemeId || !!stoppingSchemeId}><Edit size={16}/></Button>
                  <Button onClick={() => handleDelete(scheme.id)} variant="danger" size="sm" className="p-2" isLoading={loading} disabled={!!editingSchemeId || !!stoppingSchemeId}><Trash2 size={16}/></Button>
                </td>
              </tr>
            ))}
             {sortedActiveSchemes.length === 0 && (
                <tr><td colSpan={6} className="text-center p-6 text-contentSecondary">No active schemes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedActiveSchemes.map(scheme => (
          <Card key={scheme.id}>
            <p className="font-bold text-content">{scheme.description}</p>
            <p className="text-sm mt-1">
              Buy {scheme.buyQuantity} x <span className="font-medium">{getSkuName(scheme.buySkuId)}</span>, Get {scheme.getQuantity} x <span className="font-medium text-green-600">{getSkuName(scheme.getSkuId)}</span>
            </p>
            <div className="mt-4 pt-4 border-t text-sm space-y-2">
              <div className="flex justify-between"><span className="text-contentSecondary">Scope:</span> <span className="font-medium">{getSchemeScope(scheme)}</span></div>
              <div className="flex justify-between"><span className="text-contentSecondary">Active:</span> <span className="font-medium">{formatDateDDMMYYYY(scheme.startDate)} to {formatDateDDMMYYYY(scheme.endDate)}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
              <Button onClick={() => handleStopScheme(scheme)} variant="secondary" size="sm" className="p-2" isLoading={stoppingSchemeId === scheme.id} disabled={!!editingSchemeId || !!stoppingSchemeId} title="Stop Scheme"><XCircle size={16}/></Button>
              <Button onClick={() => handleEdit(scheme)} variant="secondary" size="sm" className="p-2" disabled={!!editingSchemeId || !!stoppingSchemeId}><Edit size={16}/></Button>
              <Button onClick={() => handleDelete(scheme.id)} variant="danger" size="sm" className="p-2" isLoading={loading} disabled={!!editingSchemeId || !!stoppingSchemeId}><Trash2 size={16}/></Button>
            </div>
          </Card>
        ))}
      </div>

    </Card>

     <Card>
        <div onClick={() => setShowAssignments(!showAssignments)} className="cursor-pointer flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles /> Distributor Scheme Assignments</h2>
            {showAssignments ? <ChevronDown /> : <ChevronRight />}
        </div>
        {showAssignments && (
            <div className="mt-4">
                <p className="text-sm text-contentSecondary mb-4">
                    This section lists all distributors with specific Store-level or Distributor-level schemes applied to them.
                </p>
                <div className="w-full sm:w-auto sm:max-w-xs mb-4">
                    <Input
                        id="search-assignments"
                        placeholder="Search distributors..."
                        value={assignmentSearchTerm}
                        onChange={(e) => setAssignmentSearchTerm(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <div className="space-y-4">
                    {filteredDistributorsForAssignments.map(dist => {
                        const schemesForDist = schemesForDistributor.get(dist.id);
                        if (!schemesForDist || schemesForDist.length === 0) return null;

                        return (
                            <Card key={dist.id}>
                                <h4 className="font-bold text-content">{dist.name}</h4>
                                <div className="mt-2 space-y-2 divide-y divide-border">
                                    {schemesForDist.map(scheme => (
                                        <div key={scheme.id} className="pt-2 first:pt-0">
                                            <p className="font-semibold text-sm">{scheme.description}</p>
                                            <p className="text-sm text-contentSecondary">
                                                Buy {scheme.buyQuantity} x <span className="font-medium">{getSkuName(scheme.buySkuId)}</span>,
                                                Get {scheme.getQuantity} x <span className="font-medium text-green-600">{getSkuName(scheme.getSkuId)}</span> Free
                                            </p>
                                            <p className="text-xs text-contentSecondary mt-1">
                                                (Source: {scheme.storeId ? `Store (${stores.find(s => s.id === scheme.storeId)?.name || 'Unknown'})` : 'Distributor Specific'})
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )
                    })}
                    {filteredDistributorsForAssignments.length === 0 && (
                        <p className="text-center p-6 text-contentSecondary">
                            No distributors with special schemes found{assignmentSearchTerm ? ` for "${assignmentSearchTerm}"` : ''}.
                        </p>
                    )}
                </div>
            </div>
        )}
    </Card>

    {editingSchemeId && (
        <Card className="border-t-2 border-primary">
            <form onSubmit={handleSubmit(onSave)}>
                <h4 className="text-md font-bold mb-4">{editingSchemeId === 'new' ? 'New Scheme' : 'Edit Scheme'}</h4>
                <div className="space-y-4">
                    <Input label="Description" {...register('description', { required: "Description is required" })} error={errors.description?.message} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Scope" {...register('schemeType', { required: true })}>
                            <option value="global">Global</option>
                            <option value="store">Store Specific</option>
                            <option value="distributor">Distributor Specific</option>
                        </Select>
                        {schemeType === 'store' && (
                            <Select label="Select Store" {...register('storeId', { required: 'Please select a store' })} error={errors.storeId?.message}>
                                <option value="">-- Choose Store --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                        )}
                        {schemeType === 'distributor' && (
                            <Select label="Select Distributor" {...register('distributorId', { required: 'Please select a distributor' })} error={errors.distributorId?.message}>
                                <option value="">-- Choose Distributor --</option>
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </Select>
                        )}
                    </div>
                    <div>
                        <Select label="Duration" onChange={(e) => handleDurationChange(e.target.value)} defaultValue="" error={errors.startDate?.message || errors.endDate?.message}>
                            <option value="" disabled>Select Duration</option>
                            <option value="3m">3 Months</option>
                            <option value="6m">6 Months</option>
                            <option value="1y">1 Year</option>
                            <option value="lifetime">Lifetime (100 years)</option>
                        </Select>
                        <input type="hidden" {...register('startDate', { required: "Duration is required" })} />
                        <input type="hidden" {...register('endDate', { required: "Duration is required" })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-2 border rounded-md bg-background">
                            <p className="font-semibold text-sm mb-1">Condition (Buy)</p>
                            <div className="flex gap-2"><Input label="Qty" type="number" {...register('buyQuantity', { required: true, valueAsNumber: true, min: 1 })} error={errors.buyQuantity?.message} /><Select label="Product" {...register('buySkuId', { required: true })}>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
                        </div>
                         <div className="p-2 border rounded-md bg-green-50">
                            <p className="font-semibold text-sm mb-1">Reward (Get)</p>
                            <div className="flex gap-2"><Input label="Qty" type="number" {...register('getQuantity', { required: true, valueAsNumber: true, min: 1 })} error={errors.getQuantity?.message} /><Select label="Product" {...register('getSkuId', { required: true })}>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" onClick={handleCancel} variant="secondary"><X size={16}/> Cancel</Button>
                        <Button type="submit" disabled={!isValid}><Save size={16}/> Save</Button>
                    </div>
                </div>
            </form>
        </Card>
    )}

    <Card>
      <div onClick={() => setShowHistory(!showHistory)} className="cursor-pointer flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2"><History /> Scheme History</h2>
        {showHistory ? <ChevronDown /> : <ChevronRight />}
      </div>
      {showHistory && (
        <>
        {/* Desktop Table View */}
        <div className="overflow-x-auto mt-4 hidden md:block">
            <table className="w-full text-left min-w-[1200px] text-sm">
                <thead className="bg-slate-100">
                    <tr>
                        <SortableTableHeader label="Description" sortKey="description" requestSort={requestInactiveSort} sortConfig={inactiveSortConfig} />
                        <th className="p-3 font-semibold text-contentSecondary">Details</th>
                        <SortableTableHeader label="Scope" sortKey="isGlobal" requestSort={requestInactiveSort} sortConfig={inactiveSortConfig} />
                        <SortableTableHeader label="Created On" sortKey="startDate" requestSort={requestInactiveSort} sortConfig={inactiveSortConfig} />
                        <SortableTableHeader label="Status" sortKey="stoppedDate" requestSort={requestInactiveSort} sortConfig={inactiveSortConfig} />
                        <SortableTableHeader label="End Date" sortKey="endDate" requestSort={requestInactiveSort} sortConfig={inactiveSortConfig} />
                        <th className="p-3 font-semibold text-contentSecondary">Ended By</th>
                        <th className="p-3 font-semibold text-contentSecondary text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedInactiveSchemes.map(scheme => {
                         const statusInfo = getStatusInfo(scheme);
                         return (
                            <tr key={scheme.id} className="border-b border-border hover:bg-slate-50">
                                <td className="p-3 font-medium">{scheme.description}</td>
                                <td className="p-3">Buy {scheme.buyQuantity} x {getSkuName(scheme.buySkuId)}, Get {scheme.getQuantity} x {getSkuName(scheme.getSkuId)}</td>
                                <td className="p-3">{getSchemeScope(scheme)}</td>
                                <td className="p-3">{formatDateTimeDDMMYYYY(scheme.startDate)}</td>
                                <td className="p-3">{statusInfo.chip}</td>
                                <td className="p-3">{formatDateTimeDDMMYYYY(statusInfo.date)}</td>
                                <td className="p-3">{statusInfo.by}</td>
                                <td className="p-3 text-right">
                                    <Button size="sm" variant="secondary" onClick={() => handleReactivate(scheme)} isLoading={reactivatingId === scheme.id} disabled={!!reactivatingId} title="Reactivate Scheme"><RefreshCw size={14} /> Retrieve</Button>
                                </td>
                            </tr>
                        );
                    })}
                     {sortedInactiveSchemes.length === 0 && (
                        <tr><td colSpan={8} className="text-center p-6 text-contentSecondary">No historical schemes found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 mt-4">
          {sortedInactiveSchemes.map(scheme => {
            const statusInfo = getStatusInfo(scheme);
            return (
              <Card key={scheme.id}>
                <p className="font-bold text-content">{scheme.description}</p>
                <div className="mt-2 pt-2 border-t text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-contentSecondary">Status:</span> <span className="font-medium">{statusInfo.chip}</span></div>
                  <div className="flex justify-between"><span className="text-contentSecondary">End Date:</span> <span className="font-medium">{formatDateTimeDDMMYYYY(statusInfo.date)}</span></div>
                  <div className="flex justify-between"><span className="text-contentSecondary">Ended By:</span> <span className="font-medium">{statusInfo.by}</span></div>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button size="sm" variant="secondary" onClick={() => handleReactivate(scheme)} isLoading={reactivatingId === scheme.id} disabled={!!reactivatingId} title="Reactivate Scheme"><RefreshCw size={14} /> Retrieve</Button>
                </div>
              </Card>
            )
          })}
        </div>
        </>
      )}
    </Card>
    </div>
  );
};

export default ManageSchemes;