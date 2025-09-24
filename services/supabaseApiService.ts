import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApiService, BackendStatus } from './apiService.interface';
import {
  User, UserRole, Distributor, Order, OrderStatus, OrderItem, SKU, Scheme, WalletTransaction,
  Notification, PriceTier, PriceTierItem, EnrichedOrderItem, EnrichedWalletTransaction, Store,
  InvoiceData, OrderReturn, ReturnStatus, EnrichedOrderReturn, StockItem, EnrichedStockItem,
  StockLedgerEntry, StockTransfer, StockTransferStatus, StockTransferItem,
  EnrichedStockTransfer, EnrichedStockTransferItem, DispatchNoteData, PortalState, TransactionType, StockMovementType,
} from '../types';
import { menuItems } from '../constants';

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
    const normalizedUsername = email.trim();
    console.log(`[Login Attempt] Querying for username (case-insensitive): '${normalizedUsername}'`);
    
    const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('id, username, role, store_id, permissions')
        .ilike('username', normalizedUsername)
        .eq('password', pass)
        .single();

    if (error) {
        console.error('[Supabase Login Error]', { message: error.message, details: error.details, code: error.code });
        if (error.code === 'PGRST116') { // "The result contains 0 rows"
            console.log("[Login Diagnostics] The query returned 0 rows. This means either the user does not exist in the database, or the password does not match. Please check the [Seed] logs on your Vercel deployment to see if the 'admin' user was created correctly.");
            throw new Error("Invalid username or password.");
        }
        throw new Error(`Database error: ${error.message}`);
    }

    if (!profile) {
        // This case should be covered by the error code above, but as a fallback.
        console.log("[Login Diagnostics] Query succeeded but returned no profile. This is unexpected but points to a credential mismatch.");
        throw new Error("Invalid username or password.");
    }

    console.log(`[Login] Successfully authenticated user: '${profile.username}'`);
    return snakeToCamel<User>(profile);
  }
  async logout(): Promise<void> {
    // In a real app, this would call supabase.auth.signOut()
    return Promise.resolve();
  }
  async seedAdminUser(): Promise<void> {
    console.log("[Seed] -----------------------------------------");
    console.log("[Seed] Starting admin user seed process...");
    const adminUsername = 'admin';
    const adminPassword = 'password';
    console.log(`[Seed] Target credentials -> username: '${adminUsername}', password: '${adminPassword}'`);

    try {
        console.log(`[Seed] Step 1: Checking for existing user '${adminUsername}'...`);
        const { data: existingUser, error: fetchError } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('username', adminUsername)
            .maybeSingle();

        if (fetchError) {
            console.error('[Seed] FATAL: Error fetching admin user.', { message: fetchError.message, details: fetchError.details });
            throw new Error(`Database error during seeding: ${fetchError.message}`);
        }

        if (existingUser) {
            console.log(`[Seed] Step 2: User '${adminUsername}' found. Checking if password needs update...`);
            if (existingUser.password !== adminPassword) {
                console.log("[Seed] Step 3: Password mismatch found. Updating password...");
                const { error: updateError } = await this.supabase
                    .from('profiles')
                    .update({ password: adminPassword })
                    .eq('id', existingUser.id);

                if (updateError) {
                    console.error('[Seed] FATAL: Error updating admin password.', { message: updateError.message, details: updateError.details });
                    throw new Error(`Failed to update admin password: ${updateError.message}`);
                }
                console.log("[Seed] Step 3 SUCCESS: Admin password updated.");
            } else {
                console.log("[Seed] Step 3: Password matches. No update needed.");
            }
        } else {
            console.log(`[Seed] Step 2: User '${adminUsername}' not found. Creating new user...`);
            const { error: createError } = await this.supabase
                .from('profiles')
                .insert({
                    username: adminUsername,
                    password: adminPassword,
                    role: UserRole.PLANT_ADMIN,
                    permissions: menuItems.map(item => item.path),
                });
            
            if (createError) {
                console.error('[Seed] FATAL: Error creating admin user.', { message: createError.message, details: createError.details });
                throw new Error(`Failed to create admin user: ${createError.message}`);
            }
            console.log("[Seed] Step 2 SUCCESS: New admin user created.");
        }
        console.log("[Seed] Admin user seed process completed successfully.");
        console.log("[Seed] -----------------------------------------");
    } catch (e: any) {
        console.error("[Seed] An unexpected error occurred during the seed process.", e);
        console.log("[Seed] -----------------------------------------");
    }
  }

  async checkBackendStatus(): Promise<BackendStatus> {
    try {
        // Attempt a simple, quick query to check credentials and connectivity.
        const { error } = await this.supabase.from('profiles').select('id').limit(1);

        if (error) {
            console.error('[Backend Check Error]', { message: error.message, details: error.details });
            // Provide more specific guidance based on common errors
            if (error.message.includes('JWT') || error.message.includes('Key')) {
                 return { status: 'error', message: `Authentication error: Invalid API Key. Please ensure your SUPABASE_KEY is correct.` };
            }
            if (error.message.includes('fetch')) {
                return { status: 'error', message: `Network error: Could not reach the database. Please check your SUPABASE_URL.` };
            }
            return { status: 'error', message: `Connection failed: ${error.message}. Check your Supabase URL, Key, and network access rules.` };
        }

        return { status: 'ok', message: 'Backend Connected' };
    } catch (e: any) {
        console.error('[Backend Check Exception]', e);
        return { status: 'error', message: `An unexpected error occurred: ${e.message}` };
    }
  }

  // --- Users ---
  async getUsers(portalState: PortalState | null): Promise<User[]> {
    // This method will be implemented later to fetch real data.
    return Promise.resolve([]);
  }
  async addUser(userData: Omit<User, 'id'>, role: UserRole): Promise<User> {
    throw new Error('Method not implemented.');
  }
  async updateUser(userData: User, role: UserRole): Promise<User> {
    throw new Error('Method not implemented.');
  }
  async deleteUser(userId: string, currentUserId: string, role: UserRole): Promise<void> {
    throw new Error('Method not implemented.');
  }
  
  // --- Stores ---
  async getStores(): Promise<Store[]> {
    throw new Error('Method not implemented.');
  }
  async getStoreById(id: string): Promise<Store | null> {
    throw new Error('Method not implemented.');
  }
  async addStore(storeData: Omit<Store, 'id' | 'walletBalance'>): Promise<Store> {
    throw new Error('Method not implemented.');
  }
  async updateStore(storeData: Store): Promise<Store> {
    throw new Error('Method not implemented.');
  }
  async deleteStore(storeId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // --- Distributors ---
  async getDistributors(portalState: PortalState | null): Promise<Distributor[]> {
    throw new Error('Method not implemented.');
  }
  async getDistributorById(id: string): Promise<Distributor | null> {
    throw new Error('Method not implemented.');
  }
  async addDistributor(
    distributorData: Omit<Distributor, 'id' | 'walletBalance' | 'dateAdded'>, 
    portalState: PortalState | null,
    initialScheme?: Omit<Scheme, 'id' | 'isGlobal' | 'distributorId' | 'storeId' | 'stoppedBy' | 'stoppedDate'>
  ): Promise<Distributor> {
    throw new Error('Method not implemented.');
  }
  async updateDistributor(distributorData: Distributor, role: UserRole): Promise<Distributor> {
      throw new Error('Method not implemented.');
  }


  // --- Orders & Items ---
  async getOrders(portalState: PortalState | null): Promise<Order[]> {
    throw new Error('Method not implemented.');
  }
  async getOrdersByDistributor(distributorId: string): Promise<Order[]> {
    throw new Error('Method not implemented.');
  }
  async getAllOrderItems(portalState: PortalState | null): Promise<OrderItem[]> {
      throw new Error('Method not implemented.');
  }
  async getOrderItems(orderId: string): Promise<EnrichedOrderItem[]> {
    throw new Error('Method not implemented.');
  }

  // --- Complex Actions ---
  async placeOrder(distributorId: string, items: { skuId: string; quantity: number }[]): Promise<Order> {
    throw new Error('Method not implemented.');
  }
  async updateOrderItems(orderId: string, items: { skuId: string; quantity: number }[]): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
      throw new Error('Method not implemented.');
  }
  async deleteOrder(orderId: string, remarks: string): Promise<void> {
      throw new Error('Method not implemented.');
  }
  
  // --- Returns ---
  async initiateOrderReturn(orderId: string, itemsToReturn: { skuId: string; quantity: number }[], remarks: string): Promise<OrderReturn> {
      throw new Error('Method not implemented.');
  }
  
  async getReturns(status: ReturnStatus, portalState: PortalState | null): Promise<EnrichedOrderReturn[]> {
      throw new Error('Method not implemented.');
  }
  async confirmOrderReturn(returnId: string): Promise<void> {
      throw new Error('Method not implemented.');
  }

  // --- SKUs ---
  async getSKUs(): Promise<SKU[]> { throw new Error('Method not implemented.'); }
  async addSKU(skuData: Omit<SKU, 'id'>, role: UserRole): Promise<SKU> {
      throw new Error('Method not implemented.');
  }
  async updateSKU(skuData: SKU, role: UserRole): Promise<SKU> {
      throw new Error('Method not implemented.');
  }

  // --- Schemes ---
  async getSchemes(portalState: PortalState | null): Promise<Scheme[]> {
    throw new Error('Method not implemented.');
  }
  async getGlobalSchemes(): Promise<Scheme[]> {
      throw new Error('Method not implemented.');
  }
  async getSchemesByDistributor(distributorId: string): Promise<Scheme[]> {
      throw new Error('Method not implemented.');
  }
  async getSchemesByStore(storeId: string): Promise<Scheme[]> {
    throw new Error('Method not implemented.');
  }
  async addScheme(schemeData: Omit<Scheme, 'id'>, role: UserRole): Promise<Scheme> {
      throw new Error('Method not implemented.');
  }
  async updateScheme(schemeData: Scheme, role: UserRole): Promise<Scheme> {
      throw new Error('Method not implemented.');
  }
  async deleteScheme(schemeId: string, role: UserRole): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async stopScheme(schemeId: string, username: string, role: UserRole): Promise<void> {
      throw new Error('Method not implemented.');
  }
  async reactivateScheme(schemeId: string, newEndDate: string, username: string, role: UserRole): Promise<Scheme> {
    throw new Error('Method not implemented.');
  }

  // --- Price Tiers ---
  async getPriceTiers(): Promise<PriceTier[]> { throw new Error('Method not implemented.'); }
  async addPriceTier(tierData: Omit<PriceTier, 'id'>, role: UserRole): Promise<PriceTier> {
      throw new Error('Method not implemented.');
  }
  async updatePriceTier(tierData: PriceTier, role: UserRole): Promise<PriceTier> {
      throw new Error('Method not implemented.');
  }
  async deletePriceTier(tierId: string, role: UserRole): Promise<void> {
      throw new Error('Method not implemented.');
  }
  async getAllPriceTierItems(): Promise<PriceTierItem[]> { throw new Error('Method not implemented.'); }
  async setPriceTierItems(tierId: string, items: { skuId: string, price: number }[], role: UserRole): Promise<void> {
      throw new Error('Method not implemented.');
  }

  // --- Wallet ---
  async getAllWalletTransactions(portalState: PortalState | null): Promise<EnrichedWalletTransaction[]> {
      throw new Error('Method not implemented.');
  }
  async getWalletTransactionsByDistributor(distributorId: string): Promise<EnrichedWalletTransaction[]> {
    throw new Error('Method not implemented.');
  }
  async rechargeWallet(distributorId: string, amount: number, paymentMethod: string, remarks: string, date: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
   async rechargeStoreWallet(storeId: string, amount: number, paymentMethod: string, remarks: string, date: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    throw new Error('Method not implemented.');
  }
  async markNotificationAsRead(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async markAllNotificationsAsRead(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  
  // --- Invoice ---
  async getInvoiceData(orderId: string): Promise<InvoiceData | null> {
    throw new Error('Method not implemented.');
  }

  // --- Stock Management ---
  async getStock(locationId: 'plant' | string): Promise<EnrichedStockItem[]> {
      throw new Error('Method not implemented.');
  }
  async addPlantProduction(items: { skuId: string; quantity: number }[]): Promise<void> {
      throw new Error('Method not implemented.');
  }
  async transferStockToStore(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void> {
      throw new Error('Method not implemented.');
  }

   // --- Stock Transfers ---
  async createStockTransfer(storeId: string, items: { skuId: string; quantity: number }[]): Promise<StockTransfer> {
    throw new Error('Method not implemented.');
  }
  async getStockTransfers(): Promise<EnrichedStockTransfer[]> {
      throw new Error('Method not implemented.');
  }
  async getEnrichedStockTransferItems(transferId: string): Promise<EnrichedStockTransferItem[]> {
    throw new Error('Method not implemented.');
  }
  async updateStockTransferStatus(transferId: string, status: StockTransferStatus): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async getDispatchNoteData(transferId: string): Promise<DispatchNoteData | null> {
      throw new Error('Method not implemented.');
  }
  async getStockLedger(locationId: 'plant' | string): Promise<StockLedgerEntry[]> {
    throw new Error('Method not implemented.');
  }
}