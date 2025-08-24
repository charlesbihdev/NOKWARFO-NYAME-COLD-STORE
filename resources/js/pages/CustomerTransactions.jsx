import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { ArrowLeft, Plus, DollarSign, ShoppingCart, Calendar, Phone, Mail, MapPin } from 'lucide-react';

export default function CustomerTransactions({ customer, transactions }) {
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        amount_collected: '',
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

    const getDebtStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'current': return 'bg-blue-100 text-blue-800';
            case 'overdue_30': return 'bg-yellow-100 text-yellow-800';
            case 'overdue_60': return 'bg-orange-100 text-orange-800';
            case 'overdue_90': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDebtStatusText = (status) => {
        switch (status) {
            case 'paid': return 'Paid';
            case 'current': return 'Current';
            case 'overdue_30': return '30+ Days Overdue';
            case 'overdue_60': return '60+ Days Overdue';
            case 'overdue_90': return '90+ Days Overdue';
            default: return 'Unknown';
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
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <Link
                            href={route('customers.index')}
                            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Customers
                        </Link>
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                                <p className="text-gray-600 mt-1">Transaction History & Debt Management</p>
                            </div>
                            
                            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                                <DialogTrigger asChild>
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Record Payment
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Record Payment</DialogTitle>
                                        <DialogDescription>
                                            Record a payment from {customer.name} against their outstanding debt.
                                        </DialogDescription>
                                    </DialogHeader>
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
                                                {errors.amount_collected && (
                                                    <p className="text-red-500 text-sm mt-1">{errors.amount_collected}</p>
                                                )}
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
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setShowPaymentDialog(false)}
                                            >
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

                    {/* Customer Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Debt</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {formatCurrency(customer.total_debt)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Outstanding Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">
                                    {formatCurrency(customer.outstanding_balance)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(customer.total_payments)}
                                </div>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                        {customer.phone || 'No phone number'}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                        {customer.email || 'No email address'}
                                    </span>
                                </div>
                                {customer.address && (
                                    <div className="flex items-start space-x-2 md:col-span-2">
                                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
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
                            <CardDescription>
                                Complete history of debt transactions and payments
                            </CardDescription>
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
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.data.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="w-4 h-4 text-gray-500" />
                                                        <span>{transaction.date}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge 
                                                        className={`capitalize ${
                                                            transaction.type === 'debt' 
                                                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                                                : 'bg-green-600 text-white hover:bg-green-700'
                                                        }`}
                                                    >
                                                        {transaction.type === 'debt' ? (
                                                            <>
                                                                <ShoppingCart className="w-3 h-3 mr-1" />
                                                                Debt
                                                            </>
                                                        ) : (
                                                            <>
                                                                <DollarSign className="w-3 h-3 mr-1" />
                                                                Payment
                                                            </>
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {transaction.reference}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{transaction.description}</div>
                                                        {transaction.notes && (
                                                            <div className="text-sm text-gray-500 mt-1">
                                                                {transaction.notes}
                                                            </div>
                                                        )}
                                                        {transaction.sale_items && transaction.sale_items.length > 0 && (
                                                            <div className="text-sm text-gray-600 mt-1">
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
                                                        <span className="text-red-600 font-medium">
                                                            +{formatCurrency(transaction.debt_amount)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {transaction.payment_amount > 0 ? (
                                                        <span className="text-green-600 font-medium">
                                                            -{formatCurrency(transaction.payment_amount)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-bold ${
                                                        transaction.current_balance > 0 
                                                            ? 'text-red-600' 
                                                            : 'text-green-600'
                                                    }`}>
                                                        {formatCurrency(transaction.current_balance)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                                                         {/* Pagination */}
                             {transactions.last_page > 1 && (
                                 <div className="mt-6">
                                     <nav className="flex justify-center space-x-2">
                                         <button
                                             disabled={!transactions.prev_page_url}
                                             onClick={() => window.location.href = transactions.prev_page_url}
                                             className={`rounded border px-3 py-1 ${!transactions.prev_page_url ? 'cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
                                         >
                                             Previous
                                         </button>
                                         <span className="rounded border px-3 py-1">{transactions.current_page}</span>
                                         <button
                                             disabled={!transactions.next_page_url}
                                             onClick={() => window.location.href = transactions.next_page_url}
                                             className={`rounded border px-3 py-1 ${!transactions.next_page_url ? 'cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
                                         >
                                             Next
                                         </button>
                                     </nav>
                                 </div>
                             )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
