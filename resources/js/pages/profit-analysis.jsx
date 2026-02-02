import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import DateRangePicker from '../components/DateRangePicker';

function ProfitAnalysis() {
    const {
        total_product_sales = [],
        paid_product_sales = [],
        excluded_count = 0,
        recalculatable_count = 0,
    } = usePage().props;

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isRecalculating, setIsRecalculating] = useState(false);

    const handleDateChange = (value, type) => {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;

        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('profit-analysis.index'),
            {
                start_date: newStartDate,
                end_date: newEndDate,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleRecalculate = () => {
        setIsRecalculating(true);
        router.post(route('profit-analysis.recalculate'), {}, {
            onFinish: () => setIsRecalculating(false),
        });
    };

    const breadcrumbs = [{ title: 'Profit Analysis', href: '/profit-analysis' }];

    // Calculate totals for summary cards
    const totalSalesProfit = total_product_sales.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0);
    const paidSalesProfit = paid_product_sales.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0);
    const totalRevenue = total_product_sales.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
    const totalCost = total_product_sales.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);

    // Calculate totals for each table
    const totalProductSalesTotals = {
        totalCost: total_product_sales.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0),
        totalAmount: total_product_sales.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0),
        profit: total_product_sales.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0),
    };

    const paidProductSalesTotals = {
        totalCost: paid_product_sales.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0),
        totalAmount: paid_product_sales.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0),
        profit: paid_product_sales.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0),
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Profit Analysis</h1>
                    {recalculatable_count > 0 && (
                        <Button
                            onClick={handleRecalculate}
                            disabled={isRecalculating}
                            variant="outline"
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                            {isRecalculating ? 'Recalculating...' : `Recalculate Historical Profits (${recalculatable_count})`}
                        </Button>
                    )}
                </div>

                {/* Excluded Sales Notice */}
                {excluded_count > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div>
                            <p className="font-medium text-orange-800">
                                {excluded_count} sale item{excluded_count > 1 ? 's' : ''} excluded from profit calculations
                            </p>
                            <p className="text-sm text-orange-700">
                                These items have no cost data. Enter cost prices on products and click "Recalculate Historical Profits" to include them.
                            </p>
                        </div>
                    </div>
                )}

                {/* Date range picker */}
                <div className="mb-6 flex items-center space-x-4">
                    <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sales Profit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">GH₵{totalSalesProfit.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">Cash + Credit</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cash Sales Profit</CardTitle>
                            <DollarSign className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">GH₵{paidSalesProfit.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">Cash only</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">GH₵{totalRevenue.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">All sales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                            <DollarSign className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">GH₵{totalCost.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">Product costs</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Sales Tables */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Total Product Sales (Cash + Credit) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-green-700">Total Product Sales (Cash + Credit)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Units Sold</TableHead>
                                        <TableHead>Cost Price</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                        <TableHead>Selling Price</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {total_product_sales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                                No sales data with cost information available
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {total_product_sales.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.product}</TableCell>
                                                    <TableCell>{item.units_sold}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.cost_price).toFixed(2)}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.total_cost).toFixed(2)}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.selling_price).toFixed(2)}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.total_amount).toFixed(2)}</TableCell>
                                                    <TableCell className={`font-medium ${parseFloat(item.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        GH₵{parseFloat(item.profit).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-green-50 font-bold">
                                                <TableCell>TOTALS</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>GH₵{totalProductSalesTotals.totalCost.toFixed(2)}</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>GH₵{totalProductSalesTotals.totalAmount.toFixed(2)}</TableCell>
                                                <TableCell className="text-green-600">GH₵{totalProductSalesTotals.profit.toFixed(2)}</TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Paid Product Sales (Cash Only) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-blue-700">Paid Product Sales (Cash Only)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Units Sold</TableHead>
                                        <TableHead>Cost Price</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                        <TableHead>Selling Price</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paid_product_sales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                                No cash sales data with cost information available
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {paid_product_sales.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.product}</TableCell>
                                                    <TableCell>{item.units_sold}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.cost_price).toFixed(2)}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.total_cost).toFixed(2)}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.selling_price).toFixed(2)}</TableCell>
                                                    <TableCell>GH₵{parseFloat(item.total_amount).toFixed(2)}</TableCell>
                                                    <TableCell className={`font-medium ${parseFloat(item.profit) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                        GH₵{parseFloat(item.profit).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-blue-50 font-bold">
                                                <TableCell>TOTALS</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>GH₵{paidProductSalesTotals.totalCost.toFixed(2)}</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>GH₵{paidProductSalesTotals.totalAmount.toFixed(2)}</TableCell>
                                                <TableCell className="text-blue-600">GH₵{paidProductSalesTotals.profit.toFixed(2)}</TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

export default ProfitAnalysis;
