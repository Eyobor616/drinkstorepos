import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// --- TYPE DEFINITIONS ---
interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

interface Inventory {
  productId: number;
  stock: number;
  threshold: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Sale {
    id: string;
    date: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    discountPercent?: number;
    discountAmount?: number;
    total: number;
}

interface Settings {
    storeName: string;
    taxRate: number; // Stored as a percentage, e.g., 8.5
    currencySymbol: string;
    defaultThreshold: number;
}

// --- PROPS INTERFACES ---
interface ProductItemProps {
  product: Product;
  inventoryItem: Inventory;
  onAddToCart: (product: Product) => void;
  formatCurrency: (amount: number) => string;
}

interface CartItemComponentProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
  formatCurrency: (amount: number) => string;
}

interface DashboardViewProps {
    sales: Sale[];
    inventory: Inventory[];
    products: Product[];
    formatCurrency: (amount: number) => string;
}

interface SalesHistoryViewProps {
    sales: Sale[];
    formatCurrency: (amount: number) => string;
}

interface SettingsPageProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    inventory: Inventory[];
    setInventory: React.Dispatch<React.SetStateAction<Inventory[]>>;
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}


// --- INITIAL DATA & LOCALSTORAGE SETUP ---
const initialProducts: Product[] = [
  { id: 1, name: 'Espresso', price: 2.50, image: 'https://images.unsplash.com/photo-1511920183353-3c9c66112d9b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Coffee' },
  { id: 2, name: 'Latte', price: 3.50, image: 'https://images.unsplash.com/photo-1561882468-91101f2e5f80?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Coffee' },
  { id: 3, name: 'Croissant', price: 2.75, image: 'https://images.unsplash.com/photo-1587590227264-0ac64ce63ce8?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Food' },
  { id: 4, name: 'Muffin', price: 3.00, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Food' },
  { id: 5, name: 'Sandwich', price: 6.50, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c766?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Food' },
  { id: 6, name: 'Iced Tea', price: 2.25, image: 'https://images.unsplash.com/photo-1542586948-49813253549d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Beverage' },
  { id: 7, name: 'Soda', price: 1.75, image: 'https://images.unsplash.com/photo-1554866585-39a9b1c35b85?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Beverage' },
  { id: 8, name: 'Cappuccino', price: 3.25, image: 'https://images.unsplash.com/photo-1557142046-c704a3adf364?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', category: 'Coffee' },
];

const initialInventory: Inventory[] = [
  { productId: 1, stock: 100, threshold: 10 },
  { productId: 2, stock: 80, threshold: 10 },
  { productId: 3, stock: 50, threshold: 5 },
  { productId: 4, stock: 60, threshold: 5 },
  { productId: 5, stock: 8, threshold: 10 },
  { productId: 6, stock: 75, threshold: 10 },
  { productId: 7, stock: 150, threshold: 20 },
  { productId: 8, stock: 70, threshold: 10 },
];

const defaultSettings: Settings = {
    storeName: 'The Drink Spot POS',
    taxRate: 8.5,
    currencySymbol: '$',
    defaultThreshold: 10
};

const initializeData = () => {
  if (!localStorage.getItem('products')) {
    localStorage.setItem('products', JSON.stringify(initialProducts));
  }
  if (!localStorage.getItem('inventory')) {
    localStorage.setItem('inventory', JSON.stringify(initialInventory));
  }
   if (!localStorage.getItem('sales')) {
    localStorage.setItem('sales', JSON.stringify([]));
  }
  if (!localStorage.getItem('settings')) {
    localStorage.setItem('settings', JSON.stringify(defaultSettings));
  }
};

initializeData();

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number, symbol: string = '$') => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // This is a placeholder; the symbol is what matters visually
  }).format(amount);
  return symbol + formatted.slice(1);
};


// --- UI COMPONENTS ---

const ProductItem: React.FC<ProductItemProps> = ({ product, inventoryItem, onAddToCart, formatCurrency }) => {
  const isOutOfStock = inventoryItem.stock <= 0;
  const isLowStock = inventoryItem.stock > 0 && inventoryItem.stock <= inventoryItem.threshold;
  
  return (
    <div className="product-card" role="listitem">
      <img src={product.image} alt={product.name} className="product-image" />
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-price">{formatCurrency(product.price)}</p>
        <p className={`product-stock ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}>
          Stock: {inventoryItem.stock}
        </p>
      </div>
      <button 
        className="add-to-cart-btn" 
        onClick={() => onAddToCart(product)} 
        disabled={isOutOfStock}
        aria-label={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
      >
        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  );
};

const CartItemComponent: React.FC<CartItemComponentProps> = ({ item, onUpdateQuantity, onRemoveItem, formatCurrency }) => {
  return (
    <div className="cart-item" role="listitem">
      <div className="cart-item-info">
        <p className="cart-item-name">{item.name}</p>
        <p className="cart-item-price">{formatCurrency(item.price * item.quantity)}</p>
      </div>
      <div className="cart-item-controls">
        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} aria-label={`Decrease quantity of ${item.name}`}>-</button>
        <span>{item.quantity}</span>
        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} aria-label={`Increase quantity of ${item.name}`}>+</button>
        <button className="remove-btn" onClick={() => onRemoveItem(item.id)} aria-label={`Remove ${item.name} from cart`}>×</button>
      </div>
    </div>
  );
};

const ReceiptModal = ({ order, onClose, onNewSale, settings }: { order: Sale; onClose: () => void; onNewSale: () => void, settings: Settings }) => {
    if (!order) return null;
    const formatCurrencyWithSettings = (amount: number) => formatCurrency(amount, settings.currencySymbol);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div id="receipt">
                    <div className="modal-header">
                        <h2>Sales Receipt</h2>
                        <button onClick={onClose} className="close-modal-btn" aria-label="Close receipt">×</button>
                    </div>
                    <div className="receipt-body">
                         <div className="receipt-header-info">
                            <h3>{settings.storeName}</h3>
                            <p><strong>Order ID:</strong> {order.id.slice(-8)}</p>
                            <p><strong>Date:</strong> {new Date(order.date).toLocaleString()}</p>
                            <p><strong>Cashier:</strong> 001</p>
                        </div>

                        <table className="receipt-items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrencyWithSettings(item.price)}</td>
                                        <td>{formatCurrencyWithSettings(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="receipt-summary">
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>{formatCurrencyWithSettings(order.subtotal)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Tax</span>
                                <span>{formatCurrencyWithSettings(order.tax)}</span>
                            </div>
                            {order.discountAmount > 0 && (
                                <div className="summary-row discount">
                                    <span>Discount ({order.discountPercent}%)</span>
                                    <span>-{formatCurrencyWithSettings(order.discountAmount)}</span>
                                </div>
                            )}
                            <div className="summary-row total">
                                <span>Total</span>
                                <span>{formatCurrencyWithSettings(order.total)}</span>
                            </div>
                        </div>
                        <div className="receipt-footer">
                            <p>Thank you for your purchase!</p>
                        </div>
                    </div>
                </div>
                <div className="modal-actions">
                    <button onClick={onClose} className="back-btn" aria-label="Back to cart" title="Back to cart">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                    </button>
                    <button onClick={handlePrint} className="print-btn">Print Receipt</button>
                    <button onClick={onNewSale} className="new-sale-btn">New Sale</button>
                </div>
            </div>
        </div>
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ sales, inventory, products, formatCurrency }) => {
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const stats = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const periods = {
            today: { revenue: 0, salesCount: 0 },
            week: { revenue: 0, salesCount: 0 },
            month: { revenue: 0, salesCount: 0 },
        };

        sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            
            if (saleDate >= todayStart) {
                periods.today.revenue += sale.total;
                periods.today.salesCount++;
            }
            if (saleDate >= weekStart) {
                periods.week.revenue += sale.total;
                periods.week.salesCount++;
            }
            if (saleDate >= monthStart) {
                periods.month.revenue += sale.total;
                periods.month.salesCount++;
            }
        });

        const calculateAverage = (revenue: number, count: number) => count > 0 ? revenue / count : 0;

        return {
            today: { ...periods.today, average: calculateAverage(periods.today.revenue, periods.today.salesCount) },
            week: { ...periods.week, average: calculateAverage(periods.week.revenue, periods.week.salesCount) },
            month: { ...periods.month, average: calculateAverage(periods.month.revenue, periods.month.salesCount) },
        };
    }, [sales]);

    const lowStockItems = useMemo(() => {
        const productMap = new Map(products.map(p => [p.id, p.name]));
        return inventory
            .filter(item => item.stock <= item.threshold)
            .map(item => ({ ...item, name: productMap.get(item.productId) || 'Unknown Product' }))
            .sort((a,b) => a.stock - b.stock);
    }, [inventory, products]);

    const kpiData = [
        { title: 'Today', data: stats.today },
        { title: 'This Week', data: stats.week },
        { title: 'This Month', data: stats.month },
    ];

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <section className="kpi-grid" aria-labelledby="kpi-heading">
                <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
                {kpiData.map(({ title, data }) => (
                    <div className="kpi-card" key={title}>
                        <h3>{title}</h3>
                        <div className="kpi-metric">
                            <span>Total Revenue</span>
                            <p>{formatCurrency(data.revenue)}</p>
                        </div>
                        <div className="kpi-metric">
                            <span>Number of Sales</span>
                            <p>{data.salesCount}</p>
                        </div>
                        <div className="kpi-metric">
                            <span>Average Sale</span>
                            <p>{formatCurrency(data.average)}</p>
                        </div>
                    </div>
                ))}
            </section>

            <section className="dashboard-section" aria-labelledby="low-stock-heading">
                <h2 id="low-stock-heading">Low Stock Items</h2>
                {lowStockItems.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Current Stock</th>
                                <th>Threshold</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lowStockItems.map(item => (
                                <tr key={item.productId}>
                                    <td>{item.name}</td>
                                    <td className="stock-warning">{item.stock}</td>
                                    <td>{item.threshold}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="empty-state-message">All stock levels are healthy!</p>
                )}
            </section>
            
            <section className="dashboard-section" aria-labelledby="recent-sales-heading">
                <h2 id="recent-sales-heading">Recent Sales</h2>
                 {sales.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...sales].reverse().slice(0, 10).map(sale => (
                                <tr key={sale.id}>
                                    <td>{sale.id.slice(-6)}...</td>
                                    <td>{new Date(sale.date).toLocaleDateString()}</td>
                                    <td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                    <td>{formatCurrency(sale.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="empty-state-message">No sales have been recorded yet.</p>
                )}
            </section>
        </div>
    );
};

const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ sales, formatCurrency }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

    const filteredSales = useMemo(() => {
        return [...sales]
            .reverse()
            .filter(sale => {
                const lowercasedTerm = searchTerm.toLowerCase();

                const matchesSearch = lowercasedTerm === '' ||
                    sale.id.toLowerCase().includes(lowercasedTerm) ||
                    sale.items.some(item => item.name.toLowerCase().includes(lowercasedTerm));
                
                if (!matchesSearch) return false;

                if (startDate && new Date(sale.date) < new Date(startDate)) return false;
                if (endDate) {
                    const endOfDay = new Date(endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (new Date(sale.date) > endOfDay) return false;
                }

                return true;
            });
    }, [sales, searchTerm, startDate, endDate]);

    const toggleExpand = (saleId: string) => {
        setExpandedSaleId(prevId => (prevId === saleId ? null : saleId));
    };

    return (
        <div className="sales-history-container">
            <header className="filter-header">
                <h2>Sales History</h2>
                <div className="filters">
                    <input 
                        type="search" 
                        placeholder="Search by ID or Product..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <div className="date-filters">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} aria-label="Start date" />
                        <span>to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} aria-label="End date" />
                    </div>
                </div>
            </header>

            <div className="sales-list">
                {filteredSales.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th className="sr-only">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map(sale => (
                                <React.Fragment key={sale.id}>
                                    <tr onClick={() => toggleExpand(sale.id)} className="sale-row">
                                        <td>{sale.id.slice(-8)}</td>
                                        <td>{new Date(sale.date).toLocaleString()}</td>
                                        <td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                        <td>{formatCurrency(sale.total)}</td>
                                        <td>
                                            <button className="expand-btn">
                                                {expandedSaleId === sale.id ? 'Hide' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedSaleId === sale.id && (
                                        <tr className="sale-details-row">
                                            <td colSpan={5}>
                                                <div className="sale-details-content">
                                                    <h4>Order Details</h4>
                                                    <ul>
                                                        {sale.items.map(item => (
                                                            <li key={item.id}>
                                                                <span>{item.name} (x{item.quantity})</span>
                                                                <span>{formatCurrency(item.price * item.quantity)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="empty-state-message">No matching sales found.</p>
                )}
            </div>
        </div>
    );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ products, setProducts, inventory, setInventory, settings, setSettings }) => {
    
    // --- State for Forms and Modals ---
    const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', image: '', stock: '' });
    const [editingProduct, setEditingProduct] = useState<{ product: Product; inventory: Inventory } | null>(null);
    const [productSearch, setProductSearch] = useState('');

    // --- Handlers for Settings ---
    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: name === 'taxRate' || name === 'defaultThreshold' ? parseFloat(value) || 0 : value }));
    };

    // --- Handlers for Product Management ---
    const handleNewProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewProduct(prev => ({ ...prev, [name]: value }));
    };
    
    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        const { name, category, price, image, stock } = newProduct;
        if (!name || !category || !price || !stock) {
            alert('Please fill in all required product fields.');
            return;
        }

        const newProductId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        const productToAdd: Product = {
            id: newProductId,
            name,
            category,
            price: parseFloat(price),
            image,
        };
        const inventoryToAdd: Inventory = {
            productId: newProductId,
            stock: parseInt(stock, 10),
            threshold: settings.defaultThreshold,
        };

        setProducts(prev => [...prev, productToAdd]);
        setInventory(prev => [...prev, inventoryToAdd]);
        setNewProduct({ name: '', category: '', price: '', image: '', stock: '' }); // Reset form
    };
    
    const handleDeleteProduct = (productId: number) => {
        if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            setProducts(prev => prev.filter(p => p.id !== productId));
            setInventory(prev => prev.filter(i => i.productId !== productId));
        }
    };
    
    const handleUpdateProduct = () => {
        if (!editingProduct) return;
        setProducts(prev => prev.map(p => p.id === editingProduct.product.id ? editingProduct.product : p));
        setInventory(prev => prev.map(i => i.productId === editingProduct.inventory.productId ? editingProduct.inventory : i));
        setEditingProduct(null); // Close modal
    };
    
    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    }, [products, productSearch]);

    return (
        <div className="settings-container">
            <section className="settings-section">
                <h2>Store Configuration</h2>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="storeName">Store Name</label>
                        <input type="text" id="storeName" name="storeName" value={settings.storeName} onChange={handleSettingChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="currencySymbol">Currency Symbol</label>
                        <input type="text" id="currencySymbol" name="currencySymbol" value={settings.currencySymbol} onChange={handleSettingChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="taxRate">Tax Rate (%)</label>
                        <input type="number" id="taxRate" name="taxRate" value={settings.taxRate} onChange={handleSettingChange} min="0" step="0.1" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="defaultThreshold">Default Stock Threshold</label>
                        <input type="number" id="defaultThreshold" name="defaultThreshold" value={settings.defaultThreshold} onChange={handleSettingChange} min="0" />
                    </div>
                </div>
            </section>
            
            <section className="settings-section">
                <h2>Product Management</h2>
                <div className="product-management-grid">
                    <div className="product-add-form">
                        <h3>Add New Product</h3>
                        <form onSubmit={handleAddProduct}>
                            <div className="form-group">
                                <label>Name</label>
                                <input name="name" value={newProduct.name} onChange={handleNewProductChange} required />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <input name="category" value={newProduct.category} onChange={handleNewProductChange} required />
                            </div>
                            <div className="form-group">
                                <label>Price</label>
                                <input type="number" name="price" value={newProduct.price} onChange={handleNewProductChange} min="0" step="0.01" required />
                            </div>
                            <div className="form-group">
                                <label>Initial Stock</label>
                                <input type="number" name="stock" value={newProduct.stock} onChange={handleNewProductChange} min="0" required />
                            </div>
                            <div className="form-group">
                                <label>Image URL (Optional)</label>
                                <input name="image" value={newProduct.image} onChange={handleNewProductChange} />
                            </div>
                            <button type="submit" className="add-product-btn">Add Product</button>
                        </form>
                    </div>
                    <div className="product-list-container">
                        <h3>Existing Products</h3>
                        <input type="search" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="search-input" />
                        <div className="product-list-table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => {
                                        // FIX: Added missing 'productId' to the fallback inventory object to resolve a TypeScript error.
                                        const inv = inventory.find(i => i.productId === p.id) || { productId: p.id, stock: 0, threshold: settings.defaultThreshold };
                                        return (
                                            <tr key={p.id}>
                                                <td>{p.name}</td>
                                                <td>{p.category}</td>
                                                <td>{formatCurrency(p.price, settings.currencySymbol)}</td>
                                                <td>{inv.stock}</td>
                                                <td className="product-actions">
                                                    <button onClick={() => setEditingProduct({ product: p, inventory: inv })}>Edit</button>
                                                    <button onClick={() => handleDeleteProduct(p.id)} className="delete">Delete</button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
            {editingProduct && (
                <div className="modal-overlay">
                    <div className="modal-content edit-product-modal">
                         <h2>Edit {editingProduct.product.name}</h2>
                         <div className="form-grid">
                            <div className="form-group">
                                <label>Name</label>
                                <input value={editingProduct.product.name} onChange={e => setEditingProduct(prev => prev && ({...prev, product: {...prev.product, name: e.target.value}}))} />
                            </div>
                             <div className="form-group">
                                <label>Category</label>
                                <input value={editingProduct.product.category} onChange={e => setEditingProduct(prev => prev && ({...prev, product: {...prev.product, category: e.target.value}}))} />
                            </div>
                             <div className="form-group">
                                <label>Price</label>
                                <input type="number" value={editingProduct.product.price} onChange={e => setEditingProduct(prev => prev && ({...prev, product: {...prev.product, price: parseFloat(e.target.value) || 0}}))} />
                            </div>
                             <div className="form-group">
                                <label>Image URL</label>
                                <input value={editingProduct.product.image} onChange={e => setEditingProduct(prev => prev && ({...prev, product: {...prev.product, image: e.target.value}}))} />
                            </div>
                             <div className="form-group">
                                <label>Stock</label>
                                <input type="number" value={editingProduct.inventory.stock} onChange={e => setEditingProduct(prev => prev && ({...prev, inventory: {...prev.inventory, stock: parseInt(e.target.value, 10) || 0}}))} />
                            </div>
                             <div className="form-group">
                                <label>Threshold</label>
                                <input type="number" value={editingProduct.inventory.threshold} onChange={e => setEditingProduct(prev => prev && ({...prev, inventory: {...prev.inventory, threshold: parseInt(e.target.value, 10) || 0}}))} />
                            </div>
                         </div>
                         <div className="modal-actions">
                            <button onClick={() => setEditingProduct(null)}>Cancel</button>
                            <button onClick={handleUpdateProduct} className="save-btn">Save Changes</button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- LAYOUT COMPONENTS ---

const Header = ({ view, onToggleNav }: { view: string; onToggleNav: () => void }) => {
    const titles: { [key: string]: string } = {
        pos: 'Point of Sale',
        dashboard: 'Dashboard',
        sales: 'Sales History',
        settings: 'Settings'
    }
    return (
        <header className="header">
            <button className="nav-toggle" onClick={onToggleNav} aria-label="Toggle navigation menu" aria-controls="sidebar-nav" aria-expanded="false">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="header-title">
                <h1>{titles[view]}</h1>
            </div>
        </header>
    );
};

const Sidebar = ({ view, setView, isNavOpen, setIsNavOpen, storeName }: { view: string; setView: (view: 'pos' | 'dashboard' | 'sales' | 'settings') => void; isNavOpen: boolean; setIsNavOpen: (isOpen: boolean) => void; storeName: string }) => {
    const handleNavClick = (newView: 'pos' | 'dashboard' | 'sales' | 'settings') => {
        setView(newView);
        setIsNavOpen(false);
    };
    return (
        <>
            {isNavOpen && <div className="nav-overlay" onClick={() => setIsNavOpen(false)}></div>}
            <aside id="sidebar-nav" className={`sidebar ${isNavOpen ? 'open' : ''}`}>
                 <div className="sidebar-header">
                     <h2>{storeName}</h2>
                 </div>
                 <nav className="sidebar-nav">
                    <button onClick={() => handleNavClick('pos')} className={view === 'pos' ? 'active' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        <span>Point of Sale</span>
                    </button>
                    <button onClick={() => handleNavClick('dashboard')} className={view === 'dashboard' ? 'active' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M6 20v-4M18 20v-8M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>
                        <span>Dashboard</span>
                    </button>
                    <button onClick={() => handleNavClick('sales')} className={view === 'sales' ? 'active' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                        <span>Sales History</span>
                    </button>
                    <button onClick={() => handleNavClick('settings')} className={view === 'settings' ? 'active' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <span>Settings</span>
                    </button>
                 </nav>
            </aside>
        </>
    );
};

// --- MAIN APP COMPONENT ---

const App = () => {
  type View = 'pos' | 'dashboard' | 'sales' | 'settings';
  const [view, setView] = useState<View>('pos');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [products, setProducts] = useLocalStorage<Product[]>('products', []);
  const [inventory, setInventory] = useLocalStorage<Inventory[]>('inventory', []);
  const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
  const [sales, setSales] = useLocalStorage<Sale[]>('sales', []);
  const [settings, setSettings] = useLocalStorage<Settings>('settings', defaultSettings);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  const [lastOrder, setLastOrder] = useState<Sale | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);

  const TAX_RATE = useMemo(() => settings.taxRate / 100, [settings.taxRate]);
  const formatCurrencyWithSettings = useCallback((amount: number) => {
    return formatCurrency(amount, settings.currencySymbol);
  }, [settings.currencySymbol]);

  // --- Product Filtering State ---
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const productCategories = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });
  }, [products, productSearchTerm, selectedCategory]);


  const updateStock = useCallback((productId: number, quantityChange: number) => {
    setInventory(prevInventory =>
      prevInventory.map(item =>
        item.productId === productId
          ? { ...item, stock: item.stock + quantityChange }
          : item
      )
    );
  }, [setInventory]);

  const handleAddToCart = (product: Product) => {
    const stockItem = inventory.find(i => i.productId === product.id);
    if (!stockItem || stockItem.stock <= 0) {
      alert(`${product.name} is out of stock.`);
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    updateStock(product.id, -1);
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    const cartItem = cart.find(item => item.id === productId);
    if (!cartItem) return;

    const quantityChange = newQuantity - cartItem.quantity;
    
    if (quantityChange > 0) {
        const stockItem = inventory.find(i => i.productId === productId);
        if (!stockItem || stockItem.stock < quantityChange) {
            alert("Not enough stock available.");
            return;
        }
    }

    if (newQuantity <= 0) {
      handleRemoveItem(productId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
      updateStock(productId, -quantityChange);
    }
  };

  const handleRemoveItem = (productId: number) => {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        updateStock(productId, cartItem.quantity);
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    }
  };

  const handleClearCart = () => {
    cart.forEach(item => {
        updateStock(item.id, item.quantity);
    });
    setCart([]);
    setDiscountPercent(0);
  };
  
  const { subtotal, tax, discountAmount, total } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal + tax - discountAmount;
    return { subtotal, tax, discountAmount, total };
  }, [cart, discountPercent, TAX_RATE]);
  
  const handleCheckout = () => {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }
    const newSale: Sale = {
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        items: cart,
        subtotal: subtotal,
        tax: tax,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        total: total,
    };

    setSales(prevSales => [...prevSales, newSale]);
    setLastOrder(newSale);
    setIsReceiptVisible(true);
  };

  const handleStartNewSale = () => {
    setCart([]);
    setDiscountPercent(0);
    setIsReceiptVisible(false);
    setLastOrder(null);
  };
  
  const inventoryMap = useMemo(() => {
    return new Map(inventory.map(item => [item.productId, item]));
  }, [inventory]);

  const renderContent = () => {
    switch (view) {
        case 'pos':
            return (
                <div className="pos-view-grid">
                    <section className="product-display" aria-labelledby="products-heading">
                        <header className="product-filter-header">
                            <div className="search-wrapper">
                                <input
                                    type="search"
                                    placeholder="Search products..."
                                    className="search-input"
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="category-filters">
                                {productCategories.map(category => (
                                    <button
                                        key={category}
                                        className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(category)}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </header>
                        <h2 id="products-heading" className="sr-only">Products</h2>
                        {filteredProducts.length > 0 ? (
                            <div className="grid-container" role="list">
                                {filteredProducts.map(product => {
                                    const inventoryItem = inventoryMap.get(product.id) || { productId: product.id, stock: 0, threshold: 0 };
                                    return (
                                        <ProductItem 
                                            key={product.id} 
                                            product={product} 
                                            inventoryItem={inventoryItem}
                                            onAddToCart={handleAddToCart}
                                            formatCurrency={formatCurrencyWithSettings}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                           <p className="empty-state-message">No products found matching your criteria.</p>
                        )}
                    </section>
                    <aside className="cart-sidebar" aria-labelledby="cart-heading">
                    <h2 id="cart-heading">Your Order</h2>
                    {cart.length === 0 ? (
                        <p className="empty-cart-message">Your cart is empty.</p>
                    ) : (
                        <>
                        <div className="cart-items-list" role="list">
                            {cart.map(item => (
                            <CartItemComponent
                                key={item.id}
                                item={item}
                                onUpdateQuantity={handleUpdateQuantity}
                                onRemoveItem={handleRemoveItem}
                                formatCurrency={formatCurrencyWithSettings}
                            />
                            ))}
                        </div>
                        <div className="cart-summary">
                            <div className="summary-row">
                            <span>Subtotal</span>
                            <span>{formatCurrencyWithSettings(subtotal)}</span>
                            </div>
                            <div className="summary-row">
                            <span>Tax ({ settings.taxRate }%)</span>
                            <span>{formatCurrencyWithSettings(tax)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Discount (%)</span>
                                <input
                                    type="number"
                                    className="discount-input"
                                    value={discountPercent}
                                    onChange={(e) => {
                                        const value = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                        setDiscountPercent(value);
                                    }}
                                    min="0"
                                    max="100"
                                    aria-label="Discount percentage"
                                />
                            </div>
                            {discountAmount > 0 && (
                                <div className="summary-row discount">
                                    <span>Discount</span>
                                    <span>-{formatCurrencyWithSettings(discountAmount)}</span>
                                </div>
                            )}
                            <div className="summary-row total">
                            <span>Total</span>
                            <span>{formatCurrencyWithSettings(total)}</span>
                            </div>
                        </div>
                        <div className="cart-actions">
                            <button className="checkout-btn" onClick={handleCheckout}>Checkout</button>
                            <button className="clear-cart-btn" onClick={handleClearCart}>Clear Cart</button>
                        </div>
                        </>
                    )}
                    </aside>
                </div>
            );
        case 'dashboard':
            return <DashboardView sales={sales} inventory={inventory} products={products} formatCurrency={formatCurrencyWithSettings} />;
        case 'sales':
            return <SalesHistoryView sales={sales} formatCurrency={formatCurrencyWithSettings} />;
        case 'settings':
            return <SettingsPage products={products} setProducts={setProducts} inventory={inventory} setInventory={setInventory} settings={settings} setSettings={setSettings} />;
        default:
            return null;
    }
  }


  return (
    <>
        <div className="app-container">
            <Sidebar 
                view={view} 
                setView={setView} 
                isNavOpen={isNavOpen}
                setIsNavOpen={setIsNavOpen}
                storeName={settings.storeName}
            />
            <div className="main-layout">
                <Header view={view} onToggleNav={() => setIsNavOpen(!isNavOpen)} />
                <main className="content-area">
                    {renderContent()}
                </main>
            </div>
        </div>
        {isReceiptVisible && lastOrder && (
            <ReceiptModal
                order={lastOrder}
                onClose={() => setIsReceiptVisible(false)}
                onNewSale={handleStartNewSale}
                settings={settings}
            />
        )}
        <style>{`
        :root {
            --danger-color: #e53e3e;
            --warning-color: #dd6b20;
            --success-color: #38a169;
            --sidebar-bg: #1a202c;
            --sidebar-text: #e2e8f0;
            --sidebar-active-bg: #2d3748;
        }
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        /* Layout Styles */
        .app-container { display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 240px; background-color: var(--sidebar-bg); color: var(--sidebar-text); display: flex; flex-direction: column; flex-shrink: 0; transition: transform 0.3s ease; }
        .sidebar-header { padding: 1.5rem; border-bottom: 1px solid #2d3748; }
        .sidebar-header h2 { margin: 0; font-size: 1.5rem; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-nav { padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .sidebar-nav button { display: flex; align-items: center; gap: 0.75rem; background: none; border: none; color: var(--sidebar-text); padding: 0.75rem 1rem; text-align: left; font-size: 1rem; border-radius: 6px; cursor: pointer; transition: background-color 0.2s; }
        .sidebar-nav button:hover { background-color: #2d3748; }
        .sidebar-nav button.active { background-color: var(--primary-color); color: white; font-weight: 600; }
        .main-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .header { display: flex; align-items: center; background: var(--card-bg); padding: 0 1.5rem; height: 64px; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
        .header h1 { margin: 0; font-size: 1.5rem; }
        .nav-toggle { display: none; background: none; border: none; cursor: pointer; padding: 0.5rem; margin-right: 1rem; }
        .content-area { flex: 1; overflow-y: auto; background-color: var(--secondary-color); }
        .nav-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; }

        /* Responsive Styles */
        @media (max-width: 1024px) {
            .sidebar { position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-100%); z-index: 1000; }
            .sidebar.open { transform: translateX(0); box-shadow: 0 0 20px rgba(0,0,0,0.2); }
            .nav-toggle { display: block; }
            .nav-overlay { display: block; }
        }
        
        @media (max-width: 768px) {
            .dashboard-container, .sales-history-container, .settings-container { padding: 1rem; }
            .settings-section { padding: 1.5rem 1rem; }
            .modal-content { padding: 1.5rem 1rem; }
        }

        /* POS View Styles */
        .pos-view-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .product-display { padding: 2rem; }
        @media (max-width: 900px) { .pos-view-grid { grid-template-columns: 1fr; } .product-display { padding: 1rem; } }
        
        .product-filter-header { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .search-wrapper { width: 100%; }
        .category-filters { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .category-btn { padding: 0.5rem 1rem; border: 1px solid var(--border-color); background-color: var(--card-bg); color: var(--text-color); border-radius: 20px; cursor: pointer; transition: all 0.2s; }
        .category-btn.active { background-color: var(--primary-color); color: white; border-color: var(--primary-color); }
        
        .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }
        .product-card { background: var(--card-bg); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1); }
        .product-image { width: 100%; height: 150px; object-fit: cover; }
        .product-info { padding: 1rem; flex-grow: 1; }
        .product-name { font-size: 1.1rem; margin: 0 0 0.5rem; }
        .product-price { font-size: 1rem; color: #666; margin: 0 0 0.5rem; }
        .product-stock { font-size: 0.9rem; font-weight: 500; }
        .product-stock.low-stock { color: var(--warning-color); }
        .product-stock.out-of-stock { color: var(--danger-color); font-weight: bold; }
        .add-to-cart-btn { background-color: var(--primary-color); color: white; border: none; padding: 0.75rem; cursor: pointer; font-size: 1rem; width: 100%; transition: background-color 0.2s; }
        .add-to-cart-btn:hover { background-color: #357ABD; }
        .add-to-cart-btn:disabled { background-color: #a0aec0; cursor: not-allowed; }
        .cart-sidebar { background: var(--card-bg); border-radius: 8px; box-shadow: var(--shadow); padding: 1.5rem; display: flex; flex-direction: column; align-self: flex-start; position: sticky; top: 2rem; margin: 2rem; margin-left: 0; }
        .cart-sidebar h2 { margin-top: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem; }
        .empty-cart-message { text-align: center; color: #777; padding: 2rem 0; font-style: italic; }
        .cart-items-list { flex-grow: 1; overflow-y: auto; margin-bottom: 1rem; }
        .cart-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); }
        .cart-item:last-child { border-bottom: none; }
        .cart-item-name { font-weight: 500; margin: 0; }
        .cart-item-price { color: #555; margin: 0; }
        .cart-item-controls { display: flex; align-items: center; gap: 0.5rem; }
        .cart-item-controls button { background: var(--secondary-color); border: 1px solid var(--border-color); border-radius: 4px; width: 28px; height: 28px; font-size: 1.2rem; cursor: pointer; display: flex; justify-content: center; align-items: center; line-height: 1; }
        .cart-item-controls .remove-btn { background: #fbebeb; color: var(--danger-color); border-color: #f5c6cb; }
        .cart-item-controls span { min-width: 20px; text-align: center; }
        .cart-summary { margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 1rem; }
        .summary-row.total { font-weight: bold; font-size: 1.2rem; margin-top: 1rem; }
        .summary-row.discount span:last-child { color: var(--success-color); font-weight: 500; }
        .discount-input { width: 60px; text-align: right; padding: 0.25rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 1rem; }
        .cart-actions { margin-top: 1.5rem; display: grid; gap: 0.75rem; }
        .cart-actions button { width: 100%; padding: 0.75rem; font-size: 1rem; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
        .checkout-btn { background-color: var(--primary-color); color: white; }
        .checkout-btn:hover { background-color: #357ABD; }
        .clear-cart-btn { background: none; color: var(--danger-color); border-color: var(--danger-color); }
        .clear-cart-btn:hover { background: #fbebeb; }
        
        /* Dashboard & Sales History General Styles */
        .dashboard-container, .sales-history-container, .settings-container { padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .kpi-card { background: var(--card-bg); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); }
        .kpi-card h3 { margin: 0 0 1rem; font-size: 1.2rem; color: #333; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; }
        .kpi-metric { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; }
        .kpi-metric span { font-size: 1rem; color: #555; }
        .kpi-metric p { margin: 0; font-size: 1.5rem; font-weight: 600; color: var(--primary-color); }
        .dashboard-section { background: var(--card-bg); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); }
        .dashboard-section h2 { margin-top: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th, td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); }
        th { font-weight: 600; background-color: var(--secondary-color); }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background-color: #f0f4f8; }
        .stock-warning { color: var(--danger-color); font-weight: bold; }
        .empty-state-message { text-align: center; color: #777; padding: 2rem 0; background: var(--card-bg); border-radius: 8px; }
        .search-input { width: 100%; padding: 0.75rem; font-size: 1rem; border: 1px solid var(--border-color); border-radius: 6px; }

        /* Sales History Specific Styles */
        .filter-header { background: var(--card-bg); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); margin-bottom: -1rem; }
        .filter-header h2 { margin: 0 0 1rem; }
        .filters { display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; }
        .date-filters { display: flex; align-items: center; gap: 0.5rem; }
        .date-filters input { padding: 0.65rem; border: 1px solid var(--border-color); border-radius: 6px; }
        @media (max-width: 768px) { .filters { grid-template-columns: 1fr; } .date-filters { justify-content: space-between; } }
        .sales-list { background: var(--card-bg); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); }
        .sale-row { cursor: pointer; transition: background-color 0.2s; }
        .sale-row:hover { background-color: var(--secondary-color); }
        .sale-details-row td { padding: 0; }
        .sale-details-content { background: #fafafa; padding: 1rem 1.5rem; }
        .sale-details-content h4 { margin: 0 0 0.5rem; }
        .sale-details-content ul { list-style: none; margin: 0; padding: 0; }
        .sale-details-content li { display: flex; justify-content: space-between; padding: 0.25rem 0; }
        .expand-btn { background: none; border: 1px solid var(--border-color); padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; }
        
        /* Settings Page Styles */
        .settings-section { background: var(--card-bg); padding: 1.5rem 2rem; border-radius: 8px; box-shadow: var(--shadow); }
        .settings-section h2, .settings-section h3 { margin-top: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .form-grid { 
            display: grid; 
            grid-template-columns: 1fr; /* Mobile-first: default to single column */
            gap: 1.5rem; 
        }
        @media (min-width: 640px) {
            .form-grid {
                /* On larger screens, use auto-fit for multiple columns */
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            }
        }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { margin-bottom: 0.5rem; font-weight: 500; color: #4a5568; }
        .form-group input { padding: 0.75rem; font-size: 1rem; border: 1px solid var(--border-color); border-radius: 6px; width: 100%; }
        .product-management-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
        @media (max-width: 1024px) { .product-management-grid { grid-template-columns: 1fr; } }
        .product-add-form { min-width: 0; } /* Prevents form from overflowing its grid container */
        .product-add-form form { display: flex; flex-direction: column; gap: 1rem; }
        .add-product-btn { background-color: var(--primary-color); color: white; padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; margin-top: 1rem; width: 100%; }
        .product-list-container .search-input { margin-bottom: 1rem; }
        .product-list-table-wrapper { max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; }
        .product-actions { display: flex; gap: 0.5rem; }
        .product-actions button { background-color: var(--secondary-color); border: 1px solid var(--border-color); padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; }
        .product-actions button.delete { color: var(--danger-color); }
        
        /* Edit Product Modal */
        .edit-product-modal { width: 90%; max-width: 600px; }
        .edit-product-modal .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1.5rem; }
        .edit-product-modal .modal-actions button { padding: 0.6rem 1.2rem; border-radius: 6px; font-size: 1rem; cursor: pointer; border: 1px solid var(--border-color); }
        .edit-product-modal .modal-actions .save-btn { background-color: var(--success-color); color: white; border-color: var(--success-color); }


        /* Loading Spinner */
        .loading-container { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; padding: 2rem; gap: 1rem; color: #555; }
        .spinner { width: 48px; height: 48px; border: 5px solid var(--secondary-color); border-bottom-color: var(--primary-color); border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1100; }
        .modal-content { background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 420px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem; }
        .modal-header h2 { margin: 0; }
        .close-modal-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
        .receipt-body { color: #000; }
        .receipt-header-info { text-align: center; margin-bottom: 1.5rem; }
        .receipt-header-info h3 { margin: 0; font-size: 1.2rem; }
        .receipt-header-info p { margin: 0.25rem 0; font-size: 0.9rem; color: #444; }
        .receipt-items-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        .receipt-items-table th, .receipt-items-table td { padding: 0.5rem; border-bottom: 1px dashed #ccc; text-align: left; }
        .receipt-items-table th:nth-child(2), .receipt-items-table td:nth-child(2) { text-align: center; }
        .receipt-items-table th:nth-child(3), .receipt-items-table td:nth-child(3), .receipt-items-table th:nth-child(4), .receipt-items-table td:nth-child(4) { text-align: right; }
        .receipt-summary { margin: 1.5rem 0; padding-top: 1rem; border-top: 2px solid #333; }
        .receipt-summary .summary-row { margin-bottom: 0.75rem; }
        .receipt-summary .summary-row.discount span:last-child { color: var(--success-color); }
        .receipt-footer { text-align: center; margin-top: 1.5rem; font-style: italic; color: #555; }
        .modal-actions { margin-top: 2rem; display: grid; grid-template-columns: auto 1fr 1fr; gap: 1rem; align-items: center; }
        .print-btn, .new-sale-btn { border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500; }
        .print-btn { background-color: var(--primary-color); color: white; }
        .new-sale-btn { background-color: var(--secondary-color); color: var(--text-color); border: 1px solid var(--border-color); }
        .back-btn { background-color: var(--secondary-color); color: var(--text-color); border: 1px solid var(--border-color); padding: 0.65rem; display: flex; justify-content: center; align-items: center; border-radius: 6px; cursor: pointer; transition: background-color 0.2s; }
        .back-btn:hover { background-color: #e2e8f0; }
        .back-btn svg { stroke: var(--text-color); }
        
        @media print {
            body * { visibility: hidden; }
            .modal-overlay { position: static; background: none; }
            #receipt, #receipt * { visibility: visible; }
            #receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border-radius: 0; padding: 0; color: #000; background: #fff; }
            .modal-header h2 { font-size: 1.2rem; }
            .modal-header .close-modal-btn, .modal-actions { display: none; }
        }
      `}</style>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);