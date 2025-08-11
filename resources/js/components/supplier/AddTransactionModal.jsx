import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

function AddTransactionModal({ isOpen, onClose, supplier, errors = {} }) {
    const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: 0 }]);

    const { data, setData, post, processing, reset } = useForm({
        transaction_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        type: 'purchase',
        payment_amount: 0,
        notes: '',
        items: [{ product_name: '', quantity: 1, unit_price: 0 }],
    });

    console.log(errors);

    useEffect(() => {
        if (isOpen) {
            const initialItems = [{ product_name: '', quantity: 1, unit_price: 0 }];
            setItems(initialItems);
            reset();
            setData((prev) => ({
                ...prev,
                transaction_date: new Date().toISOString().split('T')[0],
                items: initialItems,
                type: 'purchase',
                payment_amount: 0,
            }));
        }
    }, [isOpen]);

    function handleSubmit() {
        if (!supplier) return;

        post(route('suppliers.transactions.store', supplier.id), {
            onSuccess: () => {
                reset();
                setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
                onClose();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['suppliers', 'errors', 'flash'],
        });
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

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => {
        return sum + parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
    }, 0);

    const paymentAmount = parseFloat(data.payment_amount || 0);
    const currentBalance = parseFloat(supplier.current_balance || 0);
    const newBalance = currentBalance + totalAmount - paymentAmount;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        Add Purchase Transaction - {supplier.name}
                    </DialogTitle>
                    <DialogDescription>Fill in the transaction details below to record a supplier purchase.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <Label htmlFor="transaction_date">Transaction Date</Label>
                        <Input
                            id="transaction_date"
                            type="date"
                            value={data.transaction_date}
                            onChange={(e) => setData('transaction_date', e.target.value)}
                        />
                        <InputError message={errors.transaction_date} />
                    </div>

                    <div>
                        <Label htmlFor="reference_number">Reference Number</Label>
                        <Input id="reference_number" value={data.reference_number} onChange={(e) => setData('reference_number', e.target.value)} />
                        <InputError message={errors.reference_number} />
                    </div>
                </div>

                <div className="mt-4">
                    <Label>Items</Label>
                    {items.map((item, index) => (
                        <Card key={index} className="mb-4">
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle>Item {index + 1}</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <Label>Product Name</Label>
                                    <Input value={item.product_name} onChange={(e) => updateItem(index, 'product_name', e.target.value)} />
                                    <InputError message={errors[`items.${index}.product_name`]} />
                                </div>
                                <div>
                                    <Label>Quantity</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    />
                                    <InputError message={errors[`items.${index}.quantity`]} />
                                </div>
                                <div>
                                    <Label>Unit Price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                    />
                                    <InputError message={errors[`items.${index}.unit_price`]} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button type="button" onClick={addItem} variant="outline" className="mt-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                    </Button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <Label htmlFor="payment_amount">Payment Made</Label>
                        <Input
                            type="number"
                            id="payment_amount"
                            min="0"
                            step="0.01"
                            value={data.payment_amount}
                            onChange={(e) => setData('payment_amount', e.target.value)}
                        />
                        <InputError message={errors.payment_amount} />
                    </div>

                    <div>
                        <Label>Previous Debt</Label>
                        <Input value={currentBalance.toFixed(2)} readOnly />
                    </div>

                    <div>
                        <Label>Total Debt Balance</Label>
                        <Input value={newBalance.toFixed(2)} readOnly />
                    </div>
                </div>

                <div className="mt-4">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" rows="3" value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={processing}>
                        Save Transaction
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default AddTransactionModal;
