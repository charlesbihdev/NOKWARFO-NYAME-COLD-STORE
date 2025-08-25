import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Edit, Trash2, Users, ArrowLeft, Calendar } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import DateRangePicker from '@/components/DateRangePicker';
import SupplierBalanceCard from '@/components/supplier/SupplierBalanceCard';
import { useForm } from '@inertiajs/react';

function SupplierTransactions({ supplier, transactions, start_date = '', end_date = '' }) {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Date range states
    const getCurrentMonthRange = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: startOfMonth.toISOString().slice(0, 10),
            end: endOfMonth.toISOString().slice(0, 10)
        };
    };
    
    const { start: defaultStartDate, end: defaultEndDate } = getCurrentMonthRange();
    const [startDate, setStartDate] = useState(start_date || defaultStartDate);
    const [endDate, setEndDate] = useState(end_date || defaultEndDate);

    const { data, setData, post, put, processing, reset, clearErrors } = useForm({
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: '',
    });

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
                status: statusFilter,
                page: 1, // Reset to first page when changing filters
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Handle status filter changes
    const handleStatusChange = (value) => {
        setStatusFilter(value);
        router.get(
            route('suppliers.transactions', supplier.id),
            {
                start_date: startDate,
                end_date: endDate,
                status: value,
                page: 1, // Reset to first page when changing filters
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Handle pagination
    const handlePageChange = (page) => {
        router.get(
            route('suppliers.transactions', supplier.id),
            {
                start_date: startDate,
                end_date: endDate,
                status: statusFilter,
                page: page,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Helper function to build pagination URLs with filters
    const buildPaginationUrl = (url) => {
        if (!url) return '#';
        
        const urlObj = new URL(url);
        urlObj.searchParams.set('start_date', startDate || '');
        urlObj.searchParams.set('end_date', endDate || '');
        urlObj.searchParams.set('status', statusFilter || '');
        return urlObj.toString();
    };

    function handleMakePayment(transaction) {
        setSelectedTransaction(transaction);
        setIsPaymentModalOpen(true);
        reset();
    }

    function handleEditTransaction(transaction) {
        setSelectedTransaction(transaction);
        setIsEditModalOpen(true);
        setData({
            transaction_date: transaction.transaction_date,
            description: transaction.description,
            amount_owed: transaction.amount_owed,
            notes: transaction.notes || '',
        });
    }

    function handleDeleteTransaction(transactionId) {
        if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
            router.delete(route('suppliers.delete-credit-transaction', transactionId), {
                onSuccess: () => {
                    setSelectedTransaction(null);
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

    function handlePaymentSubmit(e) {
        e.preventDefault();
        
        if (!selectedTransaction) return;

        post(route('suppliers.make-payment', selectedTransaction.id), {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                setSelectedTransaction(null);
                reset();
            },
        });
    }

    function handleEditSubmit(e) {
        e.preventDefault();
        
        if (!selectedTransaction) return;

        put(route('suppliers.update-credit-transaction', selectedTransaction.id), {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedTransaction(null);
                reset();
            },
        });
    }

    function closePaymentModal() {
        setIsPaymentModalOpen(false);
        setSelectedTransaction(null);
        reset();
        clearErrors();
    }

    function closeEditModal() {
        setIsEditModalOpen(false);
        setSelectedTransaction(null);
        reset();
        clearErrors();
    }

    function formatCurrency(amount) {
        const numAmount = parseFloat(amount) || 0;
        return `GHC ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function getStatusBadge(status) {
        const getBadgeStyle = (status) => {
            switch (status) {
                case 'debt':
                    return 'bg-red-600 text-white hover:bg-red-700';
                case 'paid':
                    return 'bg-green-600 text-white hover:bg-green-700';
                default:
                    return 'bg-gray-600 text-white hover:bg-gray-700';
            }
        };
        
        return <Badge className={getBadgeStyle(status)}>{status.toUpperCase()}</Badge>;
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

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Total Transactions</p>
                                    <p className="text-2xl font-bold">{transactions.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Total Owed</p>
                                    <p className="text-2xl font-bold">{formatCurrency(supplier.total_owed)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-5 w-5 text-orange-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Total Paid</p>
                                    <p className="text-2xl font-bold">{formatCurrency(supplier.total_paid)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-5 w-5 text-red-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Total Outstanding</p>
                                    <p className="text-2xl font-bold">{formatCurrency(supplier.total_outstanding)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
                                        setStatusFilter('all');
                                        router.get(
                                            route('suppliers.transactions', supplier.id),
                                            {
                                                start_date: start,
                                                end_date: end,
                                                status: 'all',
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
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Date Range <span className="text-xs text-gray-500">(Default: Current Month)</span>
                                </Label>
                                <DateRangePicker 
                                    startDate={startDate} 
                                    endDate={endDate} 
                                    onChange={handleDateChange} 
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-4">
                                <div>
                                    <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 mb-2 block">Status Filter</Label>
                                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Transactions</SelectItem>
                                            <SelectItem value="debt">Debt (Unpaid/Partial)</SelectItem>
                                            <SelectItem value="paid">Fully Paid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Results Count */}
                                <div className="text-sm text-gray-600">
                                    Showing {transactions.data.length} of {transactions.total} transactions
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                {transactions.data.map((transaction) => (
                    <div key={transaction.id} className="rounded-lg border bg-white p-4 shadow-sm">
                        {/* Transaction Header - More Compact */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-semibold">
                                    {transaction.transaction_date}
                        </h3>
                                {getStatusBadge(transaction.status)}
                            </div>
                            
                            <div className="flex gap-2">
                                {transaction.can_make_payment && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleMakePayment(transaction)}
                                        className="text-green-600"
                                    >
                                        <DollarSign className="mr-2 h-3 w-3" />
                                        Make Payment
                                    </Button>
                                )}
                                
                                {transaction.status === 'debt' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditTransaction(transaction)}
                                    >
                                        <Edit className="mr-2 h-3 w-3" />
                                        Edit
                                    </Button>
                                )}
                                
                                {/* Delete button for all transactions */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Delete
                                </Button>
                            </div>
                        </div>

                        {/* Notes - Only if exists */}
                        {transaction.notes && (
                            <div className="mb-3">
                                <p className="text-sm text-gray-600 italic">"{transaction.notes}"</p>
                            </div>
                        )}

                        {/* Goods Items Table - Compact */}
                        {transaction.items && transaction.items.length > 0 && (
                            <div className="mb-3">
                                <table className="w-full text-xs border rounded">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-1 px-2 text-left border-b text-xs">Product</th>
                                            <th className="py-1 px-2 text-right border-b text-xs">Qty</th>
                                            <th className="py-1 px-2 text-right border-b text-xs">Unit Price</th>
                                            <th className="py-1 px-2 text-right border-b text-xs">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transaction.items.map((item, index) => (
                                    <tr key={index} className="border-b">
                                                <td className="py-1 px-2">{item.product_name}</td>
                                                <td className="py-1 px-2 text-right">{item.quantity}</td>
                                                <td className="py-1 px-2 text-right">{formatCurrency(item.unit_price)}</td>
                                                <td className="py-1 px-2 text-right">{formatCurrency(item.quantity * item.unit_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                            </div>
                        )}

                        {/* Financial Summary - Each item on its own line */}
                        <div className="space-y-1 text-xs mb-3">
                            <div className="flex justify-between">
                                <span className="font-medium">Total Cost:</span>
                                <span>{formatCurrency(transaction.amount_owed)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Payment Made:</span>
                                <span>{formatCurrency(transaction.amount_paid)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Outstanding Balance:</span>
                                <span className="font-semibold text-red-600">
                                    {formatCurrency(transaction.remaining_balance)}
                                </span>
                            </div>
                        </div>

                        {/* Payment History - Compact */}
                        {transaction.payments && transaction.payments.length > 0 && (
                            <div className="rounded bg-gray-50 p-2">
                                <h4 className="mb-1 text-xs font-medium text-gray-700">Payment History:</h4>
                                <div className="space-y-1">
                                    {transaction.payments.map((payment) => (
                                        <div key={payment.id} className="flex justify-between text-xs">
                                            <span>{payment.payment_date}</span>
                                            <span>{formatCurrency(payment.payment_amount)}</span>
                                            {payment.payment_method && (
                                                <span className="text-gray-500">({payment.payment_method})</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                            {transactions.data.length === 0 && (
                                <div className="py-8 text-center text-gray-500">
                                    No credit transactions found for this supplier.
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {transactions.last_page > 1 && (
                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing {transactions.from} to {transactions.to} of {transactions.total} results
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Previous Page */}
                    {transactions.prev_page_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(transactions.current_page - 1)}
                                            disabled={transactions.current_page === 1}
                                        >
                                            Previous
                                        </Button>
                                    )}

                                    {/* Page Numbers */}
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: transactions.last_page }, (_, i) => i + 1)
                                            .filter(page => {
                                                // Show first page, last page, current page, and pages around current
                                                const current = transactions.current_page;
                                                const last = transactions.last_page;
                                                return page === 1 || page === last || 
                                                       (page >= current - 1 && page <= current + 1);
                                            })
                                            .map((page, index, array) => {
                                                // Add ellipsis if there's a gap
                                                const prevPage = array[index - 1];
                                                const showEllipsis = prevPage && page - prevPage > 1;
                                                
                                                return (
                                                    <div key={page} className="flex items-center">
                                                        {showEllipsis && (
                                                            <span className="px-2 text-gray-500">...</span>
                                                        )}
                                                        <Button
                                                            variant={page === transactions.current_page ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => handlePageChange(page)}
                                                            className="w-8 h-8 p-0"
                                                        >
                                                            {page}
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    {/* Next Page */}
                    {transactions.next_page_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(transactions.current_page + 1)}
                                            disabled={transactions.current_page === transactions.last_page}
                                        >
                                            Next
                                        </Button>
                    )}
                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Make Payment Modal */}
                <Dialog open={isPaymentModalOpen} onOpenChange={closePaymentModal}>
                    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Make Payment
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            {selectedTransaction && (
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-sm text-gray-700">
                                        <strong>Transaction:</strong> {selectedTransaction.description}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        <strong>Outstanding Balance:</strong> {formatCurrency(selectedTransaction.remaining_balance)}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_amount">Payment Amount (GHC) *</Label>
                                    <Input
                                        id="payment_amount"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={selectedTransaction?.remaining_balance || 0}
                                        placeholder="0.00"
                                        value={data.payment_amount}
                                        onChange={(e) => setData('payment_amount', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payment_date">Payment Date *</Label>
                                    <Input
                                        id="payment_date"
                                        type="date"
                                        value={data.payment_date}
                                        onChange={(e) => setData('payment_date', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payment_method">Payment Method</Label>
                                    <Input
                                        id="payment_method"
                                        type="text"
                                        placeholder="Cash, Bank Transfer, etc."
                                        value={data.payment_method}
                                        onChange={(e) => setData('payment_method', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Additional payment details"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closePaymentModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Processing...' : 'Record Payment'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Transaction Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit className="h-5 w-5" />
                                Edit Transaction
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_transaction_date">Transaction Date *</Label>
                                <Input
                                    id="edit_transaction_date"
                                    type="date"
                                    value={data.transaction_date}
                                    onChange={(e) => setData('transaction_date', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_description">Description *</Label>
                                <Textarea
                                    id="edit_description"
                                    placeholder="Describe the goods taken on credit"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    required
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_amount_owed">Amount Owed (GHC) *</Label>
                                <Input
                                    id="edit_amount_owed"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    value={data.amount_owed}
                                    onChange={(e) => setData('amount_owed', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_notes">Notes</Label>
                                <Textarea
                                    id="edit_notes"
                                    placeholder="Additional information about this transaction"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeEditModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Updating...' : 'Update Transaction'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

export default SupplierTransactions;
