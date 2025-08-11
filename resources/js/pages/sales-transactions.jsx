import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react'; // Added for useEffect
import AddTransactionModal from '../components/sales/AddTransactionmodal';
import SalesTable from '../components/sales/salesTable';

function SalesTransactions({ sales_transactions = [], products = [], customers = [] }) {
    console.log(products);
    const [open, setOpen] = useState(false);
    // Cart-style items state
    const [items, setItems] = useState([{ product_id: '', qty: '', unit_selling_price: '', total: '' }]);
    // Payment state
    const [amountPaid, setAmountPaid] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [paymentType, setPaymentType] = useState('cash');
    const form = useForm({
        customer_id: '',
        customer_name: '',
        items: items,
        amount_paid: '',
        due_date: '',
        payment_type: 'cash',
    });

    // console.log(form.errors);

    // Update form items when items state changes
    useEffect(() => {
        form.setData('items', items);
    }, [items]);
    useEffect(() => {
        form.setData('amount_paid', amountPaid);
    }, [amountPaid]);
    useEffect(() => {
        form.setData('due_date', dueDate);
    }, [dueDate]);
    useEffect(() => {
        form.setData('payment_type', paymentType);
    }, [paymentType]);

    // Calculate running total
    const runningTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    // Ensure amountPaid is always runningTotal for cash
    useEffect(() => {
        if (paymentType === 'cash') {
            setAmountPaid(runningTotal.toString());
            form.setError('amount_paid', undefined);
        }
        if (paymentType === 'credit') {
            setAmountPaid('0');
            form.setError('amount_paid', undefined);
        }
    }, [paymentType, runningTotal]);

    const handleOpen = () => {
        form.reset();
        setItems([{ product_id: '', qty: '', unit_selling_price: '', total: '' }]);
        setAmountPaid('');
        setDueDate('');
        setPaymentType('cash');
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        form.reset();
        setItems([{ product_id: '', qty: '', unit_selling_price: '', total: '' }]);
        setAmountPaid('');
        setDueDate('');
        setPaymentType('cash');
    };

    const breadcrumbs = [{ title: 'Sales Transactions', href: '/sales-transactions' }];

    // Summary calculations
    // const totalAmount = sales_transactions.reduce((sum, t) => sum + parseFloat(t.total), 0);
    // Cash sales: sum amount_paid for cash and partial
    const cashAmount = sales_transactions.data.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + parseFloat(t.amount_paid), 0);
    // Credit sales: sum total for credit + amount_owed for partial
    const creditAmount =
        sales_transactions.data.filter((t) => t.payment_type === 'Credit').reduce((sum, t) => sum + parseFloat(t.total), 0) +
        sales_transactions.data.filter((t) => t.payment_type === 'Partial').reduce((sum, t) => sum + parseFloat(t.amount_owed), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Sales & Transactions</h1>
                    <Button onClick={handleOpen}>Add Transaction</Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">GH₵{(cashAmount + creditAmount).toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">All transactions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">GH₵{cashAmount.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">Cash payments</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Credit Sales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">GH₵{creditAmount.toFixed(2)}</div>
                            <p className="text-muted-foreground text-xs">Credit payments</p>
                        </CardContent>
                    </Card>
                </div>

                <SalesTable sales_transactions={sales_transactions} />
                {/* Add Transaction Modal */}
                <AddTransactionModal
                    open={open}
                    onClose={handleClose}
                    products={products}
                    customers={customers}
                    form={form}
                    items={items}
                    setItems={setItems}
                    amountPaid={amountPaid}
                    setAmountPaid={setAmountPaid}
                    dueDate={dueDate}
                    setDueDate={setDueDate}
                    paymentType={paymentType}
                    setPaymentType={setPaymentType}
                    runningTotal={runningTotal}
                    // onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}

export default SalesTransactions;
