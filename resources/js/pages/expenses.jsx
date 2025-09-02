import AppLayout from '@/layouts/app-layout';
import { Plus, Receipt, TrendingDown, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import DateRangePicker from '../components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/InputError';

export default function Expenses({
    expenses = [],
    start_date = '',
    end_date = '',
    type_filter = '',
    total_amount = 0,
}) {
    // Use dates from props or default to current month
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
    const [typeFilter, setTypeFilter] = useState(type_filter || 'all');
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        description: '',
        amount: '',
        type: 'others',
        notes: '',
        date: new Date().toISOString().split('T')[0],
    });

    const { data: editData, setData: setEditData, put, processing: editProcessing, errors: editErrors, reset: resetEdit } = useForm({
        description: '',
        amount: '',
        type: 'others',
        notes: '',
        date: new Date().toISOString().split('T')[0],
    });

    const breadcrumbs = [{ title: 'Expenses', href: '/expenses' }];

    const expenseTypes = [
        { value: 'fixed', label: 'Fixed' },
        { value: 'additional', label: 'Additional' },
        { value: 'car_saving', label: 'Car Saving' },
        { value: 'trip_saving', label: 'Trip Saving' },
        { value: 'loan_saving', label: 'Loan Saving' },
        { value: 'others', label: 'Others' },
    ];

    // Handle date changes
    const handleDateChange = (value, type) => {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;

        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('expenses.index'),
            {
                start_date: newStartDate,
                end_date: newEndDate,
                type_filter: typeFilter,
                page: 1,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Handle type filter changes
    const handleTypeFilterChange = (value) => {
        setTypeFilter(value);
        router.get(
            route('expenses.index'),
            {
                start_date: startDate,
                end_date: endDate,
                type_filter: value,
                page: 1,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Handle pagination
    const handlePageChange = (page) => {
        router.get(
            route('expenses.index'),
            {
                start_date: startDate,
                end_date: endDate,
                type_filter: typeFilter,
                page: page,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    function handleSubmit(e) {
        e.preventDefault();
        post(route('expenses.store'), {
            onSuccess: () => {
                reset();
                setOpen(false);
            },
            preserveScroll: true,
        });
    }

    function handleEditSubmit(e) {
        e.preventDefault();
        put(route('expenses.update', editingExpense.id), {
            onSuccess: () => {
                resetEdit();
                setEditOpen(false);
                setEditingExpense(null);
            },
            preserveScroll: true,
        });
    }

    function handleEdit(expense) {
        setEditingExpense(expense);
        setEditData({
            description: expense.description,
            amount: expense.amount,
            type: expense.type,
            notes: expense.notes || '',
            date: new Date(expense.date).toISOString().split('T')[0],
        });
        setEditOpen(true);
    }

    function handleDelete(expense) {
        if (confirm(`Are you sure you want to delete the expense "${expense.description}"?`)) {
            router.delete(route('expenses.destroy', expense.id), {
                preserveScroll: true,
            });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Expenses Management</h1>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Expense
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Expense</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">
                                        Description
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="description"
                                            placeholder="Expense description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            required
                                        />
                                        {errors.description && <InputError message={errors.description} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">
                                        Amount (GH₵)
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={data.amount}
                                            onChange={(e) => setData('amount', e.target.value)}
                                            required
                                        />
                                        {errors.amount && <InputError message={errors.amount} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type" className="text-right">
                                        Type
                                    </Label>
                                    <div className="col-span-3">
                                        <Select value={data.type} onValueChange={(value) => setData('type', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select expense type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {expenseTypes.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.type && <InputError message={errors.type} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">
                                        Date
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="date"
                                            type="date"
                                            value={data.date}
                                            onChange={(e) => setData('date', e.target.value)}
                                            required
                                        />
                                        {errors.date && <InputError message={errors.date} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="notes" className="text-right">
                                        Notes
                                    </Label>
                                    <div className="col-span-3">
                                        <Textarea
                                            id="notes"
                                            placeholder="Optional notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            rows={3}
                                        />
                                        {errors.notes && <InputError message={errors.notes} className="mt-2" />}
                                    </div>
                                </div>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Adding...' : 'Add Expense'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Expense Modal */}
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Edit Expense</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-description" className="text-right">
                                        Description
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="edit-description"
                                            placeholder="Expense description"
                                            value={editData.description}
                                            onChange={(e) => setEditData('description', e.target.value)}
                                            required
                                        />
                                        {editErrors.description && <InputError message={editErrors.description} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-amount" className="text-right">
                                        Amount (GH₵)
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="edit-amount"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={editData.amount}
                                            onChange={(e) => setEditData('amount', e.target.value)}
                                            required
                                        />
                                        {editErrors.amount && <InputError message={editErrors.amount} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-type" className="text-right">
                                        Type
                                    </Label>
                                    <div className="col-span-3">
                                        <Select value={editData.type} onValueChange={(value) => setEditData('type', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select expense type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {expenseTypes.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {editErrors.type && <InputError message={editErrors.type} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-date" className="text-right">
                                        Date
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="edit-date"
                                            type="date"
                                            value={editData.date}
                                            onChange={(e) => setEditData('date', e.target.value)}
                                            required
                                        />
                                        {editErrors.date && <InputError message={editErrors.date} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-notes" className="text-right">
                                        Notes
                                    </Label>
                                    <div className="col-span-3">
                                        <Textarea
                                            id="edit-notes"
                                            placeholder="Optional notes"
                                            value={editData.notes}
                                            onChange={(e) => setEditData('notes', e.target.value)}
                                            rows={3}
                                        />
                                        {editErrors.notes && <InputError message={editErrors.notes} className="mt-2" />}
                                    </div>
                                </div>
                                <Button type="submit" disabled={editProcessing}>
                                    {editProcessing ? 'Updating...' : 'Update Expense'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
                    
                    <div className="flex items-center gap-4">
                        <Label htmlFor="type-filter">Filter by Type:</Label>
                        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {expenseTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Summary Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">GH₵{Number(total_amount || 0).toFixed(2)}</div>
                        <p className="text-muted-foreground text-xs">
                            {expenses.data?.length || 0} expense{(expenses.data?.length || 0) !== 1 ? 's' : ''} in selected period
                        </p>
                    </CardContent>
                </Card>

                {/* Expenses Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expenses List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.data && expenses.data.length > 0 ? (
                                    expenses.data.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium">
                                                {new Date(expense.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{expense.description}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                    {expenseTypes.find(t => t.value === expense.type)?.label || expense.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium text-red-600">
                                                GH₵{Number(expense.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-gray-500">
                                                {expense.notes || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(expense)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(expense)}
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            No expenses found for the selected period and filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {expenses.data && expenses.data.length > 0 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    Showing {expenses.data.length} expense{expenses.data.length !== 1 ? 's' : ''}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(expenses.current_page - 1)}
                                        disabled={!expenses.prev_page_url}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-gray-500">
                                        Page {expenses.current_page} of {expenses.last_page}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(expenses.current_page + 1)}
                                        disabled={!expenses.next_page_url}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

