import {
  User, UserRole, Distributor, Order, OrderStatus, OrderItem, SKU, Scheme, WalletTransaction,
  TransactionType, Notification, NotificationType, PriceTier, PriceTierItem, EnrichedOrderItem,
  EnrichedWalletTransaction, Store, InvoiceData, OrderReturn, ReturnStatus, EnrichedOrderReturn,
  StockItem, StockLedgerEntry, StockMovementType, EnrichedStockItem, StockTransfer, StockTransferStatus, StockTransferItem, EnrichedStockTransfer, EnrichedStockTransferItem, DispatchNoteData,
  // FIX: Imported PortalState from types.ts to break a circular dependency.
  PortalState
} from '../types';
import { ApiService } from './apiService.interface';
import {
  users, distributors, orders, orderItems, skus, schemes, walletTransactions, notifications,
  priceTiers, priceTierItems, stores, orderReturns, stockItems as seedStockItems, stockLedger as seedStockLedger,
  stockTransfers as seedStockTransfers, stockTransferItems as seedStockTransferItems
} from './seedData';

// Helper for deep cloning to prevent mutations of original seed data
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

let nextIdCounters: Record<string, number> = {};
const getNextId = (prefix: string) => {
    if (!nextIdCounters[prefix]) {
        // Initialize from seed data to avoid collisions
        const allData = [...users, ...distributors, ...orders, ...orderItems, ...skus, ...schemes, ...walletTransactions, ...notifications, ...priceTiers, ...stores, ...orderReturns, ...seedStockLedger, ...seedStockTransfers, ...seedStockTransferItems];
        const maxId = allData
            .filter(item => item.id.startsWith(prefix))
            .map(item => parseInt(item.id.replace(prefix, ''), 10))
            .reduce((max, current) => (current > max ? current : max), 0);
        nextIdCounters[prefix] = maxId + 1;
    }
    const id = nextIdCounters[prefix]++;
    return `${prefix}${String(id).padStart(3, '0')}`;
};

export class MockApiService implements ApiService {
  private users: User[];
  private stores: Store[];
  private distributors: Distributor[];
  private orders: Order[];
  private orderItems: OrderItem[];
  private skus: SKU[];
  private schemes: Scheme[];
  private walletTransactions: WalletTransaction[];
  private notifications: Notification[];
  private priceTiers: PriceTier[];
  private priceTierItems: PriceTierItem[];
  private orderReturns: OrderReturn[];
  private stockItems: StockItem[];
  private stockLedger: StockLedgerEntry[];
  private stockTransfers: StockTransfer[];
  private stockTransferItems: StockTransferItem[];

  constructor() {
    this.users = deepClone(users);
    this.stores = deepClone(stores);
    this.distributors = deepClone(distributors);
    this.orders = deepClone(orders);
    this.orderItems = deepClone(orderItems);
    this.skus = deepClone(skus);
    this.schemes = deepClone(schemes);
    this.walletTransactions = deepClone(walletTransactions);
    this.notifications = deepClone(notifications).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.priceTiers = deepClone(priceTiers);
    this.priceTierItems = deepClone(priceTierItems);
    this.orderReturns = deepClone(orderReturns);
    this.stockItems = deepClone(seedStockItems);
    this.stockLedger = deepClone(seedStockLedger);
    this.stockTransfers = deepClone(seedStockTransfers);
    this.stockTransferItems = deepClone(seedStockTransferItems);

    // FIX: Initialize reserved stock based on initial pending orders and transfers
    this.initializeReservedStock();
  }

  private initializeReservedStock(): void {
    // Reset all reservations first to ensure a clean calculation
    this.stockItems.forEach(item => item.reserved = 0);

    // Calculate reservations from pending orders
    const pendingOrders = this.orders.filter(o => o.status === OrderStatus.PENDING);
    pendingOrders.forEach(order => {
        const distributor = this.distributors.find(d => d.id === order.distributorId);
        if (distributor) {
            const locationId = distributor.storeId || 'plant';
            const itemsInOrder = this.orderItems.filter(i => i.orderId === order.id);
            itemsInOrder.forEach(item => {
                const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === item.skuId);
                if (stockItem) {
                    stockItem.reserved += item.quantity;
                } else {
                    console.warn(`Could not find stock item for SKU ${item.skuId} at location ${locationId} to reserve initial stock.`);
                }
            });
        }
    });
    
    // Calculate reservations from pending stock transfers (from plant)
    const pendingTransfers = this.stockTransfers.filter(t => t.status === StockTransferStatus.PENDING);
    pendingTransfers.forEach(transfer => {
        const itemsInTransfer = this.stockTransferItems.filter(i => i.transferId === transfer.id);
        itemsInTransfer.forEach(item => {
            const stockItem = this.stockItems.find(s => s.locationId === 'plant' && s.skuId === item.skuId);
            if (stockItem) {
                stockItem.reserved += item.quantity;
            }
        });
    });
  }


  // --- Auth ---
  async login(email: string, pass: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = this.users.find(u => u.username.toLowerCase() === email.toLowerCase() && u.password === pass);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          resolve(userWithoutPassword);
        } else {
          reject(new Error('Invalid username or password'));
        }
      }, 500);
    });
  }
  async logout(): Promise<void> {
    return Promise.resolve();
  }

  // --- Users ---
  async getUsers(portalState: PortalState | null): Promise<User[]> {
      const usersWithoutPasswords = this.users.map(u => {
          const { password, ...user } = u;
          return user;
      });

      if (portalState?.type === 'store') {
          return Promise.resolve(deepClone(usersWithoutPasswords.filter(u => u.storeId === portalState.id)));
      }
      return Promise.resolve(deepClone(usersWithoutPasswords));
  }
  async addUser(userData: Omit<User, 'id'>, role: UserRole): Promise<User> {
      if (role === UserRole.STORE_ADMIN && (userData.role === UserRole.PLANT_ADMIN || userData.role === UserRole.STORE_ADMIN)) {
          throw new Error("Store Admins can only create Executives or Users.");
      }
      const newUser: User = { 
        ...userData, 
        id: getNextId('user'),
        permissions: userData.permissions,
      };
      this.users.push(newUser);
      const { password, ...user } = newUser;
      return Promise.resolve(user);
  }
  async updateUser(userData: User, role: UserRole): Promise<User> {
      if (role === UserRole.STORE_ADMIN && (userData.role === UserRole.PLANT_ADMIN || userData.role === UserRole.STORE_ADMIN)) {
          throw new Error("Store Admins cannot edit admin roles.");
      }
      const index = this.users.findIndex(u => u.id === userData.id);
      if (index === -1) throw new Error("User not found.");
      
      const existingUser = this.users[index];
      const updatedUser = { ...existingUser, ...userData };
      
      if (!userData.password) {
        updatedUser.password = existingUser.password;
      }
      
      this.users[index] = updatedUser;

      const { password, ...user } = updatedUser;
      return Promise.resolve(user);
  }
  async deleteUser(userId: string, currentUserId: string, role: UserRole): Promise<void> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      if (userId === currentUserId) throw new Error("Cannot delete your own account.");
      this.users = this.users.filter(u => u.id !== userId);
      return Promise.resolve();
  }
  
  // --- Stores ---
  async getStores(): Promise<Store[]> {
      return Promise.resolve(deepClone(this.stores));
  }
  async getStoreById(id: string): Promise<Store | null> {
    const store = this.stores.find(s => s.id === id);
    return Promise.resolve(store ? deepClone(store) : null);
  }
  async addStore(storeData: Omit<Store, 'id' | 'walletBalance'>): Promise<Store> {
      const newStore: Store = { ...storeData, id: getNextId('store'), walletBalance: 0 };
      this.stores.push(newStore);
      return Promise.resolve(newStore);
  }
  async updateStore(storeData: Store): Promise<Store> {
      const index = this.stores.findIndex(s => s.id === storeData.id);
      if (index === -1) throw new Error("Store not found.");
      const existingStore = this.stores[index];
      // Prevent wallet balance from being updated directly
      this.stores[index] = { ...storeData, walletBalance: existingStore.walletBalance };
      return Promise.resolve(this.stores[index]);
  }
  async deleteStore(storeId: string): Promise<void> {
      const isStoreInUse = this.distributors.some(d => d.storeId === storeId);
      if (isStoreInUse) throw new Error("Cannot delete store as it is assigned to one or more distributors.");
      this.users.forEach(u => {
          if (u.storeId === storeId) {
              throw new Error("Cannot delete store as it is assigned to one or more users.");
          }
      });
      this.stores = this.stores.filter(s => s.id !== storeId);
      return Promise.resolve();
  }

  // --- Distributors ---
  async getDistributors(portalState: PortalState | null): Promise<Distributor[]> {
    if (portalState?.type === 'store') {
        return Promise.resolve(deepClone(this.distributors.filter(d => d.storeId === portalState.id)));
    }
    // Plant portal should see distributors assigned to plant OR any store
    if (portalState?.type === 'plant') {
        return Promise.resolve(deepClone(this.distributors));
    }
    return Promise.resolve([]);
  }
  async getDistributorById(id: string): Promise<Distributor | null> {
    const distributor = this.distributors.find(d => d.id === id);
    return Promise.resolve(distributor ? deepClone(distributor) : null);
  }
  async addDistributor(
    distributorData: Omit<Distributor, 'id' | 'walletBalance' | 'dateAdded'>, 
    portalState: PortalState | null,
    initialScheme?: Omit<Scheme, 'id' | 'isGlobal' | 'distributorId' | 'storeId' | 'stoppedBy' | 'stoppedDate'>
  ): Promise<Distributor> {
    const newDistributor: Distributor = {
      ...distributorData,
      id: getNextId('dist'),
      walletBalance: 0,
      dateAdded: new Date().toISOString(),
      storeId: portalState?.type === 'store' ? portalState.id! : (distributorData.storeId || undefined),
    };
    this.distributors.push(newDistributor);
    this.notifications.unshift({ id: getNextId('notif'), date: new Date().toISOString(), message: `New distributor "${newDistributor.name}" onboarded.`, type: NotificationType.DISTRIBUTOR_ADDED, isRead: false });
    
    // Add initial scheme if provided and valid
    if (initialScheme && distributorData.hasSpecialSchemes && initialScheme.description && initialScheme.buySkuId && initialScheme.getSkuId && initialScheme.startDate && initialScheme.endDate) {
      const newScheme: Scheme = {
        ...initialScheme,
        id: getNextId('sch'),
        isGlobal: false,
        distributorId: newDistributor.id,
      };
      this.schemes.push(newScheme);
    }

    return Promise.resolve(newDistributor);
  }
  async updateDistributor(distributorData: Distributor, role: UserRole): Promise<Distributor> {
      if (role !== UserRole.PLANT_ADMIN) {
          throw new Error("Permission denied. Only Plant Admins can edit distributor details.");
      }
      const index = this.distributors.findIndex(d => d.id === distributorData.id);
      if (index === -1) {
          throw new Error("Distributor not found.");
      }
      // Ensure wallet balance and date added are not overwritten by the form
      const existingDistributor = this.distributors[index];
      this.distributors[index] = {
          ...existingDistributor,
          ...distributorData,
          walletBalance: existingDistributor.walletBalance,
          dateAdded: existingDistributor.dateAdded,
      };
      return Promise.resolve(deepClone(this.distributors[index]));
  }


  // --- Orders & Items ---
  async getOrders(portalState: PortalState | null): Promise<Order[]> {
    let relevantDistributorIds: Set<string>;
    if (portalState?.type === 'store') {
        relevantDistributorIds = new Set(this.distributors.filter(d => d.storeId === portalState.id).map(d => d.id));
    } else if (portalState?.type === 'plant') {
        // Plant portal sees ALL orders
        relevantDistributorIds = new Set(this.distributors.map(d => d.id));
    } else {
        return Promise.resolve([]);
    }
    return Promise.resolve(deepClone(this.orders.filter(o => relevantDistributorIds.has(o.distributorId))));
  }
  async getOrdersByDistributor(distributorId: string): Promise<Order[]> {
    const distOrders = this.orders.filter(o => o.distributorId === distributorId);
    return Promise.resolve(deepClone(distOrders));
  }
  async getAllOrderItems(portalState: PortalState | null): Promise<OrderItem[]> {
      let relevantDistributorIds: Set<string>;
      if (portalState?.type === 'store') {
          relevantDistributorIds = new Set(this.distributors.filter(d => d.storeId === portalState.id).map(d => d.id));
      } else if (portalState?.type === 'plant') {
          // Plant portal sees ALL order items
          relevantDistributorIds = new Set(this.distributors.map(d => d.id));
      } else {
          return Promise.resolve([]);
      }
      const relevantOrderIds = new Set(this.orders.filter(o => relevantDistributorIds.has(o.distributorId)).map(o => o.id));
      return Promise.resolve(deepClone(this.orderItems.filter(item => relevantOrderIds.has(item.orderId))));
  }
  async getOrderItems(orderId: string): Promise<EnrichedOrderItem[]> {
    const items = this.orderItems.filter(item => item.orderId === orderId);
    const enriched = items.map(item => {
        const sku = this.skus.find(s => s.id === item.skuId);
        return {
            ...item,
            skuName: sku?.name || 'Unknown SKU',
            hsnCode: sku?.hsnCode || '',
            gstPercentage: sku?.gstPercentage || 0,
        }
    });
    return Promise.resolve(deepClone(enriched));
  }

  // --- Complex Actions ---
  private calculateOrder(distributorId: string, items: { skuId: string; quantity: number }[]) {
      const distributor = this.distributors.find(d => d.id === distributorId);
      if (!distributor) throw new Error("Distributor not found");

      const tierItemsMap = new Map<string, number>();
      if (distributor.priceTierId) {
          this.priceTierItems
              .filter(item => item.tierId === distributor.priceTierId)
              .forEach(item => tierItemsMap.set(item.skuId, item.price));
      }

      let subtotal = 0;
      let totalAmount = 0;
      const orderItems: Omit<OrderItem, 'id' | 'orderId'>[] = [];

      items.forEach(item => {
          const sku = this.skus.find(s => s.id === item.skuId);
          if (!sku) throw new Error(`SKU with id ${item.skuId} not found`);
          const unitPrice = tierItemsMap.get(item.skuId) ?? sku.price;
          const itemSubtotal = item.quantity * unitPrice;
          subtotal += itemSubtotal;
          totalAmount += itemSubtotal * (1 + (sku.gstPercentage / 100));
          orderItems.push({ skuId: sku.id, quantity: item.quantity, unitPrice, isFreebie: false, returnedQuantity: 0 });
      });

      const today = new Date().toISOString().split('T')[0];
      const allActiveSchemes = this.schemes.filter(s => s.startDate <= today && s.endDate >= today && !s.stoppedDate);
      
      const globalSchemes = allActiveSchemes.filter(s => s.isGlobal);
      const storeSchemes = distributor.storeId ? allActiveSchemes.filter(s => s.storeId === distributor.storeId) : [];
      const distributorSpecificSchemes = distributor.hasSpecialSchemes ? allActiveSchemes.filter(s => s.distributorId === distributorId) : [];
      
      const applicableSchemes = [...globalSchemes, ...storeSchemes, ...distributorSpecificSchemes];
      const uniqueApplicableSchemes = Array.from(new Map(applicableSchemes.map(s => [s.id, s])).values());
      
      const freebies = new Map<string, number>();

      const schemesByBuySku = uniqueApplicableSchemes.reduce((acc, scheme) => {
          if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
          acc[scheme.buySkuId].push(scheme);
          return acc;
      }, {} as Record<string, Scheme[]>);

      const purchasedQuantities = new Map<string, number>();
      items.forEach(item => {
          if (item.quantity > 0) {
              purchasedQuantities.set(item.skuId, (purchasedQuantities.get(item.skuId) || 0) + item.quantity);
          }
      });

      purchasedQuantities.forEach((quantity, skuId) => {
          const relevantSchemes = schemesByBuySku[skuId]?.sort((a, b) => b.buyQuantity - a.buyQuantity);
          if (relevantSchemes) {
              let remainingQuantity = quantity;
              relevantSchemes.forEach(scheme => {
                  if (remainingQuantity >= scheme.buyQuantity) {
                      const timesApplied = Math.floor(remainingQuantity / scheme.buyQuantity);
                      const totalFree = timesApplied * scheme.getQuantity;
                      freebies.set(scheme.getSkuId, (freebies.get(scheme.getSkuId) || 0) + totalFree);
                      remainingQuantity %= scheme.buyQuantity;
                  }
              });
          }
      });

      freebies.forEach((quantity, skuId) => {
          orderItems.push({ skuId, quantity, unitPrice: 0, isFreebie: true, returnedQuantity: 0 });
      });
      
      return { subtotal, totalAmount: parseFloat(totalAmount.toFixed(2)), finalOrderItems: orderItems, distributor };
  }

  async placeOrder(distributorId: string, items: { skuId: string; quantity: number }[], username: string): Promise<Order> {
    const { totalAmount, finalOrderItems, distributor } = this.calculateOrder(distributorId, items);

    if (totalAmount > distributor.walletBalance + distributor.creditLimit) {
        this.notifications.unshift({ id: getNextId('notif'), date: new Date().toISOString(), message: `Order failed for ${distributor.name} due to insufficient funds.`, type: NotificationType.ORDER_FAILED, isRead: false });
        throw new Error("Insufficient funds (wallet + credit limit).");
    }

    const locationId = distributor.storeId || 'plant';

    // Stock Check for all items (including freebies) against available stock
    for (const item of finalOrderItems) {
        const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === item.skuId);
        const availableStock = stockItem ? stockItem.quantity - stockItem.reserved : 0;
        if (!stockItem || availableStock < item.quantity) {
            const sku = this.skus.find(s => s.id === item.skuId);
            this.notifications.unshift({ id: getNextId('notif'), date: new Date().toISOString(), message: `Order failed for ${distributor.name} due to low stock for ${sku?.name}.`, type: NotificationType.ORDER_FAILED, isRead: false });
            throw new Error(`Insufficient stock for ${sku?.name || item.skuId}. Available: ${availableStock}, Required: ${item.quantity}.`);
        }
    }

    const newOrder: Order = {
      id: getNextId('ord'),
      distributorId,
      date: new Date().toISOString(),
      totalAmount,
      status: OrderStatus.PENDING,
      placedByExecId: username,
    };
    this.orders.push(newOrder);

    // Reserve stock and create ledger entries
    finalOrderItems.forEach(item => {
      this.orderItems.push({ ...item, id: getNextId('item'), orderId: newOrder.id });
      const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === item.skuId)!;
      stockItem.reserved += item.quantity;
      this.stockLedger.push({
          id: getNextId('sled'),
          date: new Date().toISOString(),
          skuId: item.skuId,
          quantityChange: 0, // No physical change
          balanceAfter: stockItem.quantity,
          type: StockMovementType.RESERVED,
          locationId,
          notes: `Reserved ${item.quantity} for Order ${newOrder.id}`,
          initiatedBy: username,
      });
    });

    distributor.walletBalance -= totalAmount;
    const newTx: WalletTransaction = {
      id: getNextId('txn'),
      distributorId,
      date: new Date().toISOString(),
      type: TransactionType.ORDER_PAYMENT,
      amount: -totalAmount,
      balanceAfter: distributor.walletBalance,
      orderId: newOrder.id,
      initiatedBy: username,
    };
    this.walletTransactions.push(newTx);
    this.notifications.unshift({ id: getNextId('notif'), date: new Date().toISOString(), message: `New order ${newOrder.id} placed for ${distributor.name}.`, type: NotificationType.ORDER_PLACED, isRead: false });

    return Promise.resolve(deepClone(newOrder));
  }

  async updateOrderItems(orderId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void> {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== OrderStatus.PENDING) throw new Error("Cannot edit a delivered order.");

    const { totalAmount: newTotalAmount, finalOrderItems: newFinalOrderItems, distributor } = this.calculateOrder(order.distributorId, items);
    const locationId = distributor.storeId || 'plant';

    // 1. Calculate deltas
    const originalItems = this.orderItems.filter(i => i.orderId === orderId);
    const deltas = new Map<string, number>();
    
    const allSkuIds = new Set([...originalItems.map(i => i.skuId), ...newFinalOrderItems.map(i => i.skuId)]);
    
    allSkuIds.forEach(skuId => {
        const oldQty = originalItems.filter(i => i.skuId === skuId).reduce((sum, item) => sum + item.quantity, 0);
        const newQty = newFinalOrderItems.filter(i => i.skuId === skuId).reduce((sum, item) => sum + item.quantity, 0);
        deltas.set(skuId, newQty - oldQty);
    });

    // 2. Check stock for increases
    for (const [skuId, delta] of deltas.entries()) {
        if (delta > 0) {
            const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === skuId);
            const availableStock = stockItem ? stockItem.quantity - stockItem.reserved : 0;
            if (delta > availableStock) {
                const sku = this.skus.find(s => s.id === skuId);
                throw new Error(`Out of stock for ${sku?.name}. Required: ${delta}, Available: ${availableStock}`);
            }
        }
    }

    // 3. Check wallet for increase
    const totalAmountDelta = newTotalAmount - order.totalAmount;
    const currentAvailableFunds = distributor.walletBalance + distributor.creditLimit + order.totalAmount; // Add back original order amount for check
    if (newTotalAmount > currentAvailableFunds) {
        throw new Error("Increase in order value exceeds available funds.");
    }

    // 4. Apply all changes
    // Update stock reservations and ledger
    for (const [skuId, delta] of deltas.entries()) {
        if (delta !== 0) {
            const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === skuId)!;
            stockItem.reserved += delta;
            this.stockLedger.push({
                id: getNextId('sled'),
                date: new Date().toISOString(),
                skuId,
                quantityChange: 0,
                balanceAfter: stockItem.quantity,
                type: delta > 0 ? StockMovementType.RESERVED : StockMovementType.UNRESERVED,
                locationId,
                notes: `${delta > 0 ? 'Reserved' : 'Un-reserved'} ${Math.abs(delta)} on Order ${orderId} edit`,
                initiatedBy: username,
            });
        }
    }
    
    // Update wallet
    const originalPayment = this.walletTransactions.find(tx => tx.orderId === orderId && tx.type === TransactionType.ORDER_PAYMENT);
    if (originalPayment) {
        distributor.walletBalance += order.totalAmount; // Reverse old payment
        distributor.walletBalance -= newTotalAmount; // Apply new payment
        originalPayment.amount = -newTotalAmount;
        originalPayment.balanceAfter = distributor.walletBalance;
        originalPayment.date = new Date().toISOString();
    }

    // Update order
    order.totalAmount = newTotalAmount;
    order.date = new Date().toISOString();

    // Replace items
    this.orderItems = this.orderItems.filter(item => item.orderId !== orderId);
    newFinalOrderItems.forEach(item => {
        this.orderItems.push({ ...item, id: getNextId('item'), orderId: order.id });
    });

    return Promise.resolve();
  }
  
  // FIX: Changed the type of the 'status' parameter from a string literal union to the OrderStatus enum to ensure type safety.
  async updateOrderStatus(orderId: string, status: OrderStatus, username: string): Promise<void> {
      const order = this.orders.find(o => o.id === orderId);
      if (!order) throw new Error("Order not found");
      if (order.status === status) return Promise.resolve(); // No change
      order.status = status;

      if(status === OrderStatus.DELIVERED) {
          order.deliveredDate = new Date().toISOString();

          // Deduct physical stock and un-reserve
          const distributor = this.distributors.find(d => d.id === order.distributorId);
          if (!distributor) throw new Error("Distributor for order not found");

          const locationId = distributor.storeId || 'plant';
          const itemsForOrder = this.orderItems.filter(i => i.orderId === orderId);

          for (const item of itemsForOrder) {
              const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === item.skuId);
              if (stockItem) {
                  stockItem.quantity -= item.quantity;
                  stockItem.reserved -= item.quantity;
                  if (stockItem.reserved < 0) stockItem.reserved = 0; // Sanity check

                  this.stockLedger.push({
                      id: getNextId('sled'),
                      date: new Date().toISOString(),
                      skuId: item.skuId,
                      quantityChange: -item.quantity,
                      balanceAfter: stockItem.quantity,
                      type: StockMovementType.SALE,
                      locationId,
                      notes: `Order ${orderId} delivered`,
                      initiatedBy: username,
                  });
              } else {
                  console.warn(`Stock item not found for SKU ${item.skuId} at location ${locationId}. Cannot deduct stock.`);
              }
          }
      }
      return Promise.resolve();
  }

  async deleteOrder(orderId: string, remarks: string, username: string): Promise<void> {
      const orderIndex = this.orders.findIndex(o => o.id === orderId);
      if (orderIndex === -1) throw new Error("Order not found");
      const order = this.orders[orderIndex];
      const distributor = this.distributors.find(d => d.id === order.distributorId);
      if (!distributor) throw new Error("Distributor not found");
      
      // Un-reserve stock if order was pending
      if (order.status === OrderStatus.PENDING) {
          const itemsForOrder = this.orderItems.filter(i => i.orderId === orderId);
          const locationId = distributor.storeId || 'plant';
          for (const item of itemsForOrder) {
              const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === item.skuId);
              if (stockItem) {
                  stockItem.reserved -= item.quantity;
                  if (stockItem.reserved < 0) stockItem.reserved = 0;
                  this.stockLedger.push({
                      id: getNextId('sled'),
                      date: new Date().toISOString(),
                      skuId: item.skuId,
                      quantityChange: 0,
                      balanceAfter: stockItem.quantity,
                      type: StockMovementType.UNRESERVED,
                      locationId,
                      notes: `Un-reserved ${item.quantity} from deleted Order ${orderId}`,
                      initiatedBy: username,
                  });
              }
          }
      }

      // Credit back the wallet
      distributor.walletBalance += order.totalAmount;
      const newTx: WalletTransaction = {
          id: getNextId('txn'),
          distributorId: order.distributorId,
          date: new Date().toISOString(),
          type: TransactionType.ORDER_REFUND,
          amount: order.totalAmount,
          balanceAfter: distributor.walletBalance,
          orderId: order.id,
          remarks: `Order deleted. Reason: ${remarks}`,
          initiatedBy: username,
      };
      this.walletTransactions.push(newTx);

      // Remove order and its items
      this.orders.splice(orderIndex, 1);
      this.orderItems = this.orderItems.filter(item => item.orderId !== orderId);

      return Promise.resolve();
  }
  
  // --- Returns ---
  async initiateOrderReturn(orderId: string, itemsToReturn: { skuId: string; quantity: number }[], username: string, remarks: string): Promise<OrderReturn> {
      const order = this.orders.find(o => o.id === orderId);
      if (!order) throw new Error("Order not found");
      
      let totalCreditAmount = 0;
      for (const returnItem of itemsToReturn) {
          const orderItem = this.orderItems.find(oi => oi.orderId === orderId && oi.skuId === returnItem.skuId && !oi.isFreebie);
          if (!orderItem) throw new Error(`Item ${returnItem.skuId} not found in order.`);
          if (returnItem.quantity > (orderItem.quantity - orderItem.returnedQuantity)) {
              throw new Error(`Cannot return more than available quantity for ${orderItem.skuId}.`);
          }
          const sku = this.skus.find(s => s.id === returnItem.skuId);
          if (!sku) throw new Error(`SKU ${returnItem.skuId} not found.`);

          const itemSubtotal = returnItem.quantity * orderItem.unitPrice;
          totalCreditAmount += itemSubtotal * (1 + (sku.gstPercentage / 100));
      }
      
      const newReturn: OrderReturn = {
          id: getNextId('ret'),
          orderId,
          distributorId: order.distributorId,
          status: ReturnStatus.PENDING,
          initiatedBy: username,
          initiatedDate: new Date().toISOString(),
          remarks,
          totalCreditAmount: parseFloat(totalCreditAmount.toFixed(2)),
          items: itemsToReturn,
      };
      this.orderReturns.push(newReturn);
      return Promise.resolve(deepClone(newReturn));
  }
  
  async getReturns(status: ReturnStatus, portalState: PortalState | null): Promise<EnrichedOrderReturn[]> {
      let relevantDistributorIds: Set<string>;
      if (portalState?.type === 'store') {
          relevantDistributorIds = new Set(this.distributors.filter(d => d.storeId === portalState.id).map(d => d.id));
      } else if (portalState?.type === 'plant') {
          relevantDistributorIds = new Set(this.distributors.map(d => d.id));
      } else {
          return Promise.resolve([]);
      }
      let returns = this.orderReturns.filter(r => r.status === status && relevantDistributorIds.has(r.distributorId));

      const enriched = returns.map(r => {
          const distributor = this.distributors.find(d => d.id === r.distributorId);
          const skuDetails = r.items.map(item => {
              const orderItem = this.orderItems.find(oi => oi.orderId === r.orderId && oi.skuId === item.skuId && !oi.isFreebie);
              const sku = this.skus.find(s => s.id === item.skuId);
              return {
                  skuId: item.skuId,
                  skuName: sku?.name || 'Unknown',
                  quantity: item.quantity,
                  unitPrice: orderItem?.unitPrice || 0,
              }
          });
          return {
              ...r,
              distributorName: distributor?.name || 'Unknown',
              skuDetails
          }
      });
      return Promise.resolve(deepClone(enriched.sort((a,b) => new Date(b.initiatedDate).getTime() - new Date(a.initiatedDate).getTime())));
  }

  async confirmOrderReturn(returnId: string, username: string): Promise<void> {
      const returnRequest = this.orderReturns.find(r => r.id === returnId);
      if (!returnRequest || returnRequest.status !== ReturnStatus.PENDING) throw new Error("Return request not found or already processed.");
      
      const distributor = this.distributors.find(d => d.id === returnRequest.distributorId);
      if (!distributor) throw new Error("Distributor not found.");
      
      // Update item returned quantities
      returnRequest.items.forEach(returnItem => {
          const orderItem = this.orderItems.find(oi => oi.orderId === returnRequest.orderId && oi.skuId === returnItem.skuId && !oi.isFreebie);
          if (orderItem) {
              orderItem.returnedQuantity += returnItem.quantity;
          }

          // Add stock back
          const locationId = distributor.storeId || 'plant';
          const stockItem = this.stockItems.find(s => s.locationId === locationId && s.skuId === returnItem.skuId);
          if (stockItem) {
              stockItem.quantity += returnItem.quantity;
               this.stockLedger.push({
                  id: getNextId('sled'),
                  date: new Date().toISOString(),
                  skuId: returnItem.skuId,
                  quantityChange: returnItem.quantity,
                  balanceAfter: stockItem.quantity,
                  type: StockMovementType.RETURN,
                  locationId,
                  notes: `Return ${returnId} from Order ${returnRequest.orderId}`,
                  initiatedBy: username,
              });
          }
      });

      // Credit wallet
      distributor.walletBalance += returnRequest.totalCreditAmount;
      const newTx: WalletTransaction = {
          id: getNextId('txn'),
          distributorId: distributor.id,
          date: new Date().toISOString(),
          type: TransactionType.RETURN_CREDIT,
          amount: returnRequest.totalCreditAmount,
          balanceAfter: distributor.walletBalance,
          orderId: returnRequest.orderId,
          remarks: `Credit for return ${returnId}`,
          initiatedBy: username,
      };
      this.walletTransactions.push(newTx);

      // Update return status
      returnRequest.status = ReturnStatus.CONFIRMED;
      returnRequest.confirmedBy = username;
      returnRequest.confirmedDate = new Date().toISOString();
      
      return Promise.resolve();
  }

  // --- SKUs ---
  async getSKUs(): Promise<SKU[]> { return Promise.resolve(deepClone(this.skus)); }
  async addSKU(skuData: Omit<SKU, 'id'>, role: UserRole): Promise<SKU> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      const newSku: SKU = { ...skuData, id: getNextId('sku') };
      this.skus.push(newSku);
      // Initialize stock for the new SKU at the plant
      this.stockItems.push({ locationId: 'plant', skuId: newSku.id, quantity: 0, reserved: 0 });
      return Promise.resolve(newSku);
  }
  async updateSKU(skuData: SKU, role: UserRole): Promise<SKU> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      const index = this.skus.findIndex(s => s.id === skuData.id);
      if (index === -1) throw new Error("SKU not found.");
      this.skus[index] = skuData;
      return Promise.resolve(skuData);
  }

  // --- Schemes ---
  async getSchemes(portalState: PortalState | null): Promise<Scheme[]> {
    let relevantDistributorIds: Set<string>;
    if (portalState?.type === 'store') {
        relevantDistributorIds = new Set(this.distributors.filter(d => d.storeId === portalState.id).map(d => d.id));
    } else if (portalState?.type === 'plant') {
        relevantDistributorIds = new Set(this.distributors.map(d => d.id));
    } else {
        return Promise.resolve([]);
    }
    return Promise.resolve(deepClone(this.schemes.filter(s => s.isGlobal || (s.distributorId && relevantDistributorIds.has(s.distributorId)))));
  }
  async getGlobalSchemes(): Promise<Scheme[]> {
      const globalSchemes = this.schemes.filter(s => s.isGlobal);
      return Promise.resolve(deepClone(globalSchemes));
  }
  async getSchemesByDistributor(distributorId: string): Promise<Scheme[]> {
      const distSchemes = this.schemes.filter(s => s.distributorId === distributorId);
      return Promise.resolve(deepClone(distSchemes));
  }
  async getSchemesByStore(storeId: string): Promise<Scheme[]> {
    const storeSchemes = this.schemes.filter(s => s.storeId === storeId);
    return Promise.resolve(deepClone(storeSchemes));
  }
  async addScheme(schemeData: Omit<Scheme, 'id'>, role: UserRole): Promise<Scheme> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      const newScheme: Scheme = { ...schemeData, id: getNextId('sch') };
      this.schemes.push(newScheme);
      return Promise.resolve(newScheme);
  }
  async updateScheme(schemeData: Scheme, role: UserRole): Promise<Scheme> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      const index = this.schemes.findIndex(s => s.id === schemeData.id);
      if (index === -1) throw new Error("Scheme not found.");
      this.schemes[index] = schemeData;
      return Promise.resolve(schemeData);
  }
  async deleteScheme(schemeId: string, role: UserRole): Promise<void> {
    if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
    this.schemes = this.schemes.filter(s => s.id !== schemeId);
    return Promise.resolve();
  }
  async stopScheme(schemeId: string, username: string, role: UserRole): Promise<void> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      const scheme = this.schemes.find(s => s.id === schemeId);
      if (!scheme) throw new Error("Scheme not found.");
      
      const today = new Date();
      if (new Date(scheme.endDate) < today && !scheme.stoppedDate) {
          return Promise.resolve(); // Already ended naturally
      }

      scheme.endDate = today.toISOString();
      scheme.stoppedBy = username;
      scheme.stoppedDate = today.toISOString();

      return Promise.resolve();
  }
  async reactivateScheme(schemeId: string, newEndDate: string, username: string, role: UserRole): Promise<Scheme> {
    if (role !== UserRole.PLANT_ADMIN) {
      throw new Error("Permission denied.");
    }
    const scheme = this.schemes.find(s => s.id === schemeId);
    if (!scheme) {
      throw new Error("Scheme not found.");
    }
    
    scheme.endDate = newEndDate;
    scheme.stoppedBy = undefined;
    scheme.stoppedDate = undefined;
    
    this.notifications.unshift({
        id: getNextId('notif'),
        date: new Date().toISOString(),
        message: `Scheme "${scheme.description}" has been reactivated by ${username}.`,
        type: NotificationType.NEW_SCHEME,
        isRead: false
    });

    return Promise.resolve(deepClone(scheme));
  }

  // --- Price Tiers ---
  async getPriceTiers(): Promise<PriceTier[]> { return Promise.resolve(deepClone(this.priceTiers)); }
  async addPriceTier(tierData: Omit<PriceTier, 'id'>, role: UserRole): Promise<PriceTier> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      const newTier: PriceTier = { ...tierData, id: getNextId('tier') };
      this.priceTiers.push(newTier);
      return Promise.resolve(newTier);
  }
  async updatePriceTier(tierData: PriceTier, role: UserRole): Promise<PriceTier> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      const index = this.priceTiers.findIndex(t => t.id === tierData.id);
      if (index === -1) throw new Error("Price tier not found.");
      this.priceTiers[index] = tierData;
      return Promise.resolve(tierData);
  }
  async deletePriceTier(tierId: string, role: UserRole): Promise<void> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      this.priceTiers = this.priceTiers.filter(t => t.id !== tierId);
      this.priceTierItems = this.priceTierItems.filter(item => item.tierId !== tierId);
      // Unassign from distributors
      this.distributors.forEach(d => {
          if (d.priceTierId === tierId) {
              d.priceTierId = undefined;
          }
      });
      return Promise.resolve();
  }
  async getAllPriceTierItems(): Promise<PriceTierItem[]> { return Promise.resolve(deepClone(this.priceTierItems)); }
  async setPriceTierItems(tierId: string, items: { skuId: string, price: number }[], role: UserRole): Promise<void> {
      if (role !== UserRole.PLANT_ADMIN) throw new Error("Permission denied.");
      // Remove old items for this tier
      this.priceTierItems = this.priceTierItems.filter(item => item.tierId !== tierId);
      // Add new items
      items.forEach(item => {
          this.priceTierItems.push({ tierId, ...item });
      });
      return Promise.resolve();
  }

  // --- Wallet ---
  private enrichWalletTransactions(transactions: WalletTransaction[]): EnrichedWalletTransaction[] {
    return transactions.map(tx => {
        let accountName = 'Unknown';
        let accountType: 'Distributor' | 'Store' = 'Distributor';
        if (tx.distributorId) {
            accountName = this.distributors.find(d => d.id === tx.distributorId)?.name || 'Unknown Distributor';
            accountType = 'Distributor';
        } else if (tx.storeId) {
            accountName = this.stores.find(s => s.id === tx.storeId)?.name || 'Unknown Store';
            accountType = 'Store';
        }
        return { ...tx, accountName, accountType };
    });
  }
  async getAllWalletTransactions(portalState: PortalState | null): Promise<EnrichedWalletTransaction[]> {
      let relevantDistributorIds: Set<string>;
      let relevantStoreIds: Set<string>;

      if (portalState?.type === 'store') {
          relevantDistributorIds = new Set(this.distributors.filter(d => d.storeId === portalState.id).map(d => d.id));
          relevantStoreIds = new Set([portalState.id!]);
      } else if (portalState?.type === 'plant') {
          relevantDistributorIds = new Set(this.distributors.map(d => d.id));
          relevantStoreIds = new Set(this.stores.map(s => s.id));
      } else {
          return Promise.resolve([]);
      }
      
      let transactions = this.walletTransactions.filter(tx => 
          (tx.distributorId && relevantDistributorIds.has(tx.distributorId)) ||
          (tx.storeId && relevantStoreIds.has(tx.storeId))
      );
      
      const enriched = this.enrichWalletTransactions(transactions);
      return Promise.resolve(deepClone(enriched));
  }
  async getWalletTransactionsByDistributor(distributorId: string): Promise<EnrichedWalletTransaction[]> {
    const txs = this.walletTransactions.filter(tx => tx.distributorId === distributorId);
    const enriched = this.enrichWalletTransactions(txs);
    return Promise.resolve(deepClone(enriched));
  }

  private recalculateWalletLedger(accountId: string, accountType: 'distributor' | 'store'): void {
    const accountTransactions = this.walletTransactions.filter(tx => 
        accountType === 'distributor' ? tx.distributorId === accountId : tx.storeId === accountId
    );

    accountTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentBalance = 0;
    for (const tx of accountTransactions) {
        currentBalance += tx.amount;
        tx.balanceAfter = currentBalance;
    }

    const account = accountType === 'distributor'
        ? this.distributors.find(d => d.id === accountId)
        : this.stores.find(s => s.id === accountId);

    if (account) {
        account.walletBalance = currentBalance;
    }
  }

  async rechargeWallet(distributorId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string): Promise<void> {
    const distributor = this.distributors.find(d => d.id === distributorId);
    if (!distributor) throw new Error("Distributor not found.");
    
    const balanceBeforeRecharge = distributor.walletBalance;

    const newTx: WalletTransaction = {
      id: getNextId('txn'),
      distributorId,
      date: date,
      type: TransactionType.RECHARGE,
      amount,
      balanceAfter: 0, // Placeholder, will be recalculated
      paymentMethod: paymentMethod as any,
      remarks,
      initiatedBy: username,
    };
    this.walletTransactions.push(newTx);

    this.recalculateWalletLedger(distributorId, 'distributor');

    if(distributor.walletBalance > 0 && balanceBeforeRecharge <= 0) {
        this.notifications.unshift({ id: getNextId('notif'), date: new Date().toISOString(), message: `Wallet for ${distributor.name} has been replenished.`, type: NotificationType.WALLET_LOW, isRead: false });
    }

    return Promise.resolve();
  }
   async rechargeStoreWallet(storeId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string): Promise<void> {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) throw new Error("Store not found.");
    
    const newTx: WalletTransaction = {
      id: getNextId('txn'),
      storeId,
      date: date,
      type: TransactionType.RECHARGE,
      amount,
      balanceAfter: 0, // Placeholder
      paymentMethod: paymentMethod as any,
      remarks,
      initiatedBy: username,
    };
    this.walletTransactions.push(newTx);
    
    this.recalculateWalletLedger(storeId, 'store');

    return Promise.resolve();
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    const sorted = this.notifications.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.resolve(deepClone(sorted));
  }
  async markNotificationAsRead(id: string): Promise<void> {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) notif.isRead = true;
    return Promise.resolve();
  }
  async markAllNotificationsAsRead(): Promise<void> {
    this.notifications.forEach(n => n.isRead = true);
    return Promise.resolve();
  }
  
  // --- Invoice ---
  async getInvoiceData(orderId: string): Promise<InvoiceData | null> {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return null;
    const distributor = this.distributors.find(d => d.id === order.distributorId);
    if (!distributor) return null;
    const items = await this.getOrderItems(orderId);
    
    return Promise.resolve({ order, distributor, items });
  }

  // --- Stock Management ---
  async getStock(locationId: 'plant' | string): Promise<EnrichedStockItem[]> {
      const stock = this.stockItems.filter(s => s.locationId === locationId);
      const enriched = stock.map(item => {
          const sku = this.skus.find(s => s.id === item.skuId);
          return {
              ...item,
              skuName: sku?.name || 'Unknown SKU',
          };
      });
      return Promise.resolve(deepClone(enriched));
  }
  async getStockLedger(locationId: 'plant' | string): Promise<StockLedgerEntry[]> {
    const ledger = this.stockLedger.filter(s => s.locationId === locationId);
    return Promise.resolve(deepClone(ledger));
  }

  async addPlantProduction(items: { skuId: string; quantity: number }[], username: string): Promise<void> {
      for (const item of items) {
          let stockItem = this.stockItems.find(s => s.locationId === 'plant' && s.skuId === item.skuId);
          if (stockItem) {
              stockItem.quantity += item.quantity;
          } else {
              stockItem = { locationId: 'plant', skuId: item.skuId, quantity: item.quantity, reserved: 0 };
              this.stockItems.push(stockItem);
          }
          this.stockLedger.push({
              id: getNextId('sled'),
              date: new Date().toISOString(),
              skuId: item.skuId,
              quantityChange: item.quantity,
              balanceAfter: stockItem.quantity,
              type: StockMovementType.PRODUCTION,
              locationId: 'plant',
              notes: 'Daily Production',
              initiatedBy: username,
          });
      }
      return Promise.resolve();
  }
  
  // DEPRECATED - use createStockTransfer
  async transferStockToStore(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void> {
      for (const item of items) {
          const plantStock = this.stockItems.find(s => s.locationId === 'plant' && s.skuId === item.skuId);
          if (!plantStock || plantStock.quantity - plantStock.reserved < item.quantity) {
              throw new Error(`Insufficient stock at plant for SKU ${item.skuId}.`);
          }
          plantStock.quantity -= item.quantity;
          this.stockLedger.push({
              id: getNextId('sled'),
              date: new Date().toISOString(),
              skuId: item.skuId,
              quantityChange: -item.quantity,
              balanceAfter: plantStock.quantity,
              type: StockMovementType.TRANSFER_OUT,
              locationId: 'plant',
              notes: `Transfer to store ${storeId}`,
              initiatedBy: username,
          });

          let storeStock = this.stockItems.find(s => s.locationId === storeId && s.skuId === item.skuId);
          if (storeStock) {
              storeStock.quantity += item.quantity;
          } else {
              storeStock = { locationId: storeId, skuId: item.skuId, quantity: item.quantity, reserved: 0 };
              this.stockItems.push(storeStock);
          }
           this.stockLedger.push({
              id: getNextId('sled'),
              date: new Date().toISOString(),
              skuId: item.skuId,
              quantityChange: item.quantity,
              balanceAfter: storeStock.quantity,
              type: StockMovementType.TRANSFER_IN,
              locationId: storeId,
              notes: `Transfer from plant`,
              initiatedBy: username,
          });
      }
      return Promise.resolve();
  }

   // --- Stock Transfers ---
  async createStockTransfer(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<StockTransfer> {
    let totalValue = 0;
    const transferItems: Omit<StockTransferItem, 'id' | 'transferId'>[] = [];
    
    // Check stock
    for (const item of items) {
      const plantStock = this.stockItems.find(s => s.locationId === 'plant' && s.skuId === item.skuId);
      const availableStock = plantStock ? plantStock.quantity - plantStock.reserved : 0;
      if (!plantStock || availableStock < item.quantity) {
        const skuName = this.skus.find(s => s.id === item.skuId)?.name || item.skuId;
        throw new Error(`Insufficient stock at plant for ${skuName}. Available: ${availableStock}, Required: ${item.quantity}.`);
      }
    }
    
    // Process items and calculate value
    items.forEach(item => {
        const sku = this.skus.find(s => s.id === item.skuId);
        if (!sku) throw new Error(`SKU ${item.skuId} not found`);
        totalValue += item.quantity * sku.price;
        transferItems.push({ skuId: item.skuId, quantity: item.quantity, unitPrice: sku.price, isFreebie: false });
    });
    
    // TODO: Add logic for freebies in transfers if needed

    const newTransfer: StockTransfer = {
      id: getNextId('stf'),
      destinationStoreId: storeId,
      date: new Date().toISOString(),
      status: StockTransferStatus.PENDING,
      initiatedBy: username,
      totalValue: parseFloat(totalValue.toFixed(2)),
    };
    this.stockTransfers.push(newTransfer);

    // Reserve stock at plant
    transferItems.forEach(item => {
        this.stockTransferItems.push({ ...item, id: getNextId('stfi'), transferId: newTransfer.id });
        const plantStock = this.stockItems.find(s => s.locationId === 'plant' && s.skuId === item.skuId)!;
        plantStock.reserved += item.quantity;
        this.stockLedger.push({
            id: getNextId('sled'),
            date: new Date().toISOString(),
            skuId: item.skuId,
            quantityChange: 0,
            balanceAfter: plantStock.quantity,
            type: StockMovementType.RESERVED,
            locationId: 'plant',
            notes: `Reserved ${item.quantity} for dispatch ${newTransfer.id}`,
            initiatedBy: username,
        });
    });

    return Promise.resolve(deepClone(newTransfer));
  }

  async getStockTransfers(): Promise<EnrichedStockTransfer[]> {
      const enriched = this.stockTransfers.map(t => {
          const store = this.stores.find(s => s.id === t.destinationStoreId);
          return {
              ...t,
              destinationStoreName: store?.name || 'Unknown Store',
          }
      });
      return Promise.resolve(deepClone(enriched));
  }
  async getEnrichedStockTransferItems(transferId: string): Promise<EnrichedStockTransferItem[]> {
    const items = this.stockTransferItems.filter(i => i.transferId === transferId);
    const enriched = items.map(item => {
        const sku = this.skus.find(s => s.id === item.skuId);
        return {
            ...item,
            skuName: sku?.name || 'Unknown SKU',
            hsnCode: sku?.hsnCode || '',
            gstPercentage: sku?.gstPercentage || 0,
        };
    });
    return Promise.resolve(deepClone(enriched));
  }

  async updateStockTransferStatus(transferId: string, status: StockTransferStatus, username: string): Promise<void> {
    const transfer = this.stockTransfers.find(t => t.id === transferId);
    if (!transfer) throw new Error("Stock transfer not found");
    if (transfer.status === status) return;

    if (status === StockTransferStatus.DELIVERED) {
      transfer.status = StockTransferStatus.DELIVERED;
      transfer.deliveredDate = new Date().toISOString();
      const itemsForTransfer = this.stockTransferItems.filter(i => i.transferId === transferId);

      for (const item of itemsForTransfer) {
        // Deduct from plant
        const plantStock = this.stockItems.find(s => s.locationId === 'plant' && s.skuId === item.skuId);
        if (plantStock) {
          plantStock.quantity -= item.quantity;
          plantStock.reserved -= item.quantity;
          if(plantStock.reserved < 0) plantStock.reserved = 0;

          this.stockLedger.push({
            id: getNextId('sled'),
            date: new Date().toISOString(),
            skuId: item.skuId,
            quantityChange: -item.quantity,
            balanceAfter: plantStock.quantity,
            type: StockMovementType.TRANSFER_OUT,
            locationId: 'plant',
            notes: `Dispatch ${transferId} to ${transfer.destinationStoreId}`,
            initiatedBy: username,
          });
        }
        
        // Add to store
        let storeStock = this.stockItems.find(s => s.locationId === transfer.destinationStoreId && s.skuId === item.skuId);
        if (storeStock) {
          storeStock.quantity += item.quantity;
        } else {
          storeStock = { locationId: transfer.destinationStoreId, skuId: item.skuId, quantity: item.quantity, reserved: 0 };
          this.stockItems.push(storeStock);
        }
        this.stockLedger.push({
            id: getNextId('sled'),
            date: new Date().toISOString(),
            skuId: item.skuId,
            quantityChange: item.quantity,
            balanceAfter: storeStock.quantity,
            type: StockMovementType.TRANSFER_IN,
            locationId: transfer.destinationStoreId,
            notes: `Received from dispatch ${transferId}`,
            initiatedBy: username,
        });
      }
    }
    return Promise.resolve();
  }
  
  async getDispatchNoteData(transferId: string): Promise<DispatchNoteData | null> {
      const transfer = this.stockTransfers.find(t => t.id === transferId);
      if (!transfer) return null;
      const store = this.stores.find(s => s.id === transfer.destinationStoreId);
      if (!store) return null;
      const items = await this.getEnrichedStockTransferItems(transferId);
      return Promise.resolve({ transfer, store, items });
  }

}