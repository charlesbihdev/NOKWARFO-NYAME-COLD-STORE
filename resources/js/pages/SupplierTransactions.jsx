import { router } from '@inertiajs/react';
import { useState } from 'react';

import DateRangePicker from '@/components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Edit, Trash2, Users } from 'lucide-react';

import { Link } from '@inertiajs/react';

function SupplierTransactions({ supplier, transactions, payments = [], start_date = '', end_date = '', products = [], errors = {} }) {
    // Date range states
    const getCurrentMonthRange = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: startOfMonth.toISOString().slice(0, 10),
            end: endOfMonth.toISOString().slice(0, 10),
        };
    };
    
    const { start: defaultStartDate, end: defaultEndDate } = getCurrentMonthRange();
    const [startDate, setStartDate] = useState(start_date || defaultStartDate);
    const [endDate, setEndDate] = useState(end_date || defaultEndDate);
    
    // Payment modal states

    const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);

    const goBack = () => router.get(route('suppliers.index'));

    // Handle date range changes
    const handleDateChange = (value, type) => {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;

        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('suppliers.transactions', supplier.id),
            {
                start_date: newStartDate,
                end_date: newEndDate,
                page: 1, // Reset to first page when changing filters
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    function handleDeleteTransaction(transactionId) {
        if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
            router.delete(route('suppliers.delete-credit-transaction', transactionId), {
                onSuccess: () => {
                    // Transaction deleted successfully
                },
                onError: (errors) => {
                    // Show error message to user
                    if (errors.error) {
                        alert('Cannot delete transaction: ' + errors.error);
                    } else {
                        alert('Failed to delete transaction. Please try again.');
                    }
                },
                preserveScroll: true,
                preserveState: true,
                only: ['supplier', 'transactions', 'errors', 'flash'],
            });
        }
    }

    function handleEditPayment(payment) {
        setEditingPayment(payment);
        setShowEditPaymentModal(true);
    }

    function handleDeletePayment(paymentId) {
        if (confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
            router.delete(route('suppliers.delete-payment', paymentId), {
                onSuccess: () => {
                    // Payment deleted successfully
                },
                onError: (errors) => {
                    // Show error message to user
                    if (errors.error) {
                        alert('Cannot delete payment: ' + errors.error);
                    } else {
                        alert('Failed to delete payment. Please try again.');
                    }
                },
                preserveScroll: true,
                preserveState: true,
                only: ['supplier', 'transactions', 'payments', 'errors', 'flash'],
            });
        }
    }

    function formatCurrency(amount) {
        const numAmount = parseFloat(amount) || 0;
        return `GHC ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Safely parse a YYYY-MM-DD string into a local Date (no timezone shift)
    function parseLocalDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;
        }
        const parts = dateString.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            // Fallback if it's not a date-only string
            const fallback = new Date(dateString);
            return isNaN(fallback) ? null : fallback;
        }
        const [year, month, day] = parts;
        return new Date(year, month - 1, day);
    }

    function formatDateDisplay(dateLike) {
        if (!dateLike) {
            return '';
        }
        const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
        if (isNaN(d)) {
            return '';
        }
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Suppliers', href: '/suppliers' }, { title: 'Transactions' }]}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Transactions for {supplier.name}</h1>
                        <p className="text-sm text-gray-500">
                            Contact: {supplier.phone} | Email: {supplier.email}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={goBack}>
                            ← Back to Suppliers
                        </Button>
                    </div>
                </div>

                {/* Financial Summary Cards */}
                <div className="space-y-4">
                                    {/* Filter Status */}
                    {start_date && end_date && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-sm text-blue-700">
                                📅 Showing data for: <span className="font-medium">{formatDateDisplay(parseLocalDate(start_date))}</span> to{' '}
                                <span className="font-medium">{formatDateDisplay(parseLocalDate(end_date))}</span>
                        </p>
                    </div>
                )}
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <div>
                                        <p className="text-sm text-gray-600">
                                            {start_date && end_date ? 'Filtered Transactions' : 'Total Transactions'}
                                        </p>
                                        <p className="text-2xl font-bold">{supplier.transactions_count || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <div className="h-5 w-5 rounded-full bg-red-500"></div>
                                    <div>
                                        <p className="text-sm text-gray-600">{start_date && end_date ? 'Filtered Debt' : 'Total Debt'}</p>
                                        <p className="text-2xl font-bold text-red-600">{formatCurrency(supplier.total_owed || 0)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <div className="h-5 w-5 rounded-full bg-green-500"></div>
                                    <div>
                                        <p className="text-sm text-gray-600">{start_date && end_date ? 'Filtered Payments' : 'Total Payments'}</p>
                                        <p className="text-2xl font-bold text-green-600">{formatCurrency(supplier.total_payments_made || 0)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                        
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <div className="h-5 w-5 rounded-full bg-orange-500"></div>
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            {start_date && end_date ? 'Filtered Outstanding' : 'Outstanding Balance'}
                                        </p>
                                        <p className="text-2xl font-bold text-orange-600">{formatCurrency(supplier.total_outstanding || 0)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Transactions List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Credit Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="mb-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const { start, end } = getCurrentMonthRange();
                                        setStartDate(start);
                                        setEndDate(end);
                                        router.get(
                                            route('suppliers.transactions', supplier.id),
                                            {
                                                start_date: start,
                                                end_date: end,
                                                page: 1,
                                            },
                                            { preserveState: true, preserveScroll: true, replace: true },
                                        );
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>

                            {/* Date Range Filter */}
                            <div>
                                <Label className="mb-2 block text-sm font-medium text-gray-700">
                                    Date Range <span className="text-xs text-gray-500">(Default: Current Month)</span>
                                </Label>
                                <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
                                </div>

                                {/* Results Count */}
                                <div className="text-sm text-gray-600">
                                    Showing {(transactions.data?.length || 0) + (payments?.length || 0)} timeline items (transactions + payments)
                            </div>
                        </div>

                                                {/* Unified Timeline - Transactions and Payments Mixed */}
                        <div className="space-y-4">
                            {/* Timeline Items */}
                            {(() => {
                                // Combine transactions and payments into a unified timeline
                                const timelineItems = [];
                                
                                // Add transactions with type identifier
                                transactions.data.forEach((transaction) => {
                                    timelineItems.push({
                                        ...transaction,
                                        type: 'transaction',
                                        // Prefer the explicit transaction_date selected by the user
                                        sortDate: parseLocalDate(transaction.transaction_date) || new Date(transaction.created_at),
                                        sortCreatedAt: new Date(transaction.created_at),
                                    });
                                });
                                
                                // Add only standalone payments (not linked to transactions)
                                payments.forEach((payment) => {
                                    // Check if this payment is linked to any transaction
                                    const isLinkedToTransaction = transactions.data.some((transaction) => {
                                        // Check if payment amount matches transaction's todays_payments and they're from the same time
                                        const paymentTime = parseLocalDate(payment.payment_date) || new Date(payment.created_at);
                                        const transactionTime = parseLocalDate(transaction.transaction_date) || new Date(transaction.created_at);
                                        const timeDiff = Math.abs(paymentTime - transactionTime);
                                        const isSameTime = timeDiff < 60000; // Within 1 minute
                                        const isSameAmount = parseFloat(payment.payment_amount) === parseFloat(transaction.todays_payments || 0);
                                        
                                        return isSameTime && isSameAmount && transaction.todays_payments > 0;
                                    });
                                    
                                    // Only add standalone payments
                                    if (!isLinkedToTransaction) {
                                        timelineItems.push({
                                            ...payment,
                                            type: 'payment',
                                            // Prefer the explicit payment_date selected by the user
                                            sortDate: parseLocalDate(payment.payment_date) || new Date(payment.created_at),
                                            sortCreatedAt: new Date(payment.created_at),
                                        });
                                    }
                                });
                                
                                // Sort by date DESC first, then by created_at DESC as tie-breaker (newest first)
                                // Backend already sends data in DESC order, but we need to sort combined timeline
                                timelineItems.sort((a, b) => {
                                    const dateDiff = b.sortDate - a.sortDate; // DESC: newest first
                                    if (dateDiff !== 0) {
                                        return dateDiff;
                                    }
                                    // If dates are equal, use created_at DESC as tie-breaker
                                    return b.sortCreatedAt - a.sortCreatedAt;
                                });
                                
                                return timelineItems.map((item, index) => {
                                    if (item.type === 'transaction') {
                                        return (
                                            <div key={`transaction-${item.id}`} className="rounded-lg border bg-white p-4 shadow-sm">
                                                {/* Transaction Header */}
                                                <div className="mb-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                                            <h3 className="text-base font-semibold">
                                                                {formatDateDisplay(
                                                                    parseLocalDate(item.transaction_date) || new Date(item.created_at),
                                                                )}
                                                            </h3>
                                                        </div>
                                                        
                                                        {item.outstanding_balance > 0 && (
                                                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                                                                Outstanding: {formatCurrency(item.outstanding_balance)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDeleteTransaction(item.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-3 w-3" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Description and Notes */}
                                                <div className="mb-3">
                                                    <p className="font-medium text-gray-900">{item.description}</p>
                                                    {item.notes && <p className="mt-1 text-sm text-gray-600">{item.notes}</p>}
                                                </div>

                                                {/* Items Purchased Table */}
                                                <div className="mb-4">
                                                    <h4 className="mb-2 text-sm font-medium text-gray-700">Items Purchased:</h4>
                                                    {item.items && item.items.length > 0 ? (
                                                        <div className="overflow-hidden rounded-md border border-gray-200">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                                                                        <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                                                                        <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Price</th>
                                                                        <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                                    {item.items.map((itemDetail, index) => (
                                                                        <tr key={itemDetail.id || index} className="hover:bg-gray-50">
                                                                            <td className="px-3 py-2 text-gray-900">{itemDetail.product_name}</td>
                                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                                {itemDetail.quantity}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                                {formatCurrency(itemDetail.unit_price)}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                                                                                {formatCurrency(
                                                                                    itemDetail.total_amount ||
                                                                                        itemDetail.quantity * itemDetail.unit_price,
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                                            <p className="text-sm text-gray-600 italic">
                                                                No detailed items recorded for this transaction
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Financial Summary Card */}
                                                <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                                                    <h4 className="text-sm font-semibold text-gray-700">Financial Summary</h4>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Previous Debt:</span>
                                                                <span className="font-medium">{formatCurrency(item.previous_debt || 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Current Transaction:</span>
                                                                <span className="font-medium text-blue-600">
                                                                    {formatCurrency(item.current_debt || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Total Debt:</span>
                                                                <span className="font-semibold text-red-600">
                                                                    {formatCurrency(item.total_debt || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Current Payment:</span>
                                                                <span className="font-medium text-green-600">
                                                                    {formatCurrency(item.todays_payments || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Outstanding Balance:</span>
                                                                <span className="font-bold text-red-700">
                                                                    {formatCurrency(item.outstanding_balance || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="border-t pt-2 text-xs text-gray-500 italic">
                                                        <span className="font-medium">Flow:</span> Previous debt (
                                                        {formatCurrency(item.previous_debt || 0)}) + New transaction (
                                                        {formatCurrency(item.current_debt || 0)}) = Total debt ({formatCurrency(item.total_debt || 0)}
                                                        ). After current payment: {formatCurrency(item.outstanding_balance || 0)} outstanding.
                                                    </div>
                                                </div>

                                                {/* Show linked payment details if this transaction has a payment */}
                                                {item.todays_payments > 0 && (
                                                    <div className="mt-3 space-y-3 rounded-lg bg-green-50 p-4">
                                                        <h4 className="text-sm font-semibold text-green-700">Payment Made</h4>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-semibold text-green-600">
                                                                {formatCurrency(item.todays_payments)}
                                                            </span>
                                                            {item.payment_method && (
                                                                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                                                    {item.payment_method}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.payment_notes && <p className="text-xs text-gray-600">{item.payment_notes}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        // This is a standalone payment (already filtered to exclude linked ones)
                                        return (
                                            <div key={`payment-${item.id}`} className="rounded-lg border bg-white p-4 shadow-sm">
                                                {/* Payment Header */}
                                                <div className="mb-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                                            <h3 className="text-base font-semibold">
                                                                {formatDateDisplay(parseLocalDate(item.payment_date) || new Date(item.created_at))}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEditPayment(item)}
                                                            className="text-blue-600"
                                                        >
                                                            <Edit className="mr-2 h-3 w-3" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDeletePayment(item.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-3 w-3" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Payment Details */}
                                                <div className="mb-3">
                                                    <div className="mb-2 flex items-center gap-3">
                                                        <h3 className="text-lg font-semibold text-green-600">
                                                            {formatCurrency(item.payment_amount)}
                                                        </h3>
                                                        {item.payment_method && (
                                                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                                                {item.payment_method}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.notes && <p className="text-sm text-gray-600">{item.notes}</p>}
                                                </div>

                                                {/* Payment Financial Summary */}
                                                <div className="space-y-3 rounded-lg bg-green-50 p-4">
                                                    <h4 className="text-sm font-semibold text-green-700">Payment Summary</h4>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Previous Debt:</span>
                                                                <span className="font-semibold text-red-600">
                                                                    {formatCurrency(item.previous_debt || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Payment Amount:</span>
                                                                <span className="font-semibold text-green-600">
                                                                    {formatCurrency(item.payment_amount)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Outstanding Balance:</span>
                                                                <span className="font-bold text-orange-600">
                                                                    {formatCurrency(item.outstanding_balance || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Payment Method:</span>
                                                                <span className="font-medium">{item.payment_method || 'Not specified'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="border-t pt-2 text-xs text-gray-500 italic">
                                                        <span className="font-medium">Flow:</span> Previous debt (
                                                        {formatCurrency(item.previous_debt || 0)}) - Payment ({formatCurrency(item.payment_amount)}) =
                                                        Outstanding ({formatCurrency(item.outstanding_balance || 0)})
                                                    </div>
                                                    
                                                    {item.notes && (
                                                        <div className="border-t pt-2 text-xs text-gray-600">
                                                            <span className="font-medium">Notes:</span> {item.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                });
                            })()}

                            {(() => {
                                const totalItems = (transactions.data?.length || 0) + (payments?.length || 0);
                                if (totalItems === 0) {
                                    return <div className="py-8 text-center text-gray-500">No transactions or payments found for this supplier.</div>;
                                }
                                return null;
                            })()}
                        </div>

                        {/* Simple Pagination */}
                        {(transactions.prev_page_url || transactions.next_page_url) && (
                            <div className="mt-6 flex items-center justify-center gap-4">
                                    {/* Previous Page */}
                                {transactions.prev_page_url ? (
                                    <Link
                                        href={transactions.prev_page_url}
                                        preserveState
                                        preserveScroll
                                        className="rounded border bg-white px-3 py-1 hover:bg-gray-100"
                                        >
                                            Previous
                                    </Link>
                                ) : (
                                    <span className="cursor-not-allowed rounded border bg-gray-200 px-3 py-1">Previous</span>
                                )}
                                
                                {/* Page Info */}
                                <span className="rounded border px-3 py-1">{transactions.current_page}</span>

                                    {/* Next Page */}
                                {transactions.next_page_url ? (
                                    <Link
                                        href={transactions.next_page_url}
                                        preserveState
                                        preserveScroll
                                        className="rounded border bg-white px-3 py-1 hover:bg-gray-100"
                                        >
                                            Next
                                    </Link>
                                ) : (
                                    <span className="cursor-not-allowed rounded border bg-gray-200 px-3 py-1">Next</span>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Payment Modal */}
            {showEditPaymentModal && editingPayment && (
                <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="w-full max-w-md rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Edit Payment</h3>
                        <form
                            onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                                router.put(
                                    route('suppliers.update-payment', editingPayment.id),
                                    {
                                payment_date: formData.get('payment_date'),
                                payment_amount: formData.get('payment_amount'),
                                payment_method: formData.get('payment_method'),
                                notes: formData.get('notes'),
                                    },
                                    {
                                onSuccess: () => {
                                    setShowEditPaymentModal(false);
                                    setEditingPayment(null);
                                },
                                preserveScroll: true,
                                preserveState: true,
                                only: ['supplier', 'transactions', 'payments', 'flash'],
                                    },
                                );
                            }}
                        >
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="edit_payment_date">Payment Date</Label>
                                    <input
                                        type="date"
                                        id="edit_payment_date"
                                        name="payment_date"
                                        defaultValue={editingPayment.payment_date}
                                        className="w-full rounded-md border px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit_payment_amount">Amount</Label>
                                    <input
                                        type="number"
                                        id="edit_payment_amount"
                                        name="payment_amount"
                                        step="0.01"
                                        min="0.01"
                                        defaultValue={editingPayment.payment_amount}
                                        className="w-full rounded-md border px-3 py-2"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit_payment_method">Payment Method</Label>
                                    <select
                                        id="edit_payment_method"
                                        name="payment_method"
                                        defaultValue={editingPayment.payment_method || ''}
                                        className="w-full rounded-md border px-3 py-2"
                                    >
                                        <option value="">Select method</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="mobile_money">Mobile Money</option>
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="edit_notes">Notes</Label>
                                    <textarea
                                        id="edit_notes"
                                        name="notes"
                                        rows="3"
                                        defaultValue={editingPayment.notes || ''}
                                        className="w-full rounded-md border px-3 py-2"
                                        placeholder="Optional notes about this payment"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowEditPaymentModal(false);
                                            setEditingPayment(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">Update Payment</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

export default SupplierTransactions;
