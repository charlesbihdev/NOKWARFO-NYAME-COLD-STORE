import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import DateRangePicker from '@/components/DateRangePicker';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowDownCircle, ArrowLeft, ArrowUpCircle, Calendar, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function SavingsDetail() {
    const { saving, transactions, summary, filters } = usePage().props;
    const [showCreditDialog, setShowCreditDialog] = useState(false);
    const [showDebitDialog, setShowDebitDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showEditSavingsDialog, setShowEditSavingsDialog] = useState(false);
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const { data: creditData, setData: setCreditData, post: postCredit, processing: processingCredit, errors: errorsCredit, reset: resetCredit } = useForm({
        type: 'credit',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const { data: debitData, setData: setDebitData, post: postDebit, processing: processingDebit, errors: errorsDebit, reset: resetDebit } = useForm({
        type: 'debit',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        reason: '',
        notes: '',
    });

    const { data: editData, setData: setEditData, put: putEdit, processing: processingEdit, errors: errorsEdit, reset: resetEdit } = useForm({
        type: '',
        amount: '',
        transaction_date: '',
        reason: '',
        notes: '',
    });

    const { data: savingsData, setData: setSavingsData, put: putSavings, processing: processingSavings, errors: errorsSavings, reset: resetSavings } = useForm({
        name: saving.name,
        description: saving.description || '',
    });

    const breadcrumbs = [
        { title: 'Savings', href: '/savings' },
        { title: saving.name, href: `/savings/${saving.id}` },
    ];

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS',
        }).format(amount);
    };

    const getBalanceStatusBadge = (status) => {
        switch (status) {
            case 'positive':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Positive</Badge>;
            case 'negative':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Zero</Badge>;
        }
    };

    const handleDateChange = (value, type) => {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;

        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('savings.show', saving.id),
            {
                start_date: newStartDate || undefined,
                end_date: newEndDate || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleCreditSubmit = (e) => {
        e.preventDefault();
        postCredit(route('savings.transactions.store', saving.id), {
            onSuccess: () => {
                setShowCreditDialog(false);
                resetCredit();
            },
        });
    };

    const handleDebitSubmit = (e) => {
        e.preventDefault();
        postDebit(route('savings.transactions.store', saving.id), {
            onSuccess: () => {
                setShowDebitDialog(false);
                resetDebit();
            },
        });
    };

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setEditData({
            type: transaction.type,
            amount: transaction.amount,
            transaction_date: transaction.transaction_date,
            reason: transaction.reason || '',
            notes: transaction.notes || '',
        });
        setShowEditDialog(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        putEdit(route('savings.transactions.update', editingTransaction.id), {
            onSuccess: () => {
                setShowEditDialog(false);
                resetEdit();
                setEditingTransaction(null);
            },
        });
    };

    const handleDeleteTransaction = (transaction) => {
        if (confirm('Are you sure you want to delete this transaction? This will affect all subsequent balance calculations.')) {
            router.delete(route('savings.transactions.destroy', transaction.id), {
                preserveScroll: true,
            });
        }
    };

    const handleEditSavingsSubmit = (e) => {
        e.preventDefault();
        putSavings(route('savings.update', saving.id), {
            onSuccess: () => {
                setShowEditSavingsDialog(false);
            },
        });
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        router.get(route('savings.show', saving.id), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${saving.name} - Savings`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <Link href={route('savings.index')} className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Savings
                        </Link>

                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{saving.name}</h1>
                                {saving.description && <p className="mt-1 text-gray-600">{saving.description}</p>}
                            </div>

                            <div className="flex gap-3">
                                <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-green-600 hover:bg-green-700">
                                            <ArrowDownCircle className="mr-2 h-4 w-4" />
                                            Credit
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="space-y-6">
                                        <DialogHeader>
                                            <DialogTitle>Add Credit</DialogTitle>
                                            <DialogDescription>Add funds to this savings account.</DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleCreditSubmit}>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="credit-amount">
                                                        Amount <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="credit-amount"
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={creditData.amount}
                                                        onChange={(e) => setCreditData('amount', e.target.value)}
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                    {errorsCredit.amount && <p className="text-sm text-red-500">{errorsCredit.amount}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="credit-date">
                                                        Date <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="credit-date"
                                                        type="date"
                                                        value={creditData.transaction_date}
                                                        onChange={(e) => setCreditData('transaction_date', e.target.value)}
                                                        required
                                                    />
                                                    {errorsCredit.transaction_date && <p className="text-sm text-red-500">{errorsCredit.transaction_date}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="credit-notes">Notes</Label>
                                                    <Textarea
                                                        id="credit-notes"
                                                        value={creditData.notes}
                                                        onChange={(e) => setCreditData('notes', e.target.value)}
                                                        placeholder="Optional notes..."
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter className="mt-6">
                                                <Button type="button" variant="outline" onClick={() => setShowCreditDialog(false)}>
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={processingCredit} className="bg-green-600 hover:bg-green-700">
                                                    {processingCredit ? 'Adding...' : 'Add Credit'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={showDebitDialog} onOpenChange={setShowDebitDialog}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-red-600 hover:bg-red-700 text-white">
                                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                                            Debit
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="space-y-6">
                                        <DialogHeader>
                                            <DialogTitle>Add Debit</DialogTitle>
                                            <DialogDescription>Withdraw funds from this savings account.</DialogDescription>
                                        </DialogHeader>

                                        {/* Balance Warning */}
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">Current Balance:</span>
                                                <span className={`text-lg font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(summary.balance)}
                                                </span>
                                            </div>
                                        </div>

                                        <form onSubmit={handleDebitSubmit}>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="debit-amount">
                                                        Amount <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="debit-amount"
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={debitData.amount}
                                                        onChange={(e) => setDebitData('amount', e.target.value)}
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                    {errorsDebit.amount && <p className="text-sm text-red-500">{errorsDebit.amount}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="debit-date">
                                                        Date <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="debit-date"
                                                        type="date"
                                                        value={debitData.transaction_date}
                                                        onChange={(e) => setDebitData('transaction_date', e.target.value)}
                                                        required
                                                    />
                                                    {errorsDebit.transaction_date && <p className="text-sm text-red-500">{errorsDebit.transaction_date}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="debit-reason">
                                                        Reason <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Textarea
                                                        id="debit-reason"
                                                        value={debitData.reason}
                                                        onChange={(e) => setDebitData('reason', e.target.value)}
                                                        placeholder="Reason for withdrawal..."
                                                        rows={2}
                                                        required
                                                    />
                                                    {errorsDebit.reason && <p className="text-sm text-red-500">{errorsDebit.reason}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="debit-notes">Notes</Label>
                                                    <Textarea
                                                        id="debit-notes"
                                                        value={debitData.notes}
                                                        onChange={(e) => setDebitData('notes', e.target.value)}
                                                        placeholder="Optional notes..."
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter className="mt-6">
                                                <Button type="button" variant="outline" onClick={() => setShowDebitDialog(false)}>
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={processingDebit} className="bg-red-600 hover:bg-red-700 text-white">
                                                    {processingDebit ? 'Adding...' : 'Add Debit'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>

                                <Button variant="outline" onClick={() => setShowEditSavingsDialog(true)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Credits</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold text-green-600">{formatCurrency(summary.total_credits)}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Debits</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold text-red-600">{formatCurrency(summary.total_debits)}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-lg font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(summary.balance)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
                            </CardHeader>
                            <CardContent>{getBalanceStatusBadge(summary.balance_status)}</CardContent>
                        </Card>
                    </div>

                    {/* Date Range Filter */}
                    <Card className="mb-6">
                        <CardContent className="pt-6">
                            <div className="flex items-end gap-4">
                                <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
                                {(startDate || endDate) && (
                                    <Button variant="outline" size="sm" onClick={clearFilters} className="mb-6">
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transactions Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>All credits and debits for this savings account</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Reason/Notes</TableHead>
                                            <TableHead className="text-right">Running Balance</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.data.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="h-4 w-4 text-gray-500" />
                                                        <span>{transaction.transaction_date}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            transaction.type === 'credit'
                                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                                : 'bg-red-600 text-white hover:bg-red-700'
                                                        }
                                                    >
                                                        {transaction.type === 'credit' ? (
                                                            <>
                                                                <ArrowDownCircle className="mr-1 h-3 w-3" />
                                                                Credit
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ArrowUpCircle className="mr-1 h-3 w-3" />
                                                                Debit
                                                            </>
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'credit' ? '+' : '-'}
                                                        {formatCurrency(transaction.amount)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        {transaction.reason && <div className="font-medium">{transaction.reason}</div>}
                                                        {transaction.notes && <div className="text-sm text-gray-500">{transaction.notes}</div>}
                                                        {!transaction.reason && !transaction.notes && <span className="text-gray-400">-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-bold ${transaction.running_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(transaction.running_balance)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditTransaction(transaction)}
                                                            className="text-blue-600 hover:text-blue-700"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteTransaction(transaction)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {transactions.data.length === 0 && (
                                <div className="text-muted-foreground py-8 text-center">No transactions found. Add a credit or debit to get started.</div>
                            )}

                            {/* Pagination */}
                            {(transactions.prev_page_url || transactions.next_page_url) && (
                                <div className="mt-6 flex items-center justify-center gap-4">
                                    {transactions.prev_page_url ? (
                                        <Link href={transactions.prev_page_url} preserveState preserveScroll className="rounded border bg-white px-3 py-1 hover:bg-gray-100">
                                            Previous
                                        </Link>
                                    ) : (
                                        <span className="cursor-not-allowed rounded border bg-gray-200 px-3 py-1">Previous</span>
                                    )}
                                    <span className="rounded border px-3 py-1">{transactions.current_page}</span>
                                    {transactions.next_page_url ? (
                                        <Link href={transactions.next_page_url} preserveState preserveScroll className="rounded border bg-white px-3 py-1 hover:bg-gray-100">
                                            Next
                                        </Link>
                                    ) : (
                                        <span className="cursor-not-allowed rounded border bg-gray-200 px-3 py-1">Next</span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Edit Transaction Dialog */}
                    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                        <DialogContent className="space-y-6">
                            <DialogHeader>
                                <DialogTitle>Edit Transaction</DialogTitle>
                                <DialogDescription>Update the transaction details.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditSubmit}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-type">Type</Label>
                                        <select
                                            id="edit-type"
                                            value={editData.type}
                                            onChange={(e) => setEditData('type', e.target.value)}
                                            className="w-full rounded border px-3 py-2"
                                        >
                                            <option value="credit">Credit</option>
                                            <option value="debit">Debit</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-amount">
                                            Amount <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="edit-amount"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={editData.amount}
                                            onChange={(e) => setEditData('amount', e.target.value)}
                                            required
                                        />
                                        {errorsEdit.amount && <p className="text-sm text-red-500">{errorsEdit.amount}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-date">
                                            Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="edit-date"
                                            type="date"
                                            value={editData.transaction_date}
                                            onChange={(e) => setEditData('transaction_date', e.target.value)}
                                            required
                                        />
                                        {errorsEdit.transaction_date && <p className="text-sm text-red-500">{errorsEdit.transaction_date}</p>}
                                    </div>
                                    {editData.type === 'debit' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-reason">
                                                Reason <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                id="edit-reason"
                                                value={editData.reason}
                                                onChange={(e) => setEditData('reason', e.target.value)}
                                                rows={2}
                                            />
                                            {errorsEdit.reason && <p className="text-sm text-red-500">{errorsEdit.reason}</p>}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-notes">Notes</Label>
                                        <Textarea
                                            id="edit-notes"
                                            value={editData.notes}
                                            onChange={(e) => setEditData('notes', e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processingEdit} className="bg-blue-600 hover:bg-blue-700">
                                        {processingEdit ? 'Updating...' : 'Update Transaction'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Savings Dialog */}
                    <Dialog open={showEditSavingsDialog} onOpenChange={setShowEditSavingsDialog}>
                        <DialogContent className="space-y-6">
                            <DialogHeader>
                                <DialogTitle>Edit Savings</DialogTitle>
                                <DialogDescription>Update the savings account details.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditSavingsSubmit}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="savings-name">
                                            Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="savings-name"
                                            value={savingsData.name}
                                            onChange={(e) => setSavingsData('name', e.target.value)}
                                            required
                                        />
                                        {errorsSavings.name && <p className="text-sm text-red-500">{errorsSavings.name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="savings-description">Description</Label>
                                        <Textarea
                                            id="savings-description"
                                            value={savingsData.description}
                                            onChange={(e) => setSavingsData('description', e.target.value)}
                                            rows={3}
                                        />
                                        {errorsSavings.description && <p className="text-sm text-red-500">{errorsSavings.description}</p>}
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button type="button" variant="outline" onClick={() => setShowEditSavingsDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processingSavings}>
                                        {processingSavings ? 'Updating...' : 'Update Savings'}
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
