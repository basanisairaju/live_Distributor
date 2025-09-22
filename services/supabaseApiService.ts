import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApiService } from './apiService.interface';
import {
  User, UserRole, Distributor, Order, OrderStatus, OrderItem, SKU, Scheme, WalletTransaction,
  Notification, PriceTier, PriceTierItem, EnrichedOrderItem, EnrichedWalletTransaction, Store,
  InvoiceData, OrderReturn, ReturnStatus, EnrichedOrderReturn, StockItem, EnrichedStockItem,
  StockLedgerEntry, StockTransfer, StockTransferStatus, StockTransferItem,
  EnrichedStockTransfer, EnrichedStockTransferItem, DispatchNoteData, PortalState, TransactionType, StockMovementType,
} from '../types';

// --- Type Aliases for Supabase Schema (snake_case) ---
type DbProfile = {
  id: string;
  username: string;
  role: string;
  store_id?: string;
  permissions?: string[];
  password?: string;
};

// --- Helper Functions for Case Conversion ---
const toCamel = (s: string): string => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('_', ''));
const toSnake = (s: string): string => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const convertKeys = (obj: any, converter: (s: string) => string): any => {
  if (Array.isArray(obj)) return obj.map(v => convertKeys(v, converter));
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
      acc[converter(key)] = convertKeys(obj[key], converter);
      return acc;
    }, {});
  }
  return obj;
};
const snakeToCamel = <T>(obj: any): T => convertKeys(obj, toCamel) as T;
const camelToSnake = (obj: any): any => convertKeys(obj, toSnake);

// --- SupabaseApiService Implementation ---
export class SupabaseApiService implements ApiService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not found. Please ensure SUPABASE_URL and SUPABASE_KEY are in your environment variables.");
      // Create a dummy client to avoid crashing the app immediately, allowing for a better error message.
      this.supabase = createClient('http://localhost:54321', 'invalid-key');
    } else {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // --- Auth ---
  async login(email: string, pass: string): Promise<User> {
    // Note: Storing and comparing plaintext passwords is a major security risk.
    // This should be replaced with a secure hashing mechanism (e.g., via an RPC call to a Supabase Edge Function).
    const { data: profileData, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('username', email)
      .single();

    if (error) {
        if (error.code === 'PGRST116') { // PostgREST code for "exact one row not found"
            throw new Error('Invalid username or password');
        }
        throw error;
    }

    if (!profileData) {
      throw new Error('Invalid username or password');
    }
    
    const dbProfile = profileData as DbProfile;
    // Direct password comparison as requested by the user
    if (dbProfile.password !== pass) {
        throw new Error('Invalid username or password');
    }

    const { password, ...userProfile } = snakeToCamel<any>(dbProfile);

    return userProfile as User;
  }

  async logout(): Promise<void> {
    // No server-side session to clear with this custom auth method.
    // Client-side session is cleared in useAuth.
    return Promise.resolve();
  }

  // --- Generic Helpers ---
  private async _getAll<T>(tableName: string): Promise<T[]> {
      const { data, error } = await this.supabase.from(tableName).select('*');
      if (error) throw error;
      return snakeToCamel<T[]>(data || []);
  }
  private async _getById<T>(tableName: string, id: string): Promise<T | null> {
      const { data, error } = await this.supabase.from(tableName).select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? snakeToCamel<T>(data) : null;
  }
  private async _add<T>(tableName: string, payload: Omit<T, 'id'>): Promise<T> {
      const { data, error } = await this.supabase.from(tableName).insert(camelToSnake(payload)).select().single();
      if (error) throw error;
      return snakeToCamel<T>(data);
  }
  private async _update<T extends {id: any}>(tableName: string, payload: T): Promise<T> {
      const { id, ...updateData } = payload;
      const { data, error } = await this.supabase.from(tableName).update(camelToSnake(updateData)).eq('id', id).select().single();
      if (error) throw error;
      return snakeToCamel<T>(data);
  }
  private async _delete(tableName: string, id: string): Promise<void> {
      const { error } = await this.supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
  }
  
   // --- Users, Stores, SKUs, Price Tiers ---
  async getUsers(portalState: PortalState | null): Promise<User[]> {
    let query = this.supabase.from('profiles').select('id, username, role, store_id, permissions');

    if (portalState?.type === 'store') {
        query = query.eq('store_id', portalState.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel<User[]>(data || []);
  }

  async addUser(userData: Omit<User, 'id'>, role: UserRole): Promise<User> {
    const { data, error } = await this.supabase
        .from('profiles')
        .insert(camelToSnake(userData))
        .select()
        .single();
    if (error) throw error;
    
    const { password, ...newUser } = snakeToCamel<any>(data);
    return newUser as User;
  }

  async updateUser(userData: User, role: UserRole): Promise<User> {
    const { id, ...updateData } = userData;
    
    if (updateData.password === '' || updateData.password === undefined || updateData.password === null) {
        delete updateData.password;
    }

    const { data, error } = await this.supabase
        .from('profiles')
        .update(camelToSnake(updateData))
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    const { password, ...updatedUser } = snakeToCamel<any>(data);
    return updatedUser as User;
  }

  async deleteUser(userId: string, currentUserId: string, role: UserRole): Promise<void> {
    if (userId === currentUserId) throw new Error("You cannot delete your own account.");
    return this._delete('profiles', userId);
  }
  
  async getStores(): Promise<Store[]> { return this._getAll<Store>('stores'); }
  async getStoreById(id: string): Promise<Store | null> { return this._getById<Store>('stores', id); }
  async addStore(storeData: Omit<Store, 'id' | 'walletBalance'>): Promise<Store> { return this._add<Store>('stores', { ...storeData, walletBalance: 0 }); }
  async updateStore(storeData: Store): Promise<Store> { return this._update<Store>('stores', storeData); }
  async deleteStore(storeId: string): Promise<void> { return this._delete('stores', storeId); }
  async getSKUs(): Promise<SKU[]> { return this._getAll<SKU>('skus'); }
  async addSKU(skuData: Omit<SKU, 'id'>, role: UserRole): Promise<SKU> { return this._add<SKU>('skus', skuData); }
  async updateSKU(skuData: SKU, role: UserRole): Promise<SKU> { return this._update<SKU>('skus', skuData); }
  async getPriceTiers(): Promise<PriceTier[]> { return this._getAll<PriceTier>('price_tiers'); }
  async addPriceTier(tierData: Omit<PriceTier, 'id'>, role: UserRole): Promise<PriceTier> { return this._add<PriceTier>('price_tiers', tierData); }
  async updatePriceTier(tierData: PriceTier, role: UserRole): Promise<PriceTier> { return this._update<PriceTier>('price_tiers', tierData); }
  async deletePriceTier(tierId: string, role: UserRole): Promise<void> { return this._delete('price_tiers', tierId); }
  async getAllPriceTierItems(): Promise<PriceTierItem[]> { return this._getAll<PriceTierItem>('price_tier_items'); }
  async setPriceTierItems(tierId: string, items: PriceTierItem[], role: UserRole): Promise<void> {
    const { error: deleteError } = await this.supabase.from('price_tier_items').delete().eq('tier_id', tierId);
    if (deleteError) throw deleteError;
    if (items.length > 0) {
        const payload = items.map(item => camelToSnake({ tierId, ...item }));
        const { error: insertError } = await this.supabase.from('price_tier_items').insert(payload);
        if (insertError) throw insertError;
    }
  }

  // --- Distributors ---
  async getDistributors(portalState: PortalState | null): Promise<Distributor[]> {
    let query = this.supabase.from('distributors').select('*');
    if (portalState?.type === 'store') query = query.eq('store_id', portalState.id);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel<Distributor[]>(data || []);
  }
  async getDistributorById(id: string): Promise<Distributor | null> { return this._getById<Distributor>('distributors', id); }
  async addDistributor(distributorData: Omit<Distributor, 'id'|'walletBalance'|'dateAdded'>, portalState: PortalState | null): Promise<Distributor> {
    const payload = {...distributorData, storeId: portalState?.type === 'store' ? portalState.id : (distributorData.storeId || null), walletBalance: 0, dateAdded: new Date().toISOString()};
    return this._add<Distributor>('distributors', payload);
  }
  async updateDistributor(distributorData: Distributor): Promise<Distributor> { return this._update<Distributor>('distributors', distributorData); }
  
  // --- Simplified Reads ---
  async getOrders(portalState: PortalState | null): Promise<Order[]> { const dists = await this.getDistributors(portalState); if (dists.length === 0) return []; const { data, error } = await this.supabase.from('orders').select('*').in('distributor_id', dists.map(d=>d.id)); if (error) throw error; return snakeToCamel<Order[]>(data || []); }
  async getOrdersByDistributor(distributorId: string): Promise<Order[]> { const { data, error } = await this.supabase.from('orders').select('*').eq('distributor_id', distributorId); if (error) throw error; return snakeToCamel<Order[]>(data || []); }
  async getAllOrderItems(portalState: PortalState | null): Promise<OrderItem[]> { const orders = await this.getOrders(portalState); if(orders.length === 0) return []; const { data, error } = await this.supabase.from('order_items').select('*').in('order_id', orders.map(o=>o.id)); if (error) throw error; return snakeToCamel<OrderItem[]>(data || []); }
  async getSchemes(portalState: PortalState | null): Promise<Scheme[]> { const { data, error } = await this.supabase.from('schemes').select('*'); if (error) throw error; return snakeToCamel<Scheme[]>(data || []); }
  async getGlobalSchemes(): Promise<Scheme[]> { const { data, error } = await this.supabase.from('schemes').select('*').eq('is_global', true); if (error) throw error; return snakeToCamel<Scheme[]>(data || []); }
  async getSchemesByDistributor(distributorId: string): Promise<Scheme[]> { const { data, error } = await this.supabase.from('schemes').select('*').eq('distributor_id', distributorId); if (error) throw error; return snakeToCamel<Scheme[]>(data || []); }
  async getSchemesByStore(storeId: string): Promise<Scheme[]> { const { data, error } = await this.supabase.from('schemes').select('*').eq('store_id', storeId); if (error) throw error; return snakeToCamel<Scheme[]>(data || []); }
  async addScheme(schemeData: Omit<Scheme, 'id'>, role: UserRole): Promise<Scheme> { if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied."); return this._add<Scheme>('schemes', schemeData); }
  async updateScheme(schemeData: Scheme, role: UserRole): Promise<Scheme> { if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied."); return this._update<Scheme>('schemes', schemeData); }
  async deleteScheme(schemeId: string, role: UserRole): Promise<void> { if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied."); return this._delete('schemes', schemeId); }
  async stopScheme(schemeId: string, username: string, role: UserRole): Promise<void> { if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied."); const today = new Date().toISOString(); const { error } = await this.supabase.from('schemes').update({ end_date: today, stopped_by: username, stopped_date: today, }).eq('id', schemeId); if (error) throw error; }
  async getNotifications(): Promise<Notification[]> { const { data, error } = await this.supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20); if(error) throw error; return snakeToCamel<Notification[]>(data || []); }
  async markNotificationAsRead(id: string): Promise<void> { const { error } = await this.supabase.from('notifications').update({ is_read: true }).eq('id', id); if (error) throw error; }
  async markAllNotificationsAsRead(): Promise<void> { const { data: unread } = await this.supabase.from('notifications').select('id').eq('is_read', false); if (unread && unread.length > 0) { const { error } = await this.supabase.from('notifications').update({ is_read: true }).in('id', unread.map(u => u.id)); if (error) throw error; } }
  async getStockLedger(locationId: 'plant' | string): Promise<StockLedgerEntry[]> { const { data, error } = await this.supabase.from('stock_ledger_entries').select('*').eq('location_id', locationId); if (error) throw error; return snakeToCamel<StockLedgerEntry[]>(data || []); }
  
  // --- Complex Reads (Joins) ---
  async getOrderItems(orderId: string): Promise<EnrichedOrderItem[]> {
    const { data, error } = await this.supabase.from('order_items').select('*, skus(name, hsn_code, gst_percentage)').eq('order_id', orderId);
    if (error) throw error;
    // FIX: Destructure the nested 'skus' object and spread the rest of the camelCased properties to create a valid EnrichedOrderItem.
    const enriched = (data || []).map((item: any) => {
        const { skus, ...rest } = snakeToCamel<any>(item);
        return {
            ...rest,
            skuName: skus?.name || '?',
            hsnCode: skus?.hsnCode || '?',
            gstPercentage: skus?.gstPercentage || 0
        };
    });
    return enriched;
  }
  async getReturns(status: ReturnStatus, portalState: PortalState | null): Promise<EnrichedOrderReturn[]> {
     const distributors = await this.getDistributors(portalState);
     const distributorIds = distributors.map(d => d.id);
     if (distributorIds.length === 0) return [];
     const { data, error } = await this.supabase.from('order_returns').select('*, order_return_items(*, skus(name)), distributors(name)').eq('status', status).in('distributor_id', distributorIds);
     if (error) throw error;
     // FIX: Destructure nested join properties and correctly map to the enriched type to satisfy the EnrichedOrderReturn type.
     const enriched = (data || []).map((ret: any) => {
        const { distributors, orderReturnItems, ...rest } = snakeToCamel<any>(ret);
        return {
            ...rest,
            distributorName: distributors?.name,
            skuDetails: orderReturnItems?.map((item: any) => ({ 
                skuId: item.skuId, 
                skuName: item.skus.name, 
                quantity: item.quantity, 
                unitPrice: 0 /* Not easily available */ 
            })) || []
        };
     });
     return enriched;
  }
  async getStock(locationId: 'plant' | string): Promise<EnrichedStockItem[]> {
      const { data, error } = await this.supabase.from('stock_items').select('*, skus(name)').eq('location_id', locationId);
      if (error) throw error;
      // FIX: Destructure the nested 'skus' object and spread the rest of the camelCased properties to create a valid EnrichedStockItem.
      const enriched = (data || []).map((item: any) => {
        const { skus, ...rest } = snakeToCamel<any>(item);
        return {
            ...rest,
            skuName: skus?.name,
        };
      });
      return enriched;
  }
  async getAllWalletTransactions(portalState: PortalState | null): Promise<EnrichedWalletTransaction[]> {
      // NOTE: This is not performant for large datasets. A database VIEW is recommended.
      const dists = await this.getDistributors(portalState);
      const stores = await this.getStores();
      const distMap = new Map(dists.map(d => [d.id, d.name]));
      const storeMap = new Map(stores.map(s => [s.id, s.name]));
      
      const { data, error } = await this.supabase.from('wallet_transactions').select('*');
      if (error) throw error;
      const transactions = snakeToCamel<WalletTransaction[]>(data || []);

      return transactions
        .filter(tx => (tx.distributorId && distMap.has(tx.distributorId)) || (tx.storeId && storeMap.has(tx.storeId)))
        .map(tx => ({
            ...tx,
            accountName: tx.distributorId ? distMap.get(tx.distributorId)! : storeMap.get(tx.storeId!)!,
            accountType: tx.distributorId ? 'Distributor' : 'Store'
        }));
  }
  async getWalletTransactionsByDistributor(distributorId: string): Promise<EnrichedWalletTransaction[]> {
    const {data, error} = await this.supabase.from('wallet_transactions').select('*').eq('distributor_id', distributorId);
    if(error) throw error;
    const txs = snakeToCamel<WalletTransaction[]>(data || []);
    const dist = await this.getDistributorById(distributorId);
    return txs.map(tx => ({...tx, accountName: dist?.name || '?', accountType: 'Distributor'}));
  }
  async getInvoiceData(orderId: string): Promise<InvoiceData | null> { const { data: orderData, error: orderError } = await this.supabase.from('orders').select('*, distributors(*)').eq('id', orderId).single(); if (orderError) throw orderError; const items = await this.getOrderItems(orderId); return { order: snakeToCamel(orderData), distributor: snakeToCamel(orderData.distributors), items } as InvoiceData; }
  // FIX: Destructure the nested 'stores' object to create a valid EnrichedStockTransfer.
  async getStockTransfers(): Promise<EnrichedStockTransfer[]> { const { data, error } = await this.supabase.from('stock_transfers').select('*, stores(name)'); if (error) throw error; const enriched = (data || []).map((item: any) => { const { stores, ...rest } = snakeToCamel<any>(item); return { ...rest, destinationStoreName: stores?.name }; }); return enriched; }
  // FIX: Destructure the nested 'skus' object to create a valid EnrichedStockTransferItem.
  async getEnrichedStockTransferItems(transferId: string): Promise<EnrichedStockTransferItem[]> { const { data, error } = await this.supabase.from('stock_transfer_items').select('*, skus(name, hsn_code, gst_percentage)').eq('transfer_id', transferId); if (error) throw error; const enriched = (data || []).map((item: any) => { const { skus, ...rest } = snakeToCamel<any>(item); return { ...rest, skuName: skus?.name, hsnCode: skus?.hsnCode, gstPercentage: skus?.gstPercentage }; }); return enriched; }
  async getDispatchNoteData(transferId: string): Promise<DispatchNoteData | null> { const { data: transferData, error: transferError } = await this.supabase.from('stock_transfers').select('*, stores(*)').eq('id', transferId).single(); if (transferError) throw transferError; const items = await this.getEnrichedStockTransferItems(transferId); return { transfer: snakeToCamel(transferData), store: snakeToCamel(transferData.stores), items }; }
  
  // --- Transactional Logic (RPC Recommended) ---
  // NOTE: The following methods perform actions that MUST be atomic.
  // Using a series of client-side calls is NOT recommended for production as it can lead to data inconsistency.
  // These should be converted to Supabase Edge Functions (RPCs) for data integrity.

  async placeOrder(distributorId: string, items: { skuId: string; quantity: number }[], username: string): Promise<Order> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async updateOrderItems(orderId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async updateOrderStatus(orderId: string, status: OrderStatus, username: string): Promise<void> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async deleteOrder(orderId: string, remarks: string, username: string): Promise<void> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async initiateOrderReturn(orderId: string, items: { skuId: string; quantity: number }[], username: string, remarks: string): Promise<OrderReturn> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async confirmOrderReturn(returnId: string, username: string): Promise<void> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async rechargeWallet(distributorId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string): Promise<void> {
    const { data: dist, error: distErr } = await this.supabase.from('distributors').select('wallet_balance').eq('id', distributorId).single();
    if(distErr) throw distErr;
    const newBalance = dist.wallet_balance + amount;

    const { error: txErr } = await this.supabase.from('wallet_transactions').insert(camelToSnake({
      distributorId, date, type: TransactionType.RECHARGE, amount, balanceAfter: newBalance,
      paymentMethod, remarks, initiatedBy: username
    }));
    if(txErr) throw txErr;

    const { error: updateErr } = await this.supabase.from('distributors').update({ wallet_balance: newBalance }).eq('id', distributorId);
    if(updateErr) throw updateErr; // NOTE: Transaction is now inconsistent if this fails.
  }
  async rechargeStoreWallet(storeId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string): Promise<void> {
    const { data: store, error: storeErr } = await this.supabase.from('stores').select('wallet_balance').eq('id', storeId).single();
    if(storeErr) throw storeErr;
    const newBalance = store.wallet_balance + amount;
    
    const { error: txErr } = await this.supabase.from('wallet_transactions').insert(camelToSnake({
      storeId, date, type: TransactionType.RECHARGE, amount, balanceAfter: newBalance,
      paymentMethod, remarks, initiatedBy: username
    }));
    if(txErr) throw txErr;
    
    const { error: updateErr } = await this.supabase.from('stores').update({ wallet_balance: newBalance }).eq('id', storeId);
    if(updateErr) throw updateErr; // NOTE: Transaction is now inconsistent if this fails.
  }
  async addPlantProduction(items: { skuId: string; quantity: number }[], username: string): Promise<void> {
    for (const item of items) {
      const { data } = await this.supabase.rpc('add_stock', {
        p_location_id: 'plant',
        p_sku_id: item.skuId,
        p_quantity_change: item.quantity
      });
      const newBalance = data;
      
      const { error: ledgerErr } = await this.supabase.from('stock_ledger_entries').insert(camelToSnake({
          skuId: item.skuId, date: new Date().toISOString(), quantityChange: item.quantity, balanceAfter: newBalance,
          type: StockMovementType.PRODUCTION, locationId: 'plant', notes: 'Daily Production', initiatedBy: username
      }));
      if (ledgerErr) throw ledgerErr;
    }
  }
  async createStockTransfer(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<StockTransfer> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async updateStockTransferStatus(transferId: string, status: StockTransferStatus, username: string): Promise<void> { throw new Error("This complex operation should be a single Supabase RPC call for data integrity."); }
  async transferStockToStore(): Promise<void> { throw new Error("transferStockToStore is deprecated."); }
  async reactivateScheme(schemeId: string, newEndDate: string, username: string, role: UserRole): Promise<Scheme> {
      const { data, error } = await this.supabase.from('schemes').update({ end_date: newEndDate, stopped_by: null, stopped_date: null }).eq('id', schemeId).select().single();
      if (error) throw error;
      return snakeToCamel<Scheme>(data);
  }
}