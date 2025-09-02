import AppLayout from '@/layouts/app-layout';
import { Calendar, DollarSign, Package } from 'lucide-react';
import { useState } from 'react';

import { router } from '@inertiajs/react';
import ProductsTable from '../components/daily-sales-report/ProductsTable';
import SalesTable from '../components/daily-sales-report/SalesTable';
import SummaryCard from '../components/daily-sales-report/SummaryCard';
import DateRangePicker from '../components/DateRangePicker';

export default function DailySalesReport({
    cash_sales,
    credit_sales,
    products_bought,
    credited_products,
    partial_products,
    summary,
    start_date,
    end_date,
}) {
    // Use dates from props or default to today
    const today = new Date().toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(start_date || today);
    const [endDate, setEndDate] = useState(end_date || today);

    // Handle date changes - reset page params to 1 on new date filter
    const handleDateChange = (value, type) => {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;

        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('daily-sales-report.index'),
            {
                start_date: newStartDate,
                end_date: newEndDate,
                cash_page: 1,
                credit_page: 1,
                bought_page: 1,
                credited_page: 1,
                partial_page: 1,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Pagination change handler per table
    const handlePageChange = (pageParam, page) => {
        router.get(
            route('daily-sales-report.index'),
            {
                start_date: startDate,
                end_date: endDate,
                [pageParam]: page,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Daily Sales Report', href: '/daily-sales-report' }]}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Daily Sales Report</h1>
                </div>

                <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <SummaryCard
                        title="Cash Sales"
                        icon={DollarSign}
                        amount={`GH₵${Number(summary.cashTotal || 0).toFixed(2)}`}
                        subtitle={`${Number(cash_sales?.data?.length || 0)} transactions`}
                        color="text-green-600"
                    />

                    <SummaryCard
                        title="Credit Sales"
                        icon={Package}
                        amount={`GH₵${Number(summary.creditTotal || 0).toFixed(2)}`}
                        subtitle={`${Number(credit_sales?.data?.length || 0)} transactions`}
                        color="text-orange-600"
                    />

                    <SummaryCard
                        title="Grand Total"
                        icon={Calendar}
                        amount={`GH₵${Number(summary.grandTotal || 0).toFixed(2)}`}
                        subtitle="Cash + Credit"
                        color="text-blue-600"
                    />

                    <SummaryCard
                        title="Products Sold"
                        icon={Package}
                        amount={summary.totalProductsSold || '0'}
                        subtitle="Total units"
                        color="text-purple-600"
                    />
                </div>

                {/* Sales Tables */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SalesTable
                        title="Cash Sales"
                        sales={cash_sales}
                        amountTotal={summary.cashTotal}
                        amountColor="text-green-600"
                        onPageChange={(page) => handlePageChange('cash_page', page)}
                    />
                    <SalesTable
                        title="Credit Sales"
                        sales={credit_sales}
                        amountTotal={summary.creditTotal}
                        amountColor="text-orange-600"
                        onPageChange={(page) => handlePageChange('credit_page', page)}
                    />
                </div>

                {/* Products Tables */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <ProductsTable
                        title="Products Bought (Cash Sales by Product)"
                        products={products_bought}
                        totalQty={summary.totalProductsBought}
                        totalAmount={summary.totalProductsBoughtAmount}
                        totalAmountColor="text-green-600"
                        onPageChange={(page) => handlePageChange('bought_page', page)}
                    />
                    <ProductsTable
                        title="Credited Products (Credit Sales by Product)"
                        products={credited_products}
                        totalQty={summary.totalCreditedProducts}
                        totalAmount={summary.totalCreditedProductsAmount}
                        totalAmountColor="text-orange-600"
                        onPageChange={(page) => handlePageChange('credited_page', page)}
                    />
                    <ProductsTable
                        title="Partial Products (Partial product Sales)"
                        products={partial_products}
                        totalQty={summary.totalPartialProducts}
                        totalAmount={summary.totalPartialProductsAmount}
                        totalAmountColor="text-yellow-600"
                        showAmountPaid={true}
                        totalAmountPaid={summary.totalPartialProductsAmountPaid}
                        onPageChange={(page) => handlePageChange('partial_page', page)}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
