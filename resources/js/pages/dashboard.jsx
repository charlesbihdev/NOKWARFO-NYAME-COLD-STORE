import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import AppLayout from '@/layouts/app-layout';
import { Link, router } from '@inertiajs/react';
import { CreditCard, DollarSign, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs = [{ title: 'Dashboard', href: '/dashboard' }];

function Dashboard({
    todaySales = 0,
    salesChange = 0,
    productsSoldToday = 0,
    productsChange = 0,
    lowStockItems = 0,
    creditSalesToday = 0,
    creditChange = 0,
    monthlyProfit = 0,
    profitChange = 0,
    activeCustomers = 0,
    customersChange = 0,
    recentSales = [],
}) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);

        // Send to controller with Inertia
        router.get(
            route('dashboard.index'),
            { date: newDate },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const stats = [
        {
            title: "Today's Sales",
            value: 'GH₵' + Number(todaySales || 0).toFixed(2),
            change: (Number(salesChange) >= 0 ? '+' : '') + Number(salesChange || 0).toFixed(1) + '%',
            icon: DollarSign,
            color: 'text-green-600',
        },
        {
            title: 'Low Stock Items',
            value: Number(lowStockItems || 0).toString(),
            change: '',
            icon: Package,
            color: 'text-orange-600',
        },
        {
            title: 'Credit Sales',
            value: 'GH₵' + Number(creditSalesToday || 0).toFixed(2),
            change: (Number(creditChange) >= 0 ? '+' : '') + Number(creditChange || 0).toFixed(1) + '%',
            icon: CreditCard,
            color: 'text-purple-600',
        },
        {
            title: 'Monthly Profit',
            value: 'GH₵' + Number(monthlyProfit || 0).toFixed(2),
            change: (Number(profitChange) >= 0 ? '+' : '') + Number(profitChange || 0).toFixed(1) + '%',
            icon: TrendingUp,
            color: 'text-green-600',
        },
        {
            title: 'Active Customers',
            value: Number(activeCustomers || 0).toString(),
            change: (Number(customersChange) >= 0 ? '+' : '') + Number(customersChange || 0).toFixed(1) + '%',
            icon: Users,
            color: 'text-indigo-600',
        },
    ];

    

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <div className="flex w-full items-center justify-between">
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <div className="flex items-center gap-2">
                            <input type="date" value={selectedDate} onChange={handleDateChange} className="rounded border px-2 py-1 text-sm" />
                            <Badge variant="outline" className="text-sm">
                                {new Date(selectedDate).toLocaleDateString()}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat, index) => (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                {stat.change && (
                                    <p className="text-muted-foreground text-xs">
                                        <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>{stat.change}</span> from
                                        last month
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Recent Sales */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Sales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentSales.map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{sale.customer}</p>
                                            <p className="text-muted-foreground text-sm">
                                                #{sale.id} • {sale.time}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">GH₵{parseFloat(sale.amount).toFixed(2)}</p>
                                            <Badge variant={sale.type === 'Cash' ? 'default' : 'secondary'}>{sale.type}</Badge>
                                        </div>
                                    </div>
                                ))}
                                {recentSales.length === 0 && <p className="text-muted-foreground py-4 text-center">No recent sales</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="cursor-pointer p-4 hover:bg-gray-50">
                                    <Link href={route('sales-transactions.index')} className="flex items-center gap-2">
                                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                                        <span className="font-medium">New Sale</span>
                                    </Link>
                                </Card>
                                <Card className="cursor-pointer p-4 hover:bg-gray-50">
                                    <Link href={route('stock-control.index')} className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-green-600" />
                                        <span className="font-medium">Add Stock</span>
                                    </Link>
                                </Card>
                                <Card className="cursor-pointer p-4 hover:bg-gray-50">
                                    <Link href={route('credit-collection.index')} className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-purple-600" />
                                        <span className="font-medium">Collect Credit</span>
                                    </Link>
                                </Card>
                                <Card className="cursor-pointer p-4 hover:bg-gray-50">
                                    <Link href={route('profit-analysis.index')} className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-orange-600" />
                                        <span className="font-medium">View Profits</span>
                                    </Link>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

export default Dashboard;
