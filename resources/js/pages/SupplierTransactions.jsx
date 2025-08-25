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
import { DollarSign, Edit, Trash2, Users, ArrowLeft, Calendar, Plus } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import DateRangePicker from '@/components/DateRangePicker';
import SupplierBalanceCard from '@/components/supplier/SupplierBalanceCard';
import { useForm } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import InputError from '@/components/InputError';


function SupplierTransactions({ supplier, transactions, start_date = '', end_date = '' }) {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [editItems, setEditItems] = useState([{ product_name: '', quantity: 1, unit_price: 0 }]);

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

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: '',
        transaction_date: '',
        items: [],
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

    function handleMakePayment(transaction) {
        setSelectedTransaction(transaction);
        setIsPaymentModalOpen(true);
        reset();
    }

    function handleEditTransaction(transaction) {
        setSelectedTransaction(transaction);
        setIsEditModalOpen(true);
        
        // Format date for HTML date input (YYYY-MM-DD)
        let formattedDate = '';
        if (transaction.transaction_date) {
            const date = new Date(transaction.transaction_date);
            formattedDate = date.toISOString().split('T')[0];
        }
        
        // Set up items for editing - use existing items or create default
        const editItems = transaction.items && transaction.items.length > 0 
            ? transaction.items.map(item => ({
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price
            }))
            : [{ product_name: '', quantity: 1, unit_price: 0 }];
        
        setEditItems(editItems);
        setData({
            transaction_date: formattedDate,
            notes: transaction.notes || '',
            items: editItems,
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
                clearErrors();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['supplier', 'transactions', 'errors', 'flash'],
        });
    }

    function handleEditSubmit(e) {
        e.preventDefault();
        
        if (!selectedTransaction) return;

        // Update form data first, then submit
        setData({
            ...data,
            items: editItems
        });

        // Send the edit data using form data automatically
        put(route('suppliers.update-credit-transaction', selectedTransaction.id), {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedTransaction(null);
                setEditItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
                reset();
                clearErrors();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['supplier', 'transactions', 'errors', 'flash'],
        });
    }

    // Item management functions for edit modal
    function addEditItem() {
        const newItems = [...editItems, { product_name: '', quantity: 1, unit_price: 0 }];
        setEditItems(newItems);
        setData('items', newItems);
    }

    function removeEditItem(index) {
        if (editItems.length > 1) {
            const newItems = editItems.filter((_, i) => i !== index);
            setEditItems(newItems);
            setData('items', newItems);
        }
    }

    function updateEditItem(index, field, value) {
        const newItems = [...editItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditItems(newItems);
        setData('items', newItems);
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
        setEditItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
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

                {/* Summary Card - Simplified */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <div>
                                <p className="text-sm text-gray-600">Showing Transactions</p>
                                <p className="text-2xl font-bold">{transactions.data.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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
                                    Showing {transactions.data.length} transactions
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
                                
                                {/* Edit button for all transactions */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditTransaction(transaction)}
                                        >
                                            <Edit className="mr-2 h-3 w-3" />
                                            Edit
                                        </Button>
                                
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

                        {/* Items Purchased Table */}
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Items Purchased:</h4>
                            {transaction.items && transaction.items.length > 0 ? (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                                <th className="py-2 px-3 text-left font-medium text-gray-700">Product</th>
                                                <th className="py-2 px-3 text-right font-medium text-gray-700">Qty</th>
                                                <th className="py-2 px-3 text-right font-medium text-gray-700">Unit Price</th>
                                                <th className="py-2 px-3 text-right font-medium text-gray-700">Total</th>
                                </tr>
                            </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                {transaction.items.map((item, index) => (
                                                <tr key={item.id || index} className="hover:bg-gray-50">
                                                    <td className="py-2 px-3 text-gray-900">{item.product_name}</td>
                                                    <td className="py-2 px-3 text-right text-gray-700">{item.quantity}</td>
                                                    <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                                                    <td className="py-2 px-3 text-right font-medium text-gray-900">{formatCurrency(item.total_amount || (item.quantity * item.unit_price))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                            </div>
                            ) : (
                                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                    <p className="text-sm text-gray-600 italic">No detailed items recorded for this transaction</p>
                            </div>
                        )}
                        </div>

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

                        {/* Simple Pagination */}
                        {(transactions.prev_page_url || transactions.next_page_url) && (
                            <div className="mt-6 flex items-center justify-center gap-4">
                                    {/* Previous Page */}
                                {transactions.prev_page_url ? (
                                    <Link
                                        href={transactions.prev_page_url}
                                        preserveState
                                        preserveScroll
                                        className="rounded border px-3 py-1 bg-white hover:bg-gray-100"
                                        >
                                            Previous
                                    </Link>
                                ) : (
                                    <span className="rounded border px-3 py-1 cursor-not-allowed bg-gray-200">
                                        Previous
                                    </span>
                                )}
                                
                                {/* Page Info */}
                                <span className="rounded border px-3 py-1">
                                    {transactions.current_page}
                                </span>

                                    {/* Next Page */}
                                {transactions.next_page_url ? (
                                    <Link
                                        href={transactions.next_page_url}
                                        preserveState
                                        preserveScroll
                                        className="rounded border px-3 py-1 bg-white hover:bg-gray-100"
                                        >
                                            Next
                                    </Link>
                                ) : (
                                    <span className="rounded border px-3 py-1 cursor-not-allowed bg-gray-200">
                                        Next
                                    </span>
                                )}
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
                <Dialog open={isEditModalOpen} onOpenChange={() => setIsEditModalOpen(false)}>
                    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit className="h-5 w-5" />
                                Edit Transaction
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-4">

                            {/* Transaction Info */}
                            {selectedTransaction && (
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-sm font-medium text-gray-700">
                                        Editing transaction for: {supplier.name}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Current Status: {selectedTransaction.status.toUpperCase()}
                                    </p>
                                </div>
                            )}

                            {/* Transaction Date */}
                            <div className="space-y-2">
                                <Label htmlFor="edit_transaction_date">Transaction Date *</Label>
                                <Input
                                    id="edit_transaction_date"
                                    type="date"
                                    value={data.transaction_date}
                                    onChange={(e) => setData('transaction_date', e.target.value)}
                                    required
                                />
                                <InputError message={errors.transaction_date} />
                            </div>

                            {/* Items Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Goods Items *</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addEditItem}
                                        className="h-8"
                                    >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Item
                                    </Button>
                                </div>

                                {/* Column Labels */}
                                <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-gray-600">
                                    <div className="col-span-5">Product Name</div>
                                    <div className="col-span-3 text-center">Quantity</div>
                                    <div className="col-span-3 text-center">Unit Price (GHC)</div>
                                    <div className="col-span-1"></div>
                                </div>

                                {editItems.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 rounded-lg border p-3">
                                        <div className="col-span-5">
                                            <Input
                                                placeholder="Product name (e.g., Fish, Meat)"
                                                value={item.product_name}
                                                onChange={(e) => updateEditItem(index, 'product_name', e.target.value)}
                                                required
                                            />
                                            <InputError message={errors[`items.${index}.product_name`]} className="mt-1" />
                                        </div>
                                        <div className="col-span-3">
                                            <Input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => updateEditItem(index, 'quantity', e.target.value)}
                                                min="1"
                                    required
                                />
                                            <InputError message={errors[`items.${index}.quantity`]} className="mt-1" />
                            </div>
                                        <div className="col-span-3">
                                <Input
                                    type="number"
                                    step="0.01"
                                                placeholder="Unit Price"
                                                value={item.unit_price}
                                                onChange={(e) => updateEditItem(index, 'unit_price', e.target.value)}
                                    min="0.01"
                                    required
                                />
                                            <InputError message={errors[`items.${index}.unit_price`]} className="mt-1" />
                                        </div>
                                        <div className="col-span-1">
                                            {editItems.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeEditItem(index)}
                                                    className="h-8 w-8 p-0 text-red-600"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total Amount Display */}
                            <div className="rounded-lg bg-blue-50 p-3">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Total Amount:</span>
                                    <span className="text-blue-600">
                                        GHC {editItems.reduce((sum, item) => {
                                            return sum + parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
                                        }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="edit_notes">Notes</Label>
                                <Textarea
                                    id="edit_notes"
                                    placeholder="Additional information about this transaction"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={3}
                                />
                                <InputError message={errors.notes} />
                            </div>

                            {/* Payment Restriction Warning */}
                            {selectedTransaction && selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                                <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                                    <div className="text-sm text-amber-800">
                                        <strong>Note:</strong> This transaction has payments totaling {formatCurrency(selectedTransaction.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0))}. 
                                        You can edit items but the new total amount must be at least the amount already paid.
                                    </div>
                                </div>
                            )}

                            {/* Error Display */}
                            {Object.keys(errors).length > 0 && (
                                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">
                                                There were errors with your submission
                                            </h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {Object.entries(errors).map(([key, message]) => (
                                                        <li key={key}>{message}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

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
