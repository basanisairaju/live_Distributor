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
  { id: 'sku004', name: 'Milk Cookies Family Pack', price: 75, hsnCode: '190590', gstPercentage: 12 },
  { id: 'sku005', name: 'Premium Nuts & Raisins Cookies', price: 120, hsnCode: '190590', gstPercentage: 18 },
];

export const priceTiers: PriceTier[] = [
    { id: 'tier001', name: 'Bulk Buyer Tier', description: 'Special pricing for high-volume distributors.' },
];

export const priceTierItems: PriceTierItem[] = [
    { tierId: 'tier001', skuId: 'sku004', price: 70 }, // Discounted family pack
    { tierId: 'tier001', skuId: 'sku005', price: 110 }, // Discounted premium cookies
];

let initialDistributors: Distributor[] = [
  {
    id: 'dist001', name: 'Gupta Trading Co.', phone: '9876543210', state: 'Maharashtra', area: 'Thane',
    creditLimit: 50000, gstin: '27AAPCG1234F1Z5', billingAddress: '123 Commerce St, Thane, Maharashtra',
    hasSpecialSchemes: false, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.suresh@distributor.com',
    walletBalance: 0, dateAdded: new Date('2022-07-15').toISOString(),
  },
  {
    id: 'dist002', name: 'Sharma Distributors', phone: '9876543211', state: 'Maharashtra', area: 'Andheri',
    creditLimit: 100000, gstin: '27ABCCG4321F1Z9', billingAddress: '456 Business Ave, Andheri, Maharashtra',
    hasSpecialSchemes: true, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.suresh@distributor.com',
    walletBalance: 0, dateAdded: new Date('2022-07-20').toISOString(),
    priceTierId: 'tier001',
  },
  {
    id: 'dist003', name: 'Delhi Foods Inc.', phone: '9876543212', state: 'Delhi', area: 'Connaught Place',
    creditLimit: 75000, gstin: '07AGSPD1234E1Z7', billingAddress: '789 Market Rd, CP, Delhi',
    hasSpecialSchemes: false, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.priya@distributor.com',
    walletBalance: 0, dateAdded: new Date('2022-08-10').toISOString(), storeId: 'store002',
  },
  {
    id: 'dist004', name: 'National Mega Mart', phone: '9876543213', state: 'Haryana', area: 'Gurugram',
    creditLimit: 200000, gstin: '06ACDCA5432E2Z8', billingAddress: '101 Cyber City, Gurugram, Haryana',
    hasSpecialSchemes: false, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.suresh@distributor.com',
    walletBalance: 0, dateAdded: new Date('2022-08-01').toISOString(),
  },
  {
    id: 'dist005', name: 'Prakash Enterprises', phone: '9123456789', state: 'Telangana', area: 'Banjara Hills',
    creditLimit: 60000, gstin: '36DEDDE1234D1Z2', billingAddress: '111 Rich Towers, Banjara Hills, Telangana',
    hasSpecialSchemes: false, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.priya@distributor.com',
    walletBalance: 0, dateAdded: new Date('2022-08-10').toISOString(), storeId: 'store003',
  },
  {
    id: 'dist006', name: 'Telangana Traders', phone: '9987654321', state: 'Telangana', area: 'Secunderabad',
    creditLimit: 120000, gstin: '36FGGFG5432F2Z3', billingAddress: '222 General Bazar, Secunderabad, Telangana',
    hasSpecialSchemes: true, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.priya@distributor.com',
    walletBalance: 0, dateAdded: new Date('2022-09-05').toISOString(), storeId: 'store003',
  },
  {
    id: 'dist007', name: 'Karnataka Biscuits Corp', phone: '9112233445', state: 'Karnataka', area: 'Bengaluru',
    creditLimit: 150000, gstin: '29AAAAA0000A1Z5', billingAddress: '333 Silicon Valley Rd, Bengaluru, Karnataka',
    hasSpecialSchemes: false, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.priya@distributor.com',
    walletBalance: 0, dateAdded: new Date('2023-01-20').toISOString(),
  },
  {
    id: 'dist008', name: 'Andhra Provisions', phone: '9223344556', state: 'Andhra Pradesh', area: 'Vijayawada',
    creditLimit: 80000, gstin: '37BBBBB1111B1Z9', billingAddress: '444 Krishna River Bank, Vijayawada, AP',
    hasSpecialSchemes: true, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.priya@distributor.com',
    walletBalance: 0, dateAdded: new Date('2023-02-11').toISOString(), storeId: 'store002',
  },
  {
    id: 'dist009', name: 'Pune Premium Foods', phone: '9334455667', state: 'Maharashtra', area: 'Pune',
    creditLimit: 90000, gstin: '27AAPPP2222F1Z6', billingAddress: '555 Deccan Gymkhana, Pune, Maharashtra',
    hasSpecialSchemes: false, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.suresh@distributor.com',
    walletBalance: 0, dateAdded: new Date('2023-03-01').toISOString(), priceTierId: 'tier001',
  },
  {
    id: 'dist010', name: 'South Delhi Suppliers', phone: '9445566778', state: 'Delhi', area: 'South Delhi',
    creditLimit: 110000, gstin: '07AGGGA3333E1Z8', billingAddress: '666 Hauz Khas Village, South Delhi, Delhi',
    hasSpecialSchemes: false, asmName: 'asm.rajesh@distributor.com', executiveName: 'exec.priya@distributor.com',
    walletBalance: 0, dateAdded: new Date('2023-04-15').toISOString(), storeId: 'store002',
  },
];

const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan'];
const lastNames = ['Traders', 'Enterprises', 'Distributors', 'Solutions', 'Co.', 'Inc.', 'Suppliers', 'Mart', 'Foods', 'Group'];
const locations = [
    { state: 'Maharashtra', area: 'Mumbai', gstinCode: '27' }, { state: 'Maharashtra', area: 'Pune', gstinCode: '27' },
    { state: 'Delhi', area: 'North Delhi', gstinCode: '07' }, { state: 'Karnataka', area: 'Bengaluru', gstinCode: '29' },
    { state: 'Telangana', area: 'Hyderabad', gstinCode: '36' }, { state: 'Tamil Nadu', area: 'Chennai', gstinCode: '33' },
];
const asmUsers = users.filter(u => u.role === UserRole.ASM).map(u => u.username);
const executiveUsers = users.filter(u => u.role === UserRole.EXECUTIVE).map(u => u.username);
const storeIds = [undefined, ...stores.map(s => s.id)];
const priceTierIds = [undefined, ...priceTiers.map(p => p.id)];
const generatedDistributors: Distributor[] = [];
for (let i = 0; i < 190; i++) {
    const idNum = 11 + i;
    const location = locations[i % locations.length];
    const randomPan = (Math.random().toString(36).substring(2, 7)).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 730));
    generatedDistributors.push({
        id: `dist${idNum.toString().padStart(3, '0')}`,
        name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
// FIX: The toString method was missing parentheses, causing the function reference to be stringified instead of the random number. This results in an invalid phone number.
        phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(), state: location.state, area: location.area,
        creditLimit: (Math.floor(Math.random() * 8) + 2) * 25000,
        gstin: `${location.gstinCode}${randomPan}${randomDigits}A1Z${i % 10}`,
        billingAddress: `${i + 100}, Main Street, ${location.area}, ${location.state}`,
        hasSpecialSchemes: Math.random() < 0.2,
        asmName: asmUsers[i % asmUsers.length], executiveName: executiveUsers[i % executiveUsers.length],
        walletBalance: 0, dateAdded: date.toISOString(),
        priceTierId: Math.random() < 0.3 ? priceTierIds[1] : undefined,
        storeId: storeIds[i % storeIds.length],
    });
}
initialDistributors.push(...generatedDistributors);

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const generateTwoYearsData = () => {
    let mutableOrders: Order[] = [];
    let mutableOrderItems: OrderItem[] = [];
    let mutableWalletTransactions: WalletTransaction[] = [];
    let mutableStockItems: StockItem[] = [];
    let mutableStockLedger: StockLedgerEntry[] = [];
    let mutableStockTransfers: StockTransfer[] = [];
    let mutableStockTransferItems: StockTransferItem[] = [];

    let orderIdCounter = 100, itemIdCounter = 100, txnIdCounter = 100, sledIdCounter = 100, stfIdCounter = 100, stfiIdCounter = 100;
    
    // Initialize stock
    const allLocationIds = ['plant', ...stores.map(s => s.id)];
    allLocationIds.forEach(locId => {
        skus.forEach(sku => {
            const initialQty = locId === 'plant' ? 200000 : 0;
            mutableStockItems.push({ locationId: locId, skuId: sku.id, quantity: initialQty, reserved: 0 });
            if (initialQty > 0) {
                 mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString(), skuId: sku.id, quantityChange: initialQty, balanceAfter: initialQty, type: StockMovementType.PRODUCTION, locationId: locId, notes: 'Initial Stock', initiatedBy: 'system' });
            }
        });
    });

    const accountWallets: Record<string, number> = {};
    initialDistributors.forEach(d => { accountWallets[d.id] = 0; });
    stores.forEach(s => { accountWallets[s.id] = 0; });

    const allChronologicalEvents: any[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    const endDate = new Date();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = new Date(d).toISOString();
        // Monthly Production
        if (d.getDate() === 1) {
             skus.forEach(sku => {
                allChronologicalEvents.push({ type: 'PRODUCTION', date: dateStr, skuId: sku.id, quantity: Math.floor(Math.random() * 20000) + 50000 });
            });
        }
        // Bimonthly store transfers
        if (d.getDate() === 15 && stores.length > 0) {
            stores.forEach(store => {
                allChronologicalEvents.push({ type: 'TRANSFER_CREATION', date: dateStr, storeId: store.id });
            });
        }
        // Random Recharges
        if (Math.random() < 0.1) {
             const dist = initialDistributors[Math.floor(Math.random() * initialDistributors.length)];
             allChronologicalEvents.push({ type: 'RECHARGE', date: dateStr, accountId: dist.id, accountType: 'distributor', amount: (Math.floor(Math.random() * 10) + 1) * 10000 });
        }
        // Random Orders
        if (Math.random() < 0.7) {
            for(let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
                const dist = initialDistributors[Math.floor(Math.random() * initialDistributors.length)];
                allChronologicalEvents.push({ type: 'ORDER_CREATION', date: dateStr, distributorId: dist.id });
            }
        }
    }

    allChronologicalEvents.forEach(event => {
        if (event.type === 'PRODUCTION') {
            const stockItem = mutableStockItems.find(si => si.locationId === 'plant' && si.skuId === event.skuId)!;
            stockItem.quantity += event.quantity;
            mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: event.date, skuId: event.skuId, quantityChange: event.quantity, balanceAfter: stockItem.quantity, type: StockMovementType.PRODUCTION, locationId: 'plant', notes: 'Monthly Production', initiatedBy: 'plant.admin@distributor.com' });
        }
        else if (event.type === 'RECHARGE') {
             accountWallets[event.accountId] += event.amount;
             mutableWalletTransactions.push({ id: `txn${txnIdCounter++}`, distributorId: event.accountId, date: event.date, type: TransactionType.RECHARGE, amount: event.amount, balanceAfter: accountWallets[event.accountId], paymentMethod: 'UPI', initiatedBy: 'plant.admin@distributor.com' });
        }
        else if (event.type === 'TRANSFER_CREATION') {
            const transferItems = skus.map(sku => ({ skuId: sku.id, quantity: Math.floor(Math.random() * 2000) + 1000, unitPrice: sku.price }));
            const totalValue = transferItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            const isDelivered = new Date(event.date) < new Date(new Date().setDate(endDate.getDate() - 5));

            const newTransfer: StockTransfer = { id: `stf${stfIdCounter++}`, destinationStoreId: event.storeId, date: event.date, status: isDelivered ? StockTransferStatus.DELIVERED : StockTransferStatus.PENDING, initiatedBy: 'plant.admin@distributor.com', totalValue, deliveredDate: isDelivered ? new Date(new Date(event.date).getTime() + 86400000 * 2).toISOString() : undefined };
            mutableStockTransfers.push(newTransfer);

            transferItems.forEach(item => {
                mutableStockTransferItems.push({ id: `stfi${stfiIdCounter++}`, transferId: newTransfer.id, ...item, isFreebie: false });
                const plantStock = mutableStockItems.find(si => si.locationId === 'plant' && si.skuId === item.skuId)!;
                plantStock.reserved += item.quantity;
                mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: event.date, skuId: item.skuId, quantityChange: 0, balanceAfter: plantStock.quantity, type: StockMovementType.RESERVED, locationId: 'plant', notes: `For Dispatch ${newTransfer.id}`, initiatedBy: 'plant.admin@distributor.com' });
                
                if (isDelivered) {
                    plantStock.reserved -= item.quantity;
                    plantStock.quantity -= item.quantity;
                    mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: newTransfer.deliveredDate!, skuId: item.skuId, quantityChange: 0, balanceAfter: plantStock.quantity, type: StockMovementType.UNRESERVED, locationId: 'plant', notes: `For Dispatch ${newTransfer.id}`, initiatedBy: 'plant.admin@distributor.com' });
                    mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: newTransfer.deliveredDate!, skuId: item.skuId, quantityChange: -item.quantity, balanceAfter: plantStock.quantity, type: StockMovementType.TRANSFER_OUT, locationId: 'plant', notes: `Dispatch ${newTransfer.id}`, initiatedBy: 'plant.admin@distributor.com' });
                    
                    const storeStock = mutableStockItems.find(si => si.locationId === event.storeId && si.skuId === item.skuId)!;
                    storeStock.quantity += item.quantity;
                    mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: newTransfer.deliveredDate!, skuId: item.skuId, quantityChange: item.quantity, balanceAfter: storeStock.quantity, type: StockMovementType.TRANSFER_IN, locationId: event.storeId, notes: `From Dispatch ${newTransfer.id}`, initiatedBy: 'plant.admin@distributor.com' });
                }
            });
        }
        else if (event.type === 'ORDER_CREATION') {
            const dist = initialDistributors.find(d => d.id === event.distributorId)!;
            const locationId = dist.storeId || 'plant';
            const itemsInOrder: { skuId: string, quantity: number, unitPrice: number, isFreebie: boolean }[] = [];
            let totalAmount = 0;
            
            for (let j = 0; j < Math.floor(Math.random() * 4) + 1; j++) {
                const sku = skus[Math.floor(Math.random() * skus.length)];
                const quantity = Math.floor(Math.random() * 150) + 20;
                const stockItem = mutableStockItems.find(si => si.locationId === locationId && si.skuId === sku.id)!;
                if (stockItem.quantity - stockItem.reserved < quantity) continue; // Skip if no stock
                
                const unitPrice = sku.price;
                itemsInOrder.push({ skuId: sku.id, quantity, unitPrice, isFreebie: false });
                totalAmount += quantity * unitPrice * (1 + sku.gstPercentage / 100);
            }
            if (itemsInOrder.length === 0) return; // Skip if no items could be added

            const isDelivered = new Date(event.date) < new Date(new Date().setDate(endDate.getDate() - 5));
            const newOrder: Order = { id: `ord${orderIdCounter++}`, distributorId: dist.id, date: event.date, totalAmount: parseFloat(totalAmount.toFixed(2)), status: isDelivered ? OrderStatus.DELIVERED : OrderStatus.PENDING, placedByExecId: dist.executiveName, deliveredDate: isDelivered ? new Date(new Date(event.date).getTime() + 86400000 * 2).toISOString() : undefined };
            mutableOrders.push(newOrder);
            
            itemsInOrder.forEach(item => {
                mutableOrderItems.push({ id: `item${itemIdCounter++}`, orderId: newOrder.id, ...item, returnedQuantity: 0 });
                const stockItem = mutableStockItems.find(si => si.locationId === locationId && si.skuId === item.skuId)!;
                stockItem.reserved += item.quantity;
                mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: event.date, skuId: item.skuId, quantityChange: 0, balanceAfter: stockItem.quantity, type: StockMovementType.RESERVED, locationId, notes: `For Order ${newOrder.id}`, initiatedBy: dist.executiveName });
                
                if (isDelivered) {
                    stockItem.reserved -= item.quantity;
                    stockItem.quantity -= item.quantity;
                    mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: newOrder.deliveredDate!, skuId: item.skuId, quantityChange: 0, balanceAfter: stockItem.quantity, type: StockMovementType.UNRESERVED, locationId, notes: `For Order ${newOrder.id}`, initiatedBy: dist.executiveName });
                    mutableStockLedger.push({ id: `sled${sledIdCounter++}`, date: newOrder.deliveredDate!, skuId: item.skuId, quantityChange: -item.quantity, balanceAfter: stockItem.quantity, type: StockMovementType.SALE, locationId, notes: `Order ${newOrder.id}`, initiatedBy: dist.executiveName });
                }
            });

            accountWallets[dist.id] -= newOrder.totalAmount;
            mutableWalletTransactions.push({ id: `txn${txnIdCounter++}`, distributorId: dist.id, date: event.date, type: TransactionType.ORDER_PAYMENT, amount: -newOrder.totalAmount, balanceAfter: accountWallets[dist.id], orderId: newOrder.id, initiatedBy: dist.executiveName });
        }
    });

    initialDistributors.forEach(dist => { dist.walletBalance = accountWallets[dist.id] || 0; });
    stores.forEach(store => { store.walletBalance = accountWallets[store.id] || 0; });

    return {
        orders: mutableOrders, orderItems: mutableOrderItems, walletTransactions: mutableWalletTransactions,
        stockItems: mutableStockItems, stockLedger: mutableStockLedger, stockTransfers: mutableStockTransfers,
        stockTransferItems: mutableStockTransferItems, distributors: initialDistributors
    };
};

const generated = generateTwoYearsData();

export const distributors: Distributor[] = generated.distributors;
export const orders: Order[] = generated.orders;
export const orderItems: OrderItem[] = generated.orderItems;
export const walletTransactions: WalletTransaction[] = generated.walletTransactions;
export const stockItems: StockItem[] = generated.stockItems;
export const stockLedger: StockLedgerEntry[] = generated.stockLedger;
export const stockTransfers: StockTransfer[] = generated.stockTransfers;
export const stockTransferItems: StockTransferItem[] = generated.stockTransferItems;


export const schemes: Scheme[] = [
    {
        id: 'sch001', description: 'Annual Bonanza: Buy 100 Classic Biscuits, Get 10 Free!',
        buySkuId: 'sku001', buyQuantity: 100, getSkuId: 'sku001', getQuantity: 10,
        startDate: new Date('2022-10-01').toISOString(), endDate: new Date('2024-12-31').toISOString(),
        isGlobal: true,
    },
    {
        id: 'sch002', description: 'Sharma Special: Buy 10 Milk Cookies, Get 1 Choco Cream Free!',
        buySkuId: 'sku004', buyQuantity: 10, getSkuId: 'sku002', getQuantity: 1,
        startDate: new Date('2022-07-01').toISOString(), endDate: new Date('2024-12-31').toISOString(),
        isGlobal: false, distributorId: 'dist002',
    },
    {
        id: 'sch003', description: 'Vizag Store Special: Buy 50 Crackers, Get 5 free',
        buySkuId: 'sku003', buyQuantity: 50, getSkuId: 'sku003', getQuantity: 5,
        startDate: new Date('2023-01-01').toISOString(), endDate: new Date('2024-12-31').toISOString(),
        isGlobal: false, storeId: 'store002',
    },
    {
        id: 'sch004', description: 'Telangana Special: Buy 20 Premium Cookies, Get 2 free',
        buySkuId: 'sku005', buyQuantity: 20, getSkuId: 'sku005', getQuantity: 2,
        startDate: new Date('2023-01-01').toISOString(), endDate: new Date('2024-12-31').toISOString(),
        isGlobal: false, storeId: 'store003',
    }
];

export const notifications: Notification[] = [
    { id: 'notif001', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), message: 'Wallet balance for Sharma Distributors is running low.', type: NotificationType.WALLET_LOW, isRead: false },
    { id: 'notif002', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), message: `New order ${orders.filter(o => o.status === 'Pending').slice(-1)[0]?.id} placed for ${distributors.find(d => d.id === orders.filter(o => o.status === 'Pending').slice(-1)[0]?.distributorId)?.name}.`, type: NotificationType.ORDER_PLACED, isRead: false },
];

export const orderReturns: OrderReturn[] = [
    {
        id: 'ret001',
        orderId: 'ord102',
        distributorId: 'dist002',
        status: ReturnStatus.CONFIRMED,
        initiatedBy: 'exec.suresh@distributor.com',
        initiatedDate: new Date(new Date().setDate(new Date().getDate() - 50)).toISOString(),
        confirmedBy: 'plant.admin@distributor.com',
        confirmedDate: new Date(new Date().setDate(new Date().getDate() - 48)).toISOString(),
        remarks: '10 packs were damaged in transit.',
        totalCreditAmount: 784, // 10 * 70 * (1 + 0.12 GST)
        items: [{ skuId: 'sku004', quantity: 10 }],
    }
];
