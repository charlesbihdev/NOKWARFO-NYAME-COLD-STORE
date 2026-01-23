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
import { router, useForm } from '@inertiajs/react';
import { AlertTriangle, Wallet } from 'lucide-react';
import { useState } from 'react';

function CreditCollection({ credit_collections = [], outstanding_debts = [], customers = [], date }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
    const [selectedDebt, setSelectedDebt] = useState(null);

    const filteredDebts = outstanding_debts.filter((debt) => debt.customer.toLowerCase().includes(searchQuery.toLowerCase()));
    const { data, setData, post, processing, errors, reset } = useForm({
        customer_id: '',
        amount_collected: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const breadcrumbs = [{ title: 'Credit Collection', href: '/credit-collection' }];

    function handleCollect(debt) {
        setSelectedDebt(debt);
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

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        router.get(route('credit-collection.index'), { date: newDate }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Credit Collection & Debt Management</h1>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium">Collection Date</label>
                        <Input type="date" value={selectedDate} onChange={handleDateChange} className="w-auto" />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Collections for Selected Date</CardTitle>
                            <Wallet className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">GH₵{totalCollected.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">From {credit_collections.length} customers on {new Date(selectedDate).toLocaleDateString()}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Outstanding (As of Date)</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">GH₵{totalOutstandingDebt.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">{outstanding_debts.length} customers as of {new Date(selectedDate).toLocaleDateString()}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Credit Collections */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Amount Collected from Creditors ({new Date(selectedDate).toLocaleDateString()})</CardTitle>
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
                            Outstanding Customer Debts (As of {new Date(selectedDate).toLocaleDateString()})
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

                        {/* Outstanding Debt Display */}
                        {selectedDebt && (
                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                                <div className="mb-2">
                                    <h4 className="font-semibold text-gray-900">{selectedDebt.customer}</h4>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Outstanding Debt:</span>
                                        <span className="text-xl font-bold text-orange-600">GH₵{parseFloat(selectedDebt.balance).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Total Debt:</span>
                                        <span className="font-medium text-gray-900">GH₵{parseFloat(selectedDebt.total_debt).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Paid So Far:</span>
                                        <span className="font-medium text-green-600">GH₵{parseFloat(selectedDebt.amount_paid).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

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
