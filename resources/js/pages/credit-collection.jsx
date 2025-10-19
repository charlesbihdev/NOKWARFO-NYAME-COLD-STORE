import InputError from '@/components/InputError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, Wallet } from 'lucide-react';
import { useState } from 'react';

function CreditCollection({ credit_collections = [], outstanding_debts = [], customers = [] }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredDebts = outstanding_debts.filter((debt) => debt.customer.toLowerCase().includes(searchQuery.toLowerCase()));
    const { data, setData, post, processing, errors, reset } = useForm({
        customer_id: '',
        amount_collected: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const breadcrumbs = [{ title: 'Credit Collection', href: '/credit-collection' }];

    function handleCollect(debt) {
        setData({
            customer_id: debt.customer_id,
            amount_collected: '',
            payment_date: new Date().toISOString().split('T')[0],
            notes: '',
        });
        setOpen(true);
    }

    function handleSubmit(e) {
        e.preventDefault();
        post(route('credit-collection.store'), {
            onSuccess: () => {
                reset();
                setOpen(false);
            },
            preserveScroll: true,
        });
    }

    const totalCollected = credit_collections.reduce((sum, col) => sum + parseFloat(col.amount_collected), 0);
    const totalOutstandingDebt = outstanding_debts.reduce((sum, debt) => sum + parseFloat(debt.balance), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Credit Collection & Debt Management</h1>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                            <CardTitle>Amount Collected from Creditors (Today's Payments)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer Name</TableHead>
                                        <TableHead>Amount Collected</TableHead>
                                        <TableHead>Payment Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {credit_collections.map((collection, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{collection.customer}</TableCell>
                                            <TableCell className="font-medium text-green-600">
                                                GH₵{parseFloat(collection.amount_collected).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-gray-600">{collection.payment_date}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-green-50">
                                        <TableCell className="font-bold">Total Collected</TableCell>
                                        <TableCell className="font-bold text-green-600">GH₵{totalCollected.toFixed(2)}</TableCell>
                                        <TableCell></TableCell>
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
                                    <TableHead>Actions</TableHead>
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
                                            <Badge
                                                className={
                                                    debt.days_overdue > 14
                                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                                        : 'bg-orange-600 text-white hover:bg-orange-700'
                                                }
                                            >
                                                {debt.days_overdue > 14 ? 'Critical' : 'Overdue'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => handleCollect(debt)}>
                                                Collect
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-orange-50">
                                    <TableCell colSpan={3} className="font-bold">
                                        Total Outstanding
                                    </TableCell>
                                    <TableCell className="font-bold text-orange-600">GH₵{totalOutstandingDebt.toFixed(2)}</TableCell>
                                    <TableCell colSpan={4}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Collection Modal */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Record Credit Collection</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="customer" className="text-right">
                                    Customer
                                </Label>
                                <Select value={data.customer_id} onValueChange={(value) => setData('customer_id', value)} disabled>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((customer) => (
                                            <SelectItem key={customer.id} value={customer.id}>
                                                {customer.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.customer_id && <InputError message={errors.customer_id} className="mt-2" />}
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">
                                    Amount (GH₵)
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="amount"
                                        type="number"
                                        className="w-full"
                                        placeholder="0.00"
                                        value={data.amount_collected}
                                        onChange={(e) => setData('amount_collected', e.target.value)}
                                        required
                                    />
                                    {errors.amount_collected && <InputError message={errors.amount_collected} className="mt-2" />}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="payment_date" className="text-right">
                                    Payment Date
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="payment_date"
                                        type="date"
                                        className="w-full"
                                        value={data.payment_date}
                                        onChange={(e) => setData('payment_date', e.target.value)}
                                        required
                                    />
                                    {errors.payment_date && <InputError message={errors.payment_date} className="mt-2" />}
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
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Recording...' : 'Record Collection'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

export default CreditCollection;
