import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Banknote, BarChart3, CreditCard, Home, Menu, Package, ShoppingCart, TrendingUp, Truck, Users, MapPin } from 'lucide-react';

const menuItems = [
    { id: 'dashboard.index', label: 'Dashboard', icon: Home, section: 'main' },
    { id: 'products.index', label: 'Products', icon: Package, section: 'setup' },
    { id: 'suppliers.index', label: 'Suppliers', icon: Users, section: 'setup' },
    { id: 'customers.index', label: 'Customers', icon: Users, section: 'setup' },
    // { id: "inventory-management.index", label: "Inventory Management", icon: Archive, section: "inventory" },
    { id: 'stock-control.index', label: 'Stock Control', icon: Truck, section: 'inventory' },
    { id: 'trip-estimations.index', label: 'Trip Profit Estimator', icon: MapPin, section: 'inventory' },
    // { id: "sales.index", label: "Sales & Transactions", icon: ShoppingCart, section: "sales" },
    { id: 'sales-transactions.index', label: 'Sales Transactions', icon: ShoppingCart, section: 'sales' },
    { id: 'daily-sales-report.index', label: 'Daily Sales Report', icon: BarChart3, section: 'sales' },
    { id: 'credit-collection.index', label: 'Credit Collection', icon: CreditCard, section: 'financial' },
    { id: 'profit-analysis.index', label: 'Profit Analysis', icon: TrendingUp, section: 'financial' },
    { id: 'bank-transfers.index', label: 'Bank Transfers', icon: Banknote, section: 'financial' },
];

const sections = [
    { id: 'main', label: 'Main' },
    { id: 'setup', label: 'Setup & Configuration' },
    { id: 'inventory', label: 'Inventory Management' },
    { id: 'sales', label: 'Sales & Transactions' },
    { id: 'financial', label: 'Financial Management' },
];

function AppSidebar({ isCollapsed, setIsCollapsed }) {
    return (
        <div className={cn('flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out', isCollapsed ? 'w-16' : 'w-64')}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
                    <Package className="h-6 w-6 flex-shrink-0 text-blue-600" />
                    {!isCollapsed && <span className="text-lg font-bold">Cold Store POS</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="hidden h-8 w-8 p-0 lg:block">
                    <Menu className="h-4 w-4" />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6">
                    {sections.map((section) => {
                        const sectionItems = menuItems.filter((item) => item.section === section.id);
                        return (
                            <div key={section.id}>
                                {!isCollapsed && (
                                    <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">{section.label}</h3>
                                )}
                                <div className="space-y-1">
                                    {sectionItems.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={route(item.id)}
                                            className={cn(
                                                'flex h-10 w-full items-center gap-2 rounded-md px-2 transition-colors',
                                                isCollapsed ? 'justify-center' : 'justify-start',
                                                route().current(item.id) || 
                                                (item.id === 'customers.index' && route().current('customers.*')) ||
                                                (item.id === 'suppliers.index' && route().current('suppliers.*'))
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'text-gray-700 hover:bg-gray-100',
                                            )}
                                            title={isCollapsed ? item.label : undefined}
                                            prefetch
                                        >
                                            <item.icon className="h-4 w-4 flex-shrink-0" />
                                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

export default AppSidebar;
