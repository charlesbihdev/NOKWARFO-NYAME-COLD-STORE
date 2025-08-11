import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';

export default function AddTransactionModal({
    open,
    onClose,
    products,
    customers,
    form,
    items,
    setItems,
    amountPaid,
    setAmountPaid,
    dueDate,
    setDueDate,
    paymentType,
    setPaymentType,
    runningTotal,
}) {
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

    // Helper: get product by id
    const getProduct = (id) => products.find((p) => String(p.id) === String(id)) || null;

    // Handle changes in item fields including cartons, lines, qty, unit price
    const handleItemChange = (idx, field, value) => {
        const newItems = items.map((item, i) => {
            if (i !== idx) return item;

            let updatedItem = { ...item, [field]: value };

            const product = getProduct(updatedItem.product_id);
            if (!product) return updatedItem;

            const linesPerCarton = product.lines_per_carton || 1;

            // Calculate total lines & total price based on linesPerCarton
            let totalLines = 0;

            if (linesPerCarton > 1) {
                // Parse cartons and lines to int, fallback to 0
                const cartons = parseInt(updatedItem.cartons) || 0;
                const lines = parseInt(updatedItem.lines) || 0;
                totalLines = cartons * linesPerCarton + lines;

                // Calculate unit price per line
                const unitPricePerCarton = parseFloat(updatedItem.unit_selling_price) || 0;
                const unitPricePerLine = unitPricePerCarton / linesPerCarton;

                updatedItem.qty = totalLines;
                updatedItem.total = (unitPricePerLine * totalLines).toFixed(2);
            } else {
                // lines_per_carton == 1 => simple qty
                const qty = parseInt(updatedItem.qty) || 0;
                const unitPricePerCarton = parseFloat(updatedItem.unit_selling_price) || 0;

                updatedItem.qty = qty;
                updatedItem.total = (unitPricePerCarton * qty).toFixed(2);

                // Reset cartons and lines since not used
                updatedItem.cartons = undefined;
                updatedItem.lines = undefined;
            }

            return updatedItem;
        });
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { product_id: '', qty: '', unit_selling_price: '', total: '', cartons: 0, lines: 0 }]);
    };

    const removeItem = (idx) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== idx));
    };

    const handleAmountPaidChange = (v) => {
        setAmountPaid(v);
        if (paymentType === 'partial') {
            if (parseFloat(v) <= 0 || parseFloat(v) >= runningTotal) {
                form.setError('amount_paid', 'For partial payments, the amount paid must be greater than 0 and less than the total.');
            } else {
                form.setError('amount_paid', undefined);
            }
        }
    };

    const handlePaymentTypeChange = (v) => {
        setPaymentType(v);
        if (v === 'credit') {
            setAmountPaid('0');
            form.setError('amount_paid', undefined);
        } else if (v === 'cash') {
            setAmountPaid(runningTotal.toString());
            form.setError('amount_paid', undefined);
        } else if (v === 'partial') {
            setAmountPaid('');
            form.setError('amount_paid', undefined);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Sales Transaction</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (paymentType === 'cash' && parseFloat(amountPaid) !== runningTotal) {
                            form.setError('amount_paid', 'For cash payments, the amount paid must equal the total.');
                            return;
                        }
                        if (paymentType === 'credit' && parseFloat(amountPaid) !== 0) {
                            form.setError('amount_paid', 'For credit sales, the amount paid must be 0.');
                            return;
                        }
                        if (paymentType === 'partial' && (parseFloat(amountPaid) <= 0 || parseFloat(amountPaid) >= runningTotal)) {
                            form.setError('amount_paid', 'For partial payments, the amount paid must be greater than 0 and less than the total.');
                            return;
                        }
                        form.post('/sales-transactions', {
                            onSuccess: () => onClose(),
                        });
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="mb-1 block font-medium">
                            Customer
                            <div className="flex gap-2">
                                <Select
                                    value={form.data.customer_id ? String(form.data.customer_id) : 'none'}
                                    onValueChange={(v) => {
                                        if (v === 'none') {
                                            form.setData('customer_id', null);
                                        } else {
                                            form.setData('customer_id', v);
                                            form.setData('customer_name', '');
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- No customer selected --</SelectItem>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {!form.data.customer_id && (
                                    <Input
                                        type="text"
                                        placeholder="Customer name"
                                        value={form.data.customer_name}
                                        onChange={(e) => form.setData('customer_name', e.target.value)}
                                    />
                                )}
                            </div>
                        </label>

                        {form.errors.customer_id && <div className="mt-1 text-xs text-red-500">{form.errors.customer_id}</div>}
                    </div>

                    {/* Cart Items */}
                    <div>
                        <label className="mb-1 block font-medium">Items</label>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                            {items.map((item, idx) => {
                                const product = getProduct(item.product_id);
                                const linesPerCarton = product?.lines_per_carton || 1;

                                return (
                                    <div key={idx} className="grid w-full grid-cols-4 items-end gap-2">
                                        <div className="flex-1">
                                            <Select value={item.product_id} onValueChange={(v) => handleItemChange(idx, 'product_id', v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Product" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map((p) => (
                                                        <SelectItem key={p.id} value={String(p.id)}>
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {linesPerCarton > 1 ? (
                                            <>
                                                <div className="">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Cartons"
                                                        value={item.cartons || ''}
                                                        onChange={(e) => handleItemChange(idx, 'cartons', e.target.value)}
                                                    />
                                                </div>
                                                <div className="">
                                                    <Select
                                                        value={item.lines !== undefined ? String(item.lines) : ''}
                                                        onValueChange={(v) => handleItemChange(idx, 'lines', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Lines" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[...Array(linesPerCarton).keys()].map((n) => (
                                                                <SelectItem key={n + 1} value={String(n + 1)}>
                                                                    {n + 1}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Qty"
                                                    value={item.qty || ''}
                                                    onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <div className="">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="Unit Price"
                                                value={item.unit_selling_price || ''}
                                                onChange={(e) => handleItemChange(idx, 'unit_selling_price', e.target.value)}
                                            />
                                        </div>

                                        <div className="">
                                            <Input type="number" min="0" step="0.01" placeholder="Total" value={item.total || ''} readOnly />
                                        </div>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="text-white"
                                            onClick={() => removeItem(idx)}
                                            disabled={items.length === 1}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                );
                            })}
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                Add Item
                            </Button>
                        </div>
                        {form.errors['items'] && <div className="mt-1 text-xs text-red-500">{form.errors['items']}</div>}
                    </div>

                    <div className="text-lg font-bold">Total: GH₵{runningTotal.toFixed(2)}</div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="mb-1 block font-medium">Payment Type</label>
                            <Select value={paymentType} onValueChange={handlePaymentTypeChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="credit">Credit</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.payment_type && <div className="mt-1 text-xs text-red-500">{form.errors.payment_type}</div>}
                        </div>
                        <div className="flex-1">
                            <label className="mb-1 block font-medium">Amount Paid</label>
                            <Input
                                type="number"
                                min={paymentType === 'partial' ? 1 : 0}
                                max={paymentType === 'partial' ? runningTotal - 1 : runningTotal}
                                step="0.01"
                                value={amountPaid}
                                onChange={(e) => handleAmountPaidChange(e.target.value)}
                                disabled={paymentType === 'credit' || paymentType === 'cash'}
                            />
                            {form.errors.amount_paid && <InputError message={form.errors.amount_paid} className="mt-2" />}
                        </div>
                        {paymentType !== 'cash' && (
                            <div className="flex-1">
                                <label className="mb-1 block font-medium">Due Date</label>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                {form.errors.due_date && <div className="mt-1 text-xs text-red-500">{form.errors.due_date}</div>}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">{form.processing ? 'Saving..' : 'Save'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
