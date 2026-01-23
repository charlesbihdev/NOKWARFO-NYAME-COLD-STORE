import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import DebtModal from '@/components/customers/DebtModal';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

import { ArrowLeft, Calendar, DollarSign, Edit, FileText, Mail, MapPin, Phone, Plus, ShoppingCart, Trash2 } from 'lucide-react';

export default function CustomerTransactions({ customer, transactions }) {
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showDebtDialog, setShowDebtDialog] = useState(false);
    const [editingDebt, setEditingDebt] = useState(null);
    const [showEditDebtDialog, setShowEditDebtDialog] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        amount_collected: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const { data: editDebtData, setData: setEditDebtData, put: putDebt, processing: processingDebt, errors: errorsDebt, reset: resetDebt } = useForm({
        amount: '',
        debt_date: '',
        description: '',
        notes: '',
    });

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        post(route('customers.payments.store', customer.id), {
            onSuccess: () => {
                setShowPaymentDialog(false);
                reset();
            },
        });
    };

    const handleEditDebt = (transaction) => {
        setEditingDebt(transaction);
        setEditDebtData({
            amount: transaction.debt_amount,
            debt_date: transaction.date,
            description: transaction.description,
            notes: transaction.notes || '',
        });
        setShowEditDebtDialog(true);
    };

    const handleEditDebtSubmit = (e) => {
        e.preventDefault();
        putDebt(route('customers.debts.update', [customer.id, editingDebt.debt_record_id]), {
            onSuccess: () => {
                setShowEditDebtDialog(false);
                resetDebt();
                setEditingDebt(null);
            },
        });
    };

    const handleDeleteDebt = (transaction) => {
        if (confirm('Are you sure you want to delete this debt record? This will affect all subsequent balance calculations.')) {
            router.delete(route('customers.debts.destroy', [customer.id, transaction.debt_record_id]), {
                preserveScroll: true,
            });
        }
    };

    const getDebtStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'current':
                return 'bg-blue-100 text-blue-800';
            case 'overdue_30':
                return 'bg-yellow-100 text-yellow-800';
            case 'overdue_60':
                return 'bg-orange-100 text-orange-800';
            case 'overdue_90':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getDebtStatusText = (status) => {
        switch (status) {
            case 'paid':
                return 'Paid';
            case 'current':
                return 'Current';
            case 'overdue_30':
                return '30+ Days Overdue';
            case 'overdue_60':
                return '60+ Days Overdue';
            case 'overdue_90':
                return '90+ Days Overdue';
            default:
                return 'Unknown';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS',
        }).format(amount);
    };

    return (
        <AppLayout>
            <Head title={`${customer.name} - Transaction History`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <Link href={route('customers.index')} className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Customers
                        </Link>

                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                                <p className="mt-1 text-gray-600">Transaction History & Debt Management</p>
                            </div>

                            <div className="flex gap-3">
                                <DebtModal customer={customer} open={showDebtDialog} onOpenChange={setShowDebtDialog} />

                                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-green-600 hover:bg-green-700">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Record Payment
                                        </Button>
                                    </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Record Payment</DialogTitle>
                                        <DialogDescription>Record a payment from {customer.name} against their outstanding debt.</DialogDescription>
                                    </DialogHeader>

                                    {/* Outstanding Debt Display */}
                                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">Outstanding Debt:</span>
                                                <span className="text-xl font-bold text-orange-600">{formatCurrency(customer.outstanding_balance)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Total Debt:</span>
                                                <span className="font-medium text-gray-900">{formatCurrency(customer.total_debt)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Paid So Far:</span>
                                                <span className="font-medium text-green-600">{formatCurrency(customer.total_payments)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handlePaymentSubmit}>
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="amount_collected">Amount Collected</Label>
                                                <Input
                                                    id="amount_collected"
                                                    type="number"
                                                    step="0.01"
                                                    value={data.amount_collected}
                                                    onChange={(e) => setData('amount_collected', e.target.value)}
                                                    placeholder="0.00"
                                                    required
                                                />
                                                {errors.amount_collected && <p className="mt-1 text-sm text-red-500">{errors.amount_collected}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="payment_date">Payment Date</Label>
                                                <Input
                                                    id="payment_date"
                                                    type="date"
                                                    value={data.payment_date}
                                                    onChange={(e) => setData('payment_date', e.target.value)}
                                                    required
                                                />
                                                {errors.payment_date && <p className="mt-1 text-sm text-red-500">{errors.payment_date}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="notes">Notes (Optional)</Label>
                                                <Textarea
                                                    id="notes"
                                                    value={data.notes}
                                                    onChange={(e) => setData('notes', e.target.value)}
                                                    placeholder="Payment notes..."
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter className="mt-6">
                                            <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={processing}>
                                                {processing ? 'Recording...' : 'Record Payment'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info Cards */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Debt</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(customer.total_debt)}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Outstanding Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">{formatCurrency(customer.outstanding_balance)}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(customer.total_payments)}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Badge className={getDebtStatusColor(customer.outstanding_balance > 0 ? 'overdue_30' : 'paid')}>
                                    {customer.outstanding_balance > 0 ? 'Has Outstanding Debt' : 'Paid Up'}
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Customer Details */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">{customer.phone || 'No phone number'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">{customer.email || 'No email address'}</span>
                                </div>
                                {customer.address && (
                                    <div className="flex items-start space-x-2 md:col-span-2">
                                        <MapPin className="mt-0.5 h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-600">{customer.address}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transactions Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>Complete history of debt transactions and payments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Debt Amount</TableHead>
                                            <TableHead className="text-right">Payment Amount</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.data.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="h-4 w-4 text-gray-500" />
                                                        <span>{transaction.date}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={`capitalize ${
                                                            transaction.type === 'debt' || transaction.type === 'historical_debt'
                                                                ? 'bg-red-600 text-white hover:bg-red-700'
                                                                : 'bg-green-600 text-white hover:bg-green-700'
                                                        }`}
                                                    >
                                                        {transaction.type === 'debt' ? (
                                                            <>
                                                                <ShoppingCart className="mr-1 h-3 w-3" />
                                                                Debt
                                                            </>
                                                        ) : transaction.type === 'historical_debt' ? (
                                                            <>
                                                                <FileText className="mr-1 h-3 w-3" />
                                                                Historical Debt
                                                            </>
                                                        ) : (
                                                            <>
                                                                <DollarSign className="mr-1 h-3 w-3" />
                                                                Payment
                                                            </>
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{transaction.description}</div>
                                                        {transaction.notes && <div className="mt-1 text-sm text-gray-500">{transaction.notes}</div>}
                                                        {transaction.sale_items && transaction.sale_items.length > 0 && (
                                                            <div className="mt-1 text-sm text-gray-600">
                                                                {transaction.sale_items.map((item, index) => (
                                                                    <div key={index}>
                                                                        {item.product} - {item.quantity} @ {formatCurrency(item.unit_price)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {transaction.debt_amount > 0 ? (
                                                        <span className="font-medium text-red-600">+{formatCurrency(transaction.debt_amount)}</span>
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {transaction.payment_amount > 0 ? (
                                                        <span className="font-medium text-green-600">
                                                            -{formatCurrency(transaction.payment_amount)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`font-bold ${transaction.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}
                                                    >
                                                        {formatCurrency(transaction.current_balance)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {transaction.type === 'historical_debt' && (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEditDebt(transaction)}
                                                                className="text-blue-600 hover:text-blue-700"
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteDebt(transaction)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
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

                    {/* Edit Debt Dialog */}
                    <Dialog open={showEditDebtDialog} onOpenChange={setShowEditDebtDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Debt Record</DialogTitle>
                                <DialogDescription>Update the debt record details.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditDebtSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="edit_amount">
                                            Amount <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="edit_amount"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={editDebtData.amount}
                                            onChange={(e) => setEditDebtData('amount', e.target.value)}
                                            required
                                        />
                                        {errorsDebt.amount && <p className="mt-1 text-sm text-red-500">{errorsDebt.amount}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="edit_debt_date">
                                            Debt Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="edit_debt_date"
                                            type="date"
                                            value={editDebtData.debt_date}
                                            onChange={(e) => setEditDebtData('debt_date', e.target.value)}
                                            required
                                        />
                                        {errorsDebt.debt_date && <p className="mt-1 text-sm text-red-500">{errorsDebt.debt_date}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="edit_description">Description</Label>
                                        <Input
                                            id="edit_description"
                                            type="text"
                                            value={editDebtData.description}
                                            onChange={(e) => setEditDebtData('description', e.target.value)}
                                            maxLength={500}
                                        />
                                        {errorsDebt.description && <p className="mt-1 text-sm text-red-500">{errorsDebt.description}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="edit_notes">Additional Notes</Label>
                                        <Textarea
                                            id="edit_notes"
                                            value={editDebtData.notes}
                                            onChange={(e) => setEditDebtData('notes', e.target.value)}
                                            rows={3}
                                            maxLength={1000}
                                        />
                                        {errorsDebt.notes && <p className="mt-1 text-sm text-red-500">{errorsDebt.notes}</p>}
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button type="button" variant="outline" onClick={() => setShowEditDebtDialog(false)} disabled={processingDebt}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processingDebt} className="bg-blue-600 hover:bg-blue-700">
                                        {processingDebt ? 'Updating...' : 'Update Debt'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}
