// FIX: Changed PortalState import from hooks/useAuth to types to break a circular dependency.
import { PortalState, CompanyDetails, DispatchNoteData, Distributor, EnrichedOrderItem, EnrichedOrderReturn, EnrichedStockItem, EnrichedStockTransfer, EnrichedStockTransferItem, EnrichedWalletTransaction, InvoiceData, Notification, Order, OrderItem, OrderReturn, OrderStatus, PriceTier, PriceTierItem, ReturnStatus, Scheme, SKU, StockItem, StockLedgerEntry, StockTransfer, StockTransferStatus, Store, User, UserRole, WalletTransaction } from "../types";

export interface BackendStatus {
  status: 'ok' | 'error';
  message: string;
}
export interface ApiService {
  // Auth
  login(email: string, pass: string): Promise<User>;
  logout(): Promise<void>;
  seedAdminUser(): Promise<void>;
  checkBackendStatus(): Promise<BackendStatus>;

  // Users
  getUsers(portalState: PortalState | null): Promise<User[]>;
  addUser(userData: Omit<User, 'id'>, role: UserRole): Promise<User>;
  updateUser(userData: User, role: UserRole): Promise<User>;
  deleteUser(userId: string, currentUserId: string, role: UserRole): Promise<void>;

  // Stores
  getStores(): Promise<Store[]>;
  getStoreById(id: string): Promise<Store | null>;
  addStore(storeData: Omit<Store, 'id' | 'walletBalance'>): Promise<Store>;
  updateStore(storeData: Store): Promise<Store>;
  deleteStore(storeId: string): Promise<void>;
  
  // Distributors
  getDistributors(portalState: PortalState | null): Promise<Distributor[]>;
  getDistributorById(id: string): Promise<Distributor | null>;
  addDistributor(distributorData: Omit<Distributor, 'id' | 'walletBalance' | 'dateAdded'>, portalState: PortalState | null, initialScheme?: Omit<Scheme, 'id' | 'isGlobal' | 'distributorId' | 'storeId' | 'stoppedBy' | 'stoppedDate'>): Promise<Distributor>;
  updateDistributor(distributorData: Distributor, role: UserRole): Promise<Distributor>;

  // Orders
  getOrders(portalState: PortalState | null): Promise<Order[]>;
  getOrdersByDistributor(distributorId: string): Promise<Order[]>;
  // FIX: Return the enriched type to match component state and mock implementation.
  getOrderItems(orderId: string): Promise<EnrichedOrderItem[]>;
  getAllOrderItems(portalState: PortalState | null): Promise<OrderItem[]>;
  // FIX: Add username for auditing
  placeOrder(distributorId: string, items: { skuId: string; quantity: number }[]): Promise<Order>;
  // FIX: Add username for auditing
  updateOrderItems(orderId: string, items: { skuId: string; quantity: number }[]): Promise<void>;
  // FIX: Use the OrderStatus enum for type safety.
  // FIX: Add username for auditing
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  // FIX: Add username for auditing
  deleteOrder(orderId: string, remarks: string): Promise<void>;

  // Returns
  // FIX: Add username for auditing
  initiateOrderReturn(orderId: string, items: { skuId: string; quantity: number }[], remarks: string): Promise<OrderReturn>;
  // FIX: Return the enriched type to match component state and mock implementation.
  getReturns(status: ReturnStatus, portalState: PortalState | null): Promise<EnrichedOrderReturn[]>;
  // FIX: Add username for auditing
  confirmOrderReturn(returnId: string): Promise<void>;

  // SKUs
  getSKUs(): Promise<SKU[]>;
  addSKU(skuData: Omit<SKU, 'id'>, role: UserRole): Promise<SKU>;
  updateSKU(skuData: SKU, role: UserRole): Promise<SKU>;

  // Schemes
  getSchemes(portalState: PortalState | null): Promise<Scheme[]>;
  getGlobalSchemes(): Promise<Scheme[]>;
  getSchemesByDistributor(distributorId: string): Promise<Scheme[]>;
  getSchemesByStore(storeId: string): Promise<Scheme[]>;
  addScheme(schemeData: Omit<Scheme, 'id'>, role: UserRole): Promise<Scheme>;
  updateScheme(schemeData: Scheme, role: UserRole): Promise<Scheme>;
  deleteScheme(schemeId: string, role: UserRole): Promise<void>;
  stopScheme(schemeId: string, username: string, role: UserRole): Promise<void>;
  reactivateScheme(schemeId: string, newEndDate: string, username: string, role: UserRole): Promise<Scheme>;

  // Price Tiers
  getPriceTiers(): Promise<PriceTier[]>;
  addPriceTier(tierData: Omit<PriceTier, 'id'>, role: UserRole): Promise<PriceTier>;
  updatePriceTier(tierData: PriceTier, role: UserRole): Promise<PriceTier>;
  deletePriceTier(tierId: string, role: UserRole): Promise<void>;
  getAllPriceTierItems(): Promise<PriceTierItem[]>;
  setPriceTierItems(tierId: string, items: { skuId: string, price: number }[], role: UserRole): Promise<void>;

  // Wallet
  // FIX: Return the enriched type to match component state and mock implementation.
  getWalletTransactionsByDistributor(distributorId: string): Promise<EnrichedWalletTransaction[]>;
  getAllWalletTransactions(portalState: PortalState | null): Promise<EnrichedWalletTransaction[]>;
  // FIX: Add username for auditing
  rechargeWallet(distributorId: string, amount: number, paymentMethod: string, remarks: string, date: string): Promise<void>;
  // FIX: Add username for auditing
  rechargeStoreWallet(storeId: string, amount: number, paymentMethod: string, remarks: string, date: string): Promise<void>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(): Promise<void>;
  
  // Invoice
  getInvoiceData(orderId: string): Promise<InvoiceData | null>;

  // Stock Management
  getStock(locationId: 'plant' | string): Promise<EnrichedStockItem[]>;
  // FIX: Add username for auditing
  addPlantProduction(items: { skuId: string; quantity: number }[]): Promise<void>;
  transferStockToStore(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void>;

  // Stock Transfers
  // FIX: Add username for auditing
  createStockTransfer(storeId: string, items: { skuId: string; quantity: number }[]): Promise<StockTransfer>;
  getStockTransfers(): Promise<EnrichedStockTransfer[]>;
  getEnrichedStockTransferItems(transferId: string): Promise<EnrichedStockTransferItem[]>;
  // FIX: Add username for auditing
  updateStockTransferStatus(transferId: string, status: StockTransferStatus): Promise<void>;
  getDispatchNoteData(transferId: string): Promise<DispatchNoteData | null>;
  getStockLedger(locationId: 'plant' | string): Promise<StockLedgerEntry[]>;
}