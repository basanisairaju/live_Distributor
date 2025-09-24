import { User, UserRole, Distributor, Order, OrderStatus, OrderItem, SKU, Scheme, WalletTransaction, TransactionType, Notification, NotificationType, PriceTier, PriceTierItem, Store, OrderReturn, ReturnStatus, StockItem, StockLedgerEntry, StockMovementType, StockTransfer, StockTransferItem, StockTransferStatus } from '../types';
import { menuItems } from '../constants';

const getPermissionsForRole = (role: UserRole): string[] => {
  return menuItems.filter(item => item.roles.includes(role)).map(item => item.path);
};


export const users: User[] = [
  {
    id: 'user001',
    username: 'plant.admin@distributor.com',
    password: 'password',
    role: UserRole.PLANT_ADMIN,
    permissions: menuItems.map(item => item.path), // Plant admin gets all permissions
  },
  {
    id: 'user002',
    username: 'asm.rajesh@distributor.com',
    password: 'password',
    role: UserRole.ASM,
    permissions: getPermissionsForRole(UserRole.ASM),
  },
  {
    id: 'user003',
    username: 'exec.suresh@distributor.com',
    password: 'password',
    role: UserRole.EXECUTIVE,
    permissions: getPermissionsForRole(UserRole.EXECUTIVE),
  },
  {
    id: 'user004',
    username: 'exec.priya@distributor.com',
    password: 'password',
    role: UserRole.EXECUTIVE,
    storeId: 'store002',
    permissions: getPermissionsForRole(UserRole.EXECUTIVE),
  },
  {
    id: 'user006',
    username: 'store.mgr.vizag@distributor.com',
    password: 'password',
    role: UserRole.STORE_ADMIN,
    storeId: 'store002',
    permissions: getPermissionsForRole(UserRole.STORE_ADMIN),
  },
  {
    id: 'user007',
    username: 'readonly.user@distributor.com',
    password: 'password',
    role: UserRole.USER,
    permissions: getPermissionsForRole(UserRole.USER),
  },
  {
    id: 'user008',
    username: 'store.mgr.hyd@distributor.com',
    password: 'password',
    role: UserRole.STORE_ADMIN,
    storeId: 'store003',
    permissions: getPermissionsForRole(UserRole.STORE_ADMIN),
  },
  {
    id: 'user009',
    username: 'admin',
    password: 'password',
    role: UserRole.PLANT_ADMIN,
    permissions: menuItems.map(item => item.path), // Super admin gets all permissions
  },
];

export const stores: Store[] = [
    {
        id: 'store002',
        name: 'Vizag Store',
        location: 'Visakhapatnam, Andhra Pradesh',
        addressLine1: '456 Docksyde Ave',
        addressLine2: 'Visakhapatnam, Andhra Pradesh, 530001',
        email: 'vizag.wh@distributor.com',
        phone: '0891-9876543',
        gstin: '37BBBBB0000B1Z9',
        walletBalance: 0, // Will be calculated
    },
    {
        id: 'store003',
        name: 'Hyderabad Store',
        location: 'Hyderabad, Telangana',
        addressLine1: '789 Hi-Tech Rd',
        addressLine2: 'Hyderabad, Telangana, 500081',
        email: 'hyd.wh@distributor.com',
        phone: '040-1234567',
        gstin: '36CCCCC0000C1Z5',
        walletBalance: 0, // Will be calculated
    },
];

export const skus: SKU[] = [
  { id: 'sku001', name: 'Classic Biscuits 100g', price: 10, hsnCode: '190531', gstPercentage: 5 },
  { id: 'sku002', name: 'Chocolate Cream Biscuits 120g', price: 25, hsnCode: '190531', gstPercentage: 18 },
  { id: 'sku003', name: 'Salted Crackers 200g', price: 30, hsnCode: '190532', gstPercentage: 5 },
  // FIX: Added missing hsnCode and gstPercentage properties to complete the SKU object definition.
  { id: 'sku004', name: 'Milk Cookies Family Pack', price: 70, hsnCode: '190590', gstPercentage: 18 },
  { id: 'sku005', name: 'Premium Nuts & Raisins Cookies 150g', price: 120, hsnCode: '190590', gstPercentage: 18 },
  { id: 'sku006', name: 'Sugar-Free Digestive Biscuits 250g', price: 55, hsnCode: '190531', gstPercentage: 12 },
];

export const priceTiers: PriceTier[] = [
    { id: 'tier001', name: 'Gold Tier', description: 'Special pricing for high-volume distributors' },
    { id: 'tier002', name: 'Silver Tier', description: 'Standard discount pricing' },
];

export const priceTierItems: PriceTierItem[] = [
    { tierId: 'tier001', skuId: 'sku005', price: 110 },
    { tierId: 'tier001', skuId: 'sku004', price: 65 },
    { tierId: 'tier002', skuId: 'sku005', price: 115 },
];

export const distributors: Distributor[] = [
  {
    id: 'dist001',
    name: 'Anil Enterprises',
    phone: '9876543210',
    state: 'Maharashtra',
    area: 'Pune',
    creditLimit: 50000,
    gstin: '27AAAAA0000A1Z5',
    billingAddress: '123 MG Road, Pune, Maharashtra, 411001',
    hasSpecialSchemes: true,
    asmName: 'asm.rajesh@distributor.com',
    executiveName: 'exec.suresh@distributor.com',
    walletBalance: 15250,
    dateAdded: '2023-01-15T10:00:00Z',
    priceTierId: 'tier001',
  },
  {
    id: 'dist002',
    name: 'Bharat Traders',
    phone: '9988776655',
    state: 'Karnataka',
    area: 'Bangalore',
    creditLimit: 25000,
    gstin: '29BBBBB0000B1Z9',
    billingAddress: '456 Brigade Road, Bangalore, Karnataka, 560001',
    hasSpecialSchemes: false,
    asmName: 'asm.rajesh@distributor.com',
    executiveName: 'exec.suresh@distributor.com',
    walletBalance: -5000,
    dateAdded: '2023-02-20T11:00:00Z',
  },
  {
    id: 'dist003',
    name: 'Coastal Distributors',
    phone: '9123456789',
    state: 'Andhra Pradesh',
    area: 'Visakhapatnam',
    creditLimit: 75000,
    gstin: '37CCCCC0000C1Z5',
    billingAddress: '789 Beach Road, Visakhapatnam, Andhra Pradesh, 530001',
    hasSpecialSchemes: true,
    asmName: 'asm.rajesh@distributor.com',
    executiveName: 'exec.priya@distributor.com',
    walletBalance: 120000,
    dateAdded: '2023-03-10T12:00:00Z',
    storeId: 'store002',
  },
];

export const orders: Order[] = [
  { id: 'ord001', distributorId: 'dist001', date: new Date(Date.now() - 20 * 86400000).toISOString(), totalAmount: 11800, status: OrderStatus.DELIVERED, placedByExecId: 'exec.suresh@distributor.com', deliveredDate: new Date(Date.now() - 18 * 86400000).toISOString() },
  { id: 'ord002', distributorId: 'dist002', date: new Date(Date.now() - 15 * 86400000).toISOString(), totalAmount: 22420, status: OrderStatus.DELIVERED, placedByExecId: 'exec.suresh@distributor.com', deliveredDate: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: 'ord003', distributorId: 'dist001', date: new Date(Date.now() - 5 * 86400000).toISOString(), totalAmount: 15340, status: OrderStatus.DELIVERED, placedByExecId: 'exec.suresh@distributor.com', deliveredDate: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'ord004', distributorId: 'dist003', date: new Date(Date.now() - 3 * 86400000).toISOString(), totalAmount: 55200, status: OrderStatus.PENDING, placedByExecId: 'exec.priya@distributor.com' },
];

export const orderItems: OrderItem[] = [
  { id: 'item001', orderId: 'ord001', skuId: 'sku001', quantity: 100, unitPrice: 10, isFreebie: false, returnedQuantity: 0 },
  { id: 'item002', orderId: 'ord001', skuId: 'sku002', quantity: 400, unitPrice: 25, isFreebie: false, returnedQuantity: 0 },
  { id: 'item003', orderId: 'ord002', skuId: 'sku003', quantity: 200, unitPrice: 30, isFreebie: false, returnedQuantity: 0 },
  { id: 'item004', orderId: 'ord002', skuId: 'sku004', quantity: 200, unitPrice: 70, isFreebie: false, returnedQuantity: 10 },
  { id: 'item005', orderId: 'ord003', skuId: 'sku005', quantity: 100, unitPrice: 110, isFreebie: false, returnedQuantity: 0 }, // Gold Tier Price
  { id: 'item006', orderId: 'ord003', skuId: 'sku006', quantity: 50, unitPrice: 55, isFreebie: false, returnedQuantity: 0 },
  { id: 'item007', orderId: 'ord004', skuId: 'sku002', quantity: 1000, unitPrice: 25, isFreebie: false, returnedQuantity: 0 },
  { id: 'item008', orderId: 'ord004', skuId: 'sku004', quantity: 300, unitPrice: 70, isFreebie: false, returnedQuantity: 0 },
  { id: 'item009', orderId: 'ord004', skuId: 'sku001', quantity: 100, unitPrice: 0, isFreebie: true, returnedQuantity: 0 }, // From scheme
];

export const schemes: Scheme[] = [
  { id: 'sch001', description: 'Buy 10 cases of Chocolate Cream, get 1 case Classic free', buySkuId: 'sku002', buyQuantity: 100, getSkuId: 'sku001', getQuantity: 10, startDate: '2023-01-01T00:00:00Z', endDate: '2025-12-31T23:59:59Z', isGlobal: true },
  { id: 'sch002', description: 'Special Launch Offer on Nuts & Raisins for Anil Enterprises', buySkuId: 'sku005', buyQuantity: 50, getSkuId: 'sku006', getQuantity: 5, startDate: '2023-01-01T00:00:00Z', endDate: '2025-06-30T23:59:59Z', isGlobal: false, distributorId: 'dist001' },
  { id: 'sch003', description: 'Monsoon Sale - Vizag Store', buySkuId: 'sku003', buyQuantity: 20, getSkuId: 'sku001', getQuantity: 2, startDate: '2023-01-01T00:00:00Z', endDate: '2025-09-30T23:59:59Z', isGlobal: false, storeId: 'store002' },
  { id: 'sch004', description: 'Expired Scheme Example', buySkuId: 'sku001', buyQuantity: 10, getSkuId: 'sku001', getQuantity: 1, startDate: '2022-01-01T00:00:00Z', endDate: '2022-12-31T23:59:59Z', isGlobal: true },
];

export const walletTransactions: WalletTransaction[] = [
  { id: 'txn001', distributorId: 'dist001', date: new Date(Date.now() - 30 * 86400000).toISOString(), type: TransactionType.RECHARGE, amount: 50000, balanceAfter: 50000, paymentMethod: 'Bank Transfer', initiatedBy: 'plant.admin@distributor.com' },
  { id: 'txn002', distributorId: 'dist001', date: new Date(Date.now() - 20 * 86400000).toISOString(), type: TransactionType.ORDER_PAYMENT, amount: -11800, balanceAfter: 38200, orderId: 'ord001', initiatedBy: 'exec.suresh@distributor.com' },
  { id: 'txn003', distributorId: 'dist002', date: new Date(Date.now() - 16 * 86400000).toISOString(), type: TransactionType.RECHARGE, amount: 20000, balanceAfter: 20000, paymentMethod: 'UPI', initiatedBy: 'plant.admin@distributor.com' },
  { id: 'txn004', distributorId: 'dist002', date: new Date(Date.now() - 15 * 86400000).toISOString(), type: TransactionType.ORDER_PAYMENT, amount: -22420, balanceAfter: -2420, orderId: 'ord002', initiatedBy: 'exec.suresh@distributor.com' },
  { id: 'txn005', distributorId: 'dist001', date: new Date(Date.now() - 5 * 86400000).toISOString(), type: TransactionType.ORDER_PAYMENT, amount: -15340, balanceAfter: 22860, orderId: 'ord003', initiatedBy: 'exec.suresh@distributor.com' },
  { id: 'txn006', distributorId: 'dist003', date: new Date(Date.now() - 10 * 86400000).toISOString(), type: TransactionType.RECHARGE, amount: 200000, balanceAfter: 200000, paymentMethod: 'Cash', initiatedBy: 'plant.admin@distributor.com' },
];

export const notifications: Notification[] = [
  { id: 'notif001', date: new Date(Date.now() - 1 * 3600000).toISOString(), message: 'New order ORD004 placed for Coastal Distributors.', type: NotificationType.ORDER_PLACED, isRead: false },
  { id: 'notif002', date: new Date(Date.now() - 2 * 3600000).toISOString(), message: 'Wallet balance for Bharat Traders is low.', type: NotificationType.WALLET_LOW, isRead: false },
  { id: 'notif003', date: new Date(Date.now() - 5 * 86400000).toISOString(), message: 'New scheme "Monsoon Sale" is now active.', type: NotificationType.NEW_SCHEME, isRead: true },
];

export const orderReturns: OrderReturn[] = [
    { id: 'ret001', orderId: 'ord002', distributorId: 'dist002', status: ReturnStatus.CONFIRMED, initiatedBy: 'exec.suresh@distributor.com', initiatedDate: new Date(Date.now() - 13 * 86400000).toISOString(), confirmedBy: 'plant.admin@distributor.com', confirmedDate: new Date(Date.now() - 12 * 86400000).toISOString(), remarks: 'Customer rejected due to packaging damage.', totalCreditAmount: 735, items: [{ skuId: 'sku004', quantity: 10 }] },
];

export const stockItems: StockItem[] = [
    // Plant Stock
    { locationId: 'plant', skuId: 'sku001', quantity: 5000, reserved: 0 },
    { locationId: 'plant', skuId: 'sku002', quantity: 10000, reserved: 0 },
    { locationId: 'plant', skuId: 'sku003', quantity: 8000, reserved: 0 },
    { locationId: 'plant', skuId: 'sku004', quantity: 2500, reserved: 0 },
    { locationId: 'plant', skuId: 'sku005', quantity: 1000, reserved: 0 },
    { locationId: 'plant', skuId: 'sku006', quantity: 3000, reserved: 0 },
    // Vizag Store Stock
    { locationId: 'store002', skuId: 'sku001', quantity: 1000, reserved: 0 },
    { locationId: 'store002', skuId: 'sku002', quantity: 2500, reserved: 0 },
    { locationId: 'store002', skuId: 'sku004', quantity: 500, reserved: 0 },
];

export const stockLedger: StockLedgerEntry[] = [
    { id: 'sled001', date: new Date(Date.now() - 30 * 86400000).toISOString(), skuId: 'sku001', quantityChange: 10000, balanceAfter: 10000, type: StockMovementType.PRODUCTION, locationId: 'plant', notes: 'Weekly production run', initiatedBy: 'plant.admin@distributor.com' },
    { id: 'sled002', date: new Date(Date.now() - 18 * 86400000).toISOString(), skuId: 'sku001', quantityChange: -100, balanceAfter: 9900, type: StockMovementType.SALE, locationId: 'plant', notes: 'Order ord001 delivered', initiatedBy: 'system' },
    { id: 'sled003', date: new Date(Date.now() - 10 * 86400000).toISOString(), skuId: 'sku001', quantityChange: -1000, balanceAfter: 8900, type: StockMovementType.TRANSFER_OUT, locationId: 'plant', notes: 'Dispatch stf001 to Vizag Store', initiatedBy: 'plant.admin@distributor.com' },
    { id: 'sled004', date: new Date(Date.now() - 9 * 86400000).toISOString(), skuId: 'sku001', quantityChange: 1000, balanceAfter: 1000, type: StockMovementType.TRANSFER_IN, locationId: 'store002', notes: 'Received from dispatch stf001', initiatedBy: 'system' },
];

export const stockTransfers: StockTransfer[] = [
    { id: 'stf001', destinationStoreId: 'store002', date: new Date(Date.now() - 10 * 86400000).toISOString(), status: StockTransferStatus.DELIVERED, initiatedBy: 'plant.admin@distributor.com', deliveredDate: new Date(Date.now() - 9 * 86400000).toISOString(), totalValue: 35000 },
    { id: 'stf002', destinationStoreId: 'store003', date: new Date(Date.now() - 2 * 86400000).toISOString(), status: StockTransferStatus.PENDING, initiatedBy: 'plant.admin@distributor.com', totalValue: 87500 },
];

export const stockTransferItems: StockTransferItem[] = [
    { id: 'stfi001', transferId: 'stf001', skuId: 'sku001', quantity: 1000, unitPrice: 10, isFreebie: false },
    { id: 'stfi002', transferId: 'stf001', skuId: 'sku002', quantity: 1000, unitPrice: 25, isFreebie: false },
    { id: 'stfi003', transferId: 'stf002', skuId: 'sku004', quantity: 1250, unitPrice: 70, isFreebie: false },
];
