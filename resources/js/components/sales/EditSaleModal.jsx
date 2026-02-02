import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditSaleModal({ open, onClose, transaction, products, customers }) {
    const [items, setItems] = useState([]);

    // Initialize form with transaction data
    const form = useForm({
        customer_id: '',
        customer_name: '',
        payment_type: 'cash',
        amount_paid: '',
        items: [],
    });

    // Reset form when transaction changes or modal opens
    useEffect(() => {
        if (open && transaction) {
            // Parse existing sale items from the transaction
            const parsedItems = transaction.sale_items.map((item) => {
                // Find matching product
                const product = products.find((p) => p.name === item.product);
                const linesPerCarton = product?.lines_per_carton || 1;

                // Parse quantity display (e.g., "2C3L" or just "5")
                let cartons = 0;
                let lines = 0;
                let totalLines = 0;

                const qtyStr = String(item.quantity);
                const cartonLineMatch = qtyStr.match(/(\d+)C(\d+)L/);
                const cartonOnlyMatch = qtyStr.match(/(\d+)C$/);
                const lineOnlyMatch = qtyStr.match(/^(\d+)L$/);

                if (cartonLineMatch) {
                    cartons = parseInt(cartonLineMatch[1]) || 0;
                    lines = parseInt(cartonLineMatch[2]) || 0;
                    totalLines = cartons * linesPerCarton + lines;
                } else if (cartonOnlyMatch) {
                    cartons = parseInt(cartonOnlyMatch[1]) || 0;
                    totalLines = cartons * linesPerCarton;
                } else if (lineOnlyMatch) {
                    lines = parseInt(lineOnlyMatch[1]) || 0;
                    totalLines = lines;
                } else {
                    // Plain number
                    totalLines = parseInt(qtyStr) || 0;
                    if (linesPerCarton > 1) {
                        cartons = Math.floor(totalLines / linesPerCarton);
                        lines = totalLines % linesPerCarton;
                    }
                }

                return {
                    product_id: product ? String(product.id) : '',
                    product_name: item.product,
                    cartons: cartons,
                    lines: lines,
                    qty: totalLines,
                    unit_selling_price: parseFloat(item.unit_selling_price) || 0,
                    total: parseFloat(item.total) || 0,
                };
            });

            setItems(parsedItems.length > 0 ? parsedItems : [{ product_id: '', qty: '', unit_selling_price: '', total: '', cartons: 0, lines: 0 }]);

            // Find customer by name
            const customer = customers.find((c) => c.name === transaction.customer);

            form.setData({
                customer_id: customer ? String(customer.id) : '',
                customer_name: customer ? '' : transaction.customer || '',
                payment_type: transaction.payment_type.toLowerCase(),
                amount_paid: String(transaction.amount_paid),
                items: parsedItems,
            });
        }
    }, [open, transaction]);

    // Sync items with form data
    useEffect(() => {
        form.setData('items', items);
    }, [items]);

    // Calculate running total
    const runningTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    // Auto-update amount_paid based on payment type
    useEffect(() => {
        if (form.data.payment_type === 'cash') {
            form.setData('amount_paid', runningTotal.toString());
        } else if (form.data.payment_type === 'credit') {
            form.setData('amount_paid', '0');
        }
    }, [form.data.payment_type, runningTotal]);

    // Helper: get product by id
    const getProduct = (id) => products.find((p) => String(p.id) === String(id)) || null;

    // Handle changes in item fields
    const handleItemChange = (idx, field, value) => {
        const newItems = items.map((item, i) => {
            if (i !== idx) return item;

            let updatedItem = { ...item, [field]: value };

            const product = getProduct(updatedItem.product_id);
            if (!product) return updatedItem;

            const linesPerCarton = product.lines_per_carton || 1;

            // Calculate total lines & total price
            let totalLines = 0;

            if (linesPerCarton > 1) {
                const cartons = parseInt(updatedItem.cartons) || 0;
                const lines = parseInt(updatedItem.lines) || 0;
                totalLines = cartons * linesPerCarton + lines;

                const unitPricePerCarton = parseFloat(updatedItem.unit_selling_price) || 0;
                const unitPricePerLine = unitPricePerCarton / linesPerCarton;

                updatedItem.qty = totalLines;
                updatedItem.total = (unitPricePerLine * totalLines).toFixed(2);
            } else {
                const qty = parseInt(updatedItem.qty) || 0;
                const unitPricePerCarton = parseFloat(updatedItem.unit_selling_price) || 0;

                updatedItem.qty = qty;
                updatedItem.total = (unitPricePerCarton * qty).toFixed(2);

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

    const handlePaymentTypeChange = (v) => {
        form.setData('payment_type', v);
        form.clearErrors('amount_paid');
        // Clear customer name for credit/partial if no registered customer selected
        if ((v === 'credit' || v === 'partial') && !form.data.customer_id) {
            form.setData('customer_name', '');
        }
    };

    const handleAmountPaidChange = (v) => {
        form.setData('amount_paid', v);
        form.clearErrors('amount_paid');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const amountPaid = parseFloat(form.data.amount_paid);
        const paymentType = form.data.payment_type;

        // Validate payment logic
        if (paymentType === 'cash' && amountPaid !== runningTotal) {
            form.setError('amount_paid', 'For cash payments, the amount paid must equal the total.');
            return;
        }
        if (paymentType === 'credit' && amountPaid !== 0) {
            form.setError('amount_paid', 'For credit sales, the amount paid must be 0.');
            return;
        }
        if (paymentType === 'partial' && (amountPaid <= 0 || amountPaid >= runningTotal)) {
            form.setError('amount_paid', 'For partial payments, amount must be greater than 0 and less than total.');
            return;
        }

        form.put(route('sales-transactions.update', transaction.id), {
            onSuccess: () => {
                onClose();
            },
        });
    };

    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Edit Sale: {transaction.id}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Transaction Info */}
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-medium">{transaction.date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Original Total:</span>
                            <span className="font-medium">GH₵{parseFloat(transaction.total).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Customer Selection */}
                    <div>
                        <label className="mb-1 block font-medium">
                            Customer {(form.data.payment_type === 'credit' || form.data.payment_type === 'partial') && <span className="text-red-500">*</span>}
                        </label>
                        <div className="flex gap-2">
                            <Select
                                value={form.data.customer_id ? String(form.data.customer_id) : 'none'}
                                onValueChange={(v) => {
                                    if (v === 'none') {
                                        form.setData('customer_id', '');
                                    } else {
                                        form.setData('customer_id', v);
                                        form.setData('customer_name', '');
                                    }
                                }}
                            >
                                <SelectTrigger className={(form.data.payment_type === 'credit' || form.data.payment_type === 'partial') && !form.data.customer_id ? 'border-orange-500' : ''}>
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {form.data.payment_type === 'cash' && <SelectItem value="none">-- No customer selected --</SelectItem>}
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {!form.data.customer_id && form.data.payment_type === 'cash' && (
                                <Input
                                    type="text"
                                    placeholder="Or enter customer name"
                                    value={form.data.customer_name}
                                    onChange={(e) => form.setData('customer_name', e.target.value)}
                                />
                            )}
                        </div>

                        {(form.data.payment_type === 'credit' || form.data.payment_type === 'partial') && !form.data.customer_id && (
                            <div className="mt-2 rounded-md bg-orange-50 p-3 border border-orange-200">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-orange-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm text-orange-800">Credit/partial sales require a registered customer.</span>
                                </div>
                            </div>
                        )}
                        {form.errors.customer_id && <div className="mt-1 text-xs text-red-500">{form.errors.customer_id}</div>}
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-medium">Items</label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Item
                            </Button>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {items.map((item, idx) => {
                                const product = getProduct(item.product_id);
                                const linesPerCarton = product?.lines_per_carton || 1;

                                return (
                                    <div key={idx} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                                        <div className="grid grid-cols-12 gap-2 items-end">
                                            {/* Product Selection */}
                                            <div className="col-span-5">
                                                <label className="text-xs text-gray-600 mb-1 block">Product</label>
                                                <Select value={item.product_id} onValueChange={(v) => handleItemChange(idx, 'product_id', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select product" />
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

                                            {/* Quantity Fields */}
                                            {linesPerCarton > 1 ? (
                                                <>
                                                    <div className="col-span-2">
                                                        <label className="text-xs text-gray-600 mb-1 block">Cartons</label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={item.cartons || ''}
                                                            onChange={(e) => handleItemChange(idx, 'cartons', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-xs text-gray-600 mb-1 block">Lines</label>
                                                        <Select
                                                            value={item.lines !== undefined ? String(item.lines) : ''}
                                                            onValueChange={(v) => handleItemChange(idx, 'lines', v)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Lines" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[...Array(linesPerCarton).keys()].map((n) => (
                                                                    <SelectItem key={n} value={String(n)}>
                                                                        {n}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="col-span-4">
                                                    <label className="text-xs text-gray-600 mb-1 block">Quantity</label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.qty || ''}
                                                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {/* Unit Price */}
                                            <div className="col-span-3">
                                                <label className="text-xs text-gray-600 mb-1 block">Unit Price</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unit_selling_price || ''}
                                                    onChange={(e) => handleItemChange(idx, 'unit_selling_price', e.target.value)}
                                                />
                                            </div>

                                            <br/>

                                            {/* Total */}
                                            <div className="col-span-4">
                                                <label className="text-xs text-gray-600 mb-1 block">Total</label>
                                                <Input type="text" value={`GH₵${parseFloat(item.total || 0).toFixed(2)}`} readOnly className="bg-gray-100" />
                                            </div>

                                            {/* Remove Button */}
                                            <div className="col-span-1 flex items-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeItem(idx)}
                                                    disabled={items.length === 1}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Item subtotal display */}
                                        {product && linesPerCarton > 1 && (
                                            <div className="text-xs text-gray-500">
                                                {item.cartons || 0} cartons + {item.lines || 0} lines = {item.qty || 0} total lines
                                                ({linesPerCarton} lines/carton)
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {form.errors.items && <div className="mt-1 text-xs text-red-500">{form.errors.items}</div>}
                    </div>

                    {/* Running Total */}
                    <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-blue-800">New Total:</span>
                        <span className="text-2xl font-bold text-blue-900">GH₵{runningTotal.toFixed(2)}</span>
                    </div>

                    {/* Payment Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block font-medium">Payment Type</label>
                            <Select value={form.data.payment_type} onValueChange={handlePaymentTypeChange}>
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

                        <div>
                            <label className="mb-1 block font-medium">Amount Paid</label>
                            <Input
                                type="number"
                                min="0"
                                max={runningTotal}
                                step="0.01"
                                value={form.data.amount_paid}
                                onChange={(e) => handleAmountPaidChange(e.target.value)}
                            />
                            {form.errors.amount_paid && <InputError message={form.errors.amount_paid} className="mt-2" />}
                        </div>
                    </div>

                    {/* Amount Owed Display */}
                    {form.data.payment_type !== 'cash' && (
                        <div className="bg-orange-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-orange-800">Amount Owed:</span>
                                <span className="font-bold text-orange-900">
                                    GH₵{Math.max(0, runningTotal - parseFloat(form.data.amount_paid || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
