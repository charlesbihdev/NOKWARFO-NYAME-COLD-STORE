import InputError from '@/components/InputError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, Plus, TrendingDown, Wallet } from 'lucide-react';
import { useState } from 'react';

function CreditCollection({ credit_collections = [], outstanding_debts = [], expenses = [], customers = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expenseOpen, setExpenseOpen] = useState(false);

    const filteredDebts = outstanding_debts.filter((debt) => debt.customer.toLowerCase().includes(searchQuery.toLowerCase()));

    const {
        data: expenseFormData,
        setData: setExpenseFormData,
        post: expensePost,
        processing: expenseProcessing,
        errors: expenseErrors,
        reset: resetExpense,
    } = useForm({
        description: '',
        amount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
    });

    const breadcrumbs = [{ title: 'Credit Collection', href: '/credit-collection' }];

    function handleExpenseSubmit(e) {
        e.preventDefault();
        expensePost(route('expenses.store'), {
            onSuccess: () => {
                resetExpense();
                setExpenseOpen(false);
            },
            onError: (errors) => {
                // The errors will be automatically handled by the form
                console.error('Failed to submit expense:', errors);
            },
            preserveScroll: true,
        });
    }

    const totalCollected = credit_collections.reduce((sum, col) => sum + parseFloat(col.amount_collected), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const netAmount = totalCollected - totalExpenses;
    const totalOutstandingDebt = outstanding_debts.reduce((sum, debt) => sum + parseFloat(debt.balance), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Credit Collection & Debt Management</h1>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Collections Today</CardTitle>
                            <Wallet className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">GH₵{totalCollected.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">From {credit_collections.length} customers</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Expenses Today</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">GH₵{totalExpenses.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">{expenses.length} expense items</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
                            <Wallet className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                GH₵{netAmount.toFixed(2)}
                            </div>
                            <p className="text-muted-foreground text-xs">Collections - Expenses</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">GH₵{totalOutstandingDebt.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">{outstanding_debts.length} customers</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Credit Collections */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Amount Collected from Creditors Today</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer Name</TableHead>
                                        <TableHead>Amount Collected</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {credit_collections.map((collection, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{collection.customer}</TableCell>
                                            <TableCell className="font-medium text-green-600">
                                                GH₵{parseFloat(collection.amount_collected).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-green-50">
                                        <TableCell className="font-bold">Total Collected</TableCell>
                                        <TableCell className="font-bold text-green-600">GH₵{totalCollected.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Daily Expenses */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Daily Expenses</CardTitle>
                            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
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
                                    <form onSubmit={handleExpenseSubmit} className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="description" className="text-right">
                                                Description
                                            </Label>
                                            <div className="col-span-3">
                                                <Input
                                                    id="description"
                                                    placeholder="Expense description"
                                                    value={expenseFormData.description}
                                                    onChange={(e) => setExpenseFormData('description', e.target.value)}
                                                    required
                                                />
                                                {expenseErrors.description && <InputError message={expenseErrors.description} className="mt-2" />}
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
                                                    placeholder="0.00"
                                                    value={expenseFormData.amount}
                                                    onChange={(e) => setExpenseFormData('amount', e.target.value)}
                                                    required
                                                />
                                                {expenseErrors.amount && <InputError message={expenseErrors.amount} className="mt-2" />}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="notes" className="text-right">
                                                Notes
                                            </Label>
                                            <div className="col-span-3">
                                                <Input
                                                    id="notes"
                                                    placeholder="Optional notes"
                                                    value={expenseFormData.notes}
                                                    onChange={(e) => setExpenseFormData('notes', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" disabled={expenseProcessing}>
                                            {expenseProcessing ? 'Adding...' : 'Add Expense'}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map((expense, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{expense.description}</TableCell>
                                            <TableCell className="font-medium text-red-600">GH₵{parseFloat(expense.amount).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-red-50">
                                        <TableCell className="font-bold">Total Expenses</TableCell>
                                        <TableCell className="font-bold text-red-600">GH₵{totalExpenses.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Outstanding Debts Table */}
                <Card>
                    <CardHeader className="flex flex-col space-y-4">
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Outstanding Customer Debts
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                            <Input
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead>Total Debt</TableHead>
                                    <TableHead>Amount Paid</TableHead>
                                    <TableHead>Outstanding Balance</TableHead>
                                    <TableHead>Last Payment</TableHead>
                                    <TableHead>Days Overdue</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDebts.map((debt, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{debt.customer}</TableCell>
                                        <TableCell>GH₵{parseFloat(debt.total_debt).toFixed(2)}</TableCell>
                                        <TableCell className="text-green-600">GH₵{parseFloat(debt.amount_paid).toFixed(2)}</TableCell>
                                        <TableCell className="font-medium text-orange-600">GH₵{parseFloat(debt.balance).toFixed(2)}</TableCell>
                                        <TableCell>{debt.last_payment}</TableCell>
                                        <TableCell className={debt.days_overdue > 14 ? 'font-medium text-red-600' : 'text-orange-600'}>
                                            {debt.days_overdue} days
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={debt.days_overdue > 14 ? 'destructive' : 'secondary'}>
                                                {debt.days_overdue > 14 ? 'Critical' : 'Overdue'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-orange-50">
                                    <TableCell colSpan={3} className="font-bold">
                                        Total Outstanding
                                    </TableCell>
                                    <TableCell className="font-bold text-orange-600">GH₵{totalOutstandingDebt.toFixed(2)}</TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

export default CreditCollection;
