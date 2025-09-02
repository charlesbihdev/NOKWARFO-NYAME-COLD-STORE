import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function AddTransactionModal({ isOpen, onClose, supplier, products, errors = {} }) {
    const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: 0 }]);

    const { data, setData, post, processing, reset } = useForm({
        supplier_id: supplier?.id || '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
        payment_amount: 0,
        payment_method: 'cash',
        payment_notes: '',
        make_payment: false,
    });

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            reset();
            setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
            setData({
                supplier_id: supplier?.id || '',
                transaction_date: new Date().toISOString().split('T')[0],
                notes: '',
                items: [],
                payment_amount: 0,
                payment_method: 'cash',
                payment_notes: '',
                make_payment: false,
            });
        }
    }, [isOpen, supplier, reset]);

    // Sync items with form data whenever items change
    useEffect(() => {
        setData('items', items);
    }, [items]);

    function addItem() {
        setItems([...items, { product_name: '', quantity: 1, unit_price: 0 }]);
    }

    function removeItem(index) {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
        }
    }

    function updateItem(index, field, value) {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    }



    function calculateTotal() {
        return items.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            return sum + (quantity * unitPrice);
        }, 0);
    }

    function handleSubmit(e) {
        e.preventDefault();
        
        if (!supplier) return;

        post(route('suppliers.create-credit-transaction', supplier.id), {
            onSuccess: () => {
                reset();
                // setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
                onClose();
            },
            onError: (errors) => {
                // Keep modal open to show validation errors
                console.log('Validation errors:', errors);
            },
            preserveScroll: true,
            preserveState: true,
            only: ['suppliers', 'products', 'errors', 'flash'],
        });
    }

    if (!supplier) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Credit Transaction for {supplier.name}</DialogTitle>
                    <DialogDescription>
                        Add a new credit transaction for this supplier. Fill in the transaction details and items purchased.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Transaction Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="transaction_date">Transaction Date *</Label>
                            <Input
                                id="transaction_date"
                                type="date"
                                value={data.transaction_date}
                                onChange={(e) => setData('transaction_date', e.target.value)}
                                // required
                            />
                            {errors.transaction_date && <div className="text-sm text-red-500">{errors.transaction_date}</div>}
                        </div>

                        <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <div className="text-2xl font-bold text-green-600">
                                GHC {calculateTotal().toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Items Purchased</Label>
                            <Button type="button" onClick={addItem} variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 p-4 border rounded-lg bg-gray-50">
                                <div className="col-span-5">
                                    <Label htmlFor={`product_${index}`}>Product Name *</Label>
                                    <Input
                                        id={`product_${index}`}
                                        list={`products-list-${index}`}
                                        placeholder="Type or select product name"
                                        value={item.product_name}
                                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                        required
                                    />
                                    <datalist id={`products-list-${index}`}>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.name} />
                                        ))}
                                    </datalist>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Type to search or select from {products.length} products
                                    </div>
                                    {errors[`items.${index}.product_name`] && (
                                        <div className="mt-1 text-xs text-red-500">{errors[`items.${index}.product_name`]}</div>
                                    )}
                                </div>

                                <div className="col-span-3">
                                    <Label htmlFor={`quantity_${index}`}>Quantity *</Label>
                                    <Input
                                        id={`quantity_${index}`}
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                        required
                                    />
                                    {errors[`items.${index}.quantity`] && (
                                        <div className="mt-1 text-xs text-red-500">{errors[`items.${index}.quantity`]}</div>
                                    )}
                                </div>

                                <div className="col-span-3">
                                    <Label htmlFor={`unit_price_${index}`}>Unit Price *</Label>
                                    <Input
                                        id={`unit_price_${index}`}
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                                        required
                                    />
                                    {errors[`items.${index}.unit_price`] && (
                                        <div className="mt-1 text-xs text-red-500">{errors[`items.${index}.unit_price`]}</div>
                                    )}
                                </div>

                                <div className="col-span-8">
                                    <Label>Total</Label>
                                    <div className="text-base font-semibold text-gray-700">
                                        GHC {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                                    </div>
                                </div>

                                <div className="col-span-1 flex items-end">
                                    {items.length > 1 && (
                                        <Button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {errors['items'] && <div className="mt-1 text-xs text-red-500">{errors['items']}</div>}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Additional notes about this transaction"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                        />
                        {errors.notes && <div className="text-sm text-red-500">{errors.notes}</div>}
                    </div>

                    {/* Payment Option */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="make_payment"
                                checked={data.make_payment}
                                onChange={(e) => setData('make_payment', e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="make_payment" className="text-lg font-semibold text-green-700">
                                Make Payment for This Transaction
                            </Label>
                        </div>

                        {data.make_payment && (
                            <div className="bg-green-50 p-4 rounded-lg space-y-4">
                                <h4 className="font-semibold text-green-800">Payment Details</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="payment_amount">Payment Amount *</Label>
                                        <Input
                                            id="payment_amount"
                                            type="number"
                                            min="0"
                                            max={calculateTotal()}
                                            step="0.01"
                                            value={data.payment_amount}
                                            onChange={(e) => setData('payment_amount', parseFloat(e.target.value) || 0)}
                                            placeholder="Enter payment amount"
                                            required
                                        />
                                        <div className="text-xs text-gray-600">
                                            Maximum: GHC {calculateTotal().toFixed(2)}
                                        </div>
                                        {errors.payment_amount && <div className="text-sm text-red-500">{errors.payment_amount}</div>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="payment_method">Payment Method</Label>
                                        <select
                                            id="payment_method"
                                            value={data.payment_method}
                                            onChange={(e) => setData('payment_method', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="check">Check</option>
                                            <option value="mobile_money">Mobile Money</option>
                                            <option value="other">Other</option>
                                        </select>
                                        {errors.payment_method && <div className="text-sm text-red-500">{errors.payment_method}</div>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payment_notes">Payment Notes</Label>
                                    <Textarea
                                        id="payment_notes"
                                        placeholder="Notes about this payment (optional)"
                                        value={data.payment_notes}
                                        onChange={(e) => setData('payment_notes', e.target.value)}
                                        rows={2}
                                    />
                                    {errors.payment_notes && <div className="text-sm text-red-500">{errors.payment_notes}</div>}
                                </div>

                                <div className="bg-white p-3 rounded border">
                                    <div className="flex justify-between text-sm">
                                        <span>Transaction Amount:</span>
                                        <span className="font-semibold">GHC {calculateTotal().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Payment Amount:</span>
                                        <span className="font-semibold text-green-600">GHC {data.payment_amount || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t pt-1">
                                        <span>Remaining Balance:</span>
                                        <span className="font-semibold text-red-600">
                                            GHC {Math.max(0, calculateTotal() - (data.payment_amount || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-blue-800">Transaction Summary</span>
                            <span className="text-2xl font-bold text-blue-900">
                                Total: GHC {calculateTotal().toFixed(2)}
                            </span>
                        </div>
                        <div className="text-sm text-blue-600 mt-2">
                            {data.make_payment && data.payment_amount > 0 ? (
                                <>
                                    Transaction amount: GHC {calculateTotal().toFixed(2)} | 
                                    Payment: GHC {data.payment_amount} | 
                                    Remaining: GHC {Math.max(0, calculateTotal() - data.payment_amount).toFixed(2)}
                                </>
                            ) : (
                                `This transaction will be added to ${supplier.name}'s outstanding balance. Payments can be made separately to reduce the overall debt.`
                            )}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
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
