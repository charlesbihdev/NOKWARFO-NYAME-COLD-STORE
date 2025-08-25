import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/InputError';
import { useForm } from '@inertiajs/react';
import { Calendar, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

function AddCreditTransactionModal({ isOpen, onClose, supplier, errors = {} }) {
    const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: 0 }]);

    const { data, setData, post, processing, reset, clearErrors } = useForm({
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ product_name: '', quantity: 1, unit_price: 0 }],
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
    });

    useEffect(() => {
        if (isOpen) {
            const initialItems = [{ product_name: '', quantity: 1, unit_price: 0 }];
            setItems(initialItems);
            reset();
            clearErrors();
            setData((prev) => ({
                ...prev,
                transaction_date: new Date().toISOString().split('T')[0],
                notes: '',
                items: initialItems,
                payment_amount: '',
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: '',
            }));
        }
    }, [isOpen, reset, clearErrors]);

    function handleSubmit(e) {
        e.preventDefault();
        
        if (!supplier) return;

        post(route('suppliers.create-credit-transaction', supplier.id), {
            transaction_date: data.transaction_date,
            notes: data.notes,
            items: items,
            payment_amount: data.payment_amount || 0,
            payment_date: data.payment_date,
            payment_method: data.payment_method,
        }, {
            onSuccess: () => {
                onClose();
                reset();
                setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
            },
            onError: (errors) => {
                // Errors will be automatically handled by the form
            },
            onFinish: () => {
                // Form submission finished
            },
        });
    }

    function handleClose() {
        onClose();
        reset();
        clearErrors();
        setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
        setData((prev) => ({
            ...prev,
            payment_amount: '',
            payment_method: '',
        }));
    }

    function addItem() {
        const newItems = [...items, { product_name: '', quantity: 1, unit_price: 0 }];
        setItems(newItems);
        setData('items', newItems);
    }

    function removeItem(index) {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
            setData('items', newItems);
        }
    }

    function updateItem(index, field, value) {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
        setData('items', newItems);
    }

    if (!supplier) return null;

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
        return sum + parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
    }, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Supplier Info */}
                    <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-700">Supplier: {supplier.name}</p>
                    </div>

                    {/* Transaction Date */}
                    <div className="space-y-2">
                        <Label htmlFor="transaction_date">Transaction Date *</Label>
                        <Input
                            id="transaction_date"
                            type="date"
                            value={data.transaction_date}
                            onChange={(e) => setData('transaction_date', e.target.value)}
                            required
                        />
                        {errors.transaction_date && (
                            <p className="text-sm text-red-600">{errors.transaction_date}</p>
                        )}
                    </div>

                    {/* Goods Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Goods Items *</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addItem}
                                className="h-8"
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Item
                            </Button>
                        </div>

                        {/* Column Labels */}
                        <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-gray-600">
                            <div className="col-span-5">Product Name</div>
                            <div className="col-span-3 text-center">Quantity</div>
                            <div className="col-span-3 text-center">Unit Price (GHC)</div>
                            <div className="col-span-1"></div>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 rounded-lg border p-3">
                                <div className="col-span-5">
                                    <Input
                                        placeholder="Product name (e.g., Fish, Meat)"
                                        value={item.product_name}
                                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                        required
                                    />
                                    {errors[`items.${index}.product_name`] && (
                                        <InputError message={errors[`items.${index}.product_name`]} className="mt-1" />
                                    )}
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                        min="1"
                                        required
                                    />
                                    {errors[`items.${index}.quantity`] && (
                                        <InputError message={errors[`items.${index}.quantity`]} className="mt-1" />
                                    )}
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Unit Price"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                        min="0.01"
                                        required
                                    />
                                    {errors[`items.${index}.unit_price`] && (
                                        <InputError message={errors[`items.${index}.unit_price`]} className="mt-1" />
                                    )}
                                </div>
                                <div className="col-span-1">
                                    {items.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeItem(index)}
                                            className="h-8 w-8 p-0 text-red-600"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total Amount Display */}
                    <div className="rounded-lg bg-blue-50 p-3">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Total Amount:</span>
                            <span className="text-blue-600">GHC {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-medium">Make Payment (Optional)</Label>
                            <div className="text-sm text-gray-500">
                                Pay now to reduce outstanding balance
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="payment_amount">Payment Amount (GHC)</Label>
                                <Input
                                    id="payment_amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={totalAmount}
                                    placeholder="0.00"
                                    value={data.payment_amount || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setData('payment_amount', value);
                                    }}
                                />
                                {errors.payment_amount && (
                                    <InputError message={errors.payment_amount} className="mt-1" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment_date">Payment Date</Label>
                                <Input
                                    id="payment_date"
                                    type="date"
                                    value={data.payment_date}
                                    onChange={(e) => setData('payment_date', e.target.value)}
                                />
                                {errors.payment_date && (
                                    <InputError message={errors.payment_date} className="mt-1" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment_method">Payment Method</Label>
                                <Input
                                    id="payment_method"
                                    type="text"
                                    placeholder="Cash, Bank Transfer, etc."
                                    value={data.payment_method}
                                    onChange={(e) => setData('payment_method', e.target.value)}
                                />
                                {errors.payment_method && (
                                    <InputError message={errors.payment_method} className="mt-1" />
                                )}
                            </div>
                        </div>

                        {/* Outstanding Balance After Payment */}
                        {parseFloat(data.payment_amount || 0) > 0 && (
                            <div className="rounded-lg bg-green-50 p-3">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Outstanding Balance After Payment:</span>
                                    <span className="text-green-600">
                                        GHC {(totalAmount - parseFloat(data.payment_amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Additional information about this transaction"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                        />
                        {errors.notes && (
                            <InputError message={errors.notes} className="mt-1" />
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Transaction'}
                        </Button>
                    </div>
                </form>


            </DialogContent>
        </Dialog>
    );
}

export default AddCreditTransactionModal;
