import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { AlertCircle, DollarSign } from 'lucide-react';
import { useEffect } from 'react';

function MakePaymentModal({ isOpen, onClose, supplier, errors = {} }) {
    const { data, setData, post, processing, reset } = useForm({
        payment_amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
    });

    useEffect(() => {
        if (isOpen) {
            reset();
            setData((prev) => ({
                ...prev,
                transaction_date: new Date().toISOString().split('T')[0],
            }));
        }
    }, [isOpen]);

    function handleSubmit() {
        if (!supplier) return;

        post(route('suppliers.payments.store', supplier.id), {
            onSuccess: () => {
                reset();
                onClose();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['suppliers', 'errors', 'flash'],
        });
    }

    if (!supplier) return null;

    const currentBalance = parseFloat(supplier.current_balance || 0);
    const paymentAmount = parseFloat(data.payment_amount || 0);
    const remainingBalance = currentBalance - paymentAmount;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Make Payment to {supplier.name}
                    </DialogTitle>
                    <DialogDescription>Record a payment made to this supplier to reduce their outstanding balance.</DialogDescription>
                </DialogHeader>

                {/* Current Balance Info */}
                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Current Outstanding Balance:</span>
                                <span className="text-lg font-bold text-red-600">GHC {currentBalance.toFixed(2)}</span>
                            </div>

                            {paymentAmount > 0 && (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Payment Amount:</span>
                                        <span className="text-green-600">- GHC {paymentAmount.toFixed(2)}</span>
                                    </div>
                                    <hr />
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">New Balance:</span>
                                        <span
                                            className={`font-bold ${remainingBalance > 0 ? 'text-red-600' : remainingBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}
                                        >
                                            GHC {remainingBalance.toFixed(2)}
                                        </span>
                                    </div>
                                </>
                            )}

                            {paymentAmount > currentBalance && (
                                <div className="flex items-center gap-2 text-sm text-amber-600">
                                    <AlertCircle className="h-4 w-4" />
                                    Payment exceeds current debt. This will create a credit balance.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="payment_amount">Payment Amount *</Label>
                            <Input
                                id="payment_amount"
                                placeholder="0.00"
                                value={data.payment_amount}
                                onChange={(e) => setData('payment_amount', e.target.value)}
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={currentBalance}
                                required
                            />
                            {errors.payment_amount && <InputError message={errors.payment_amount} className="mt-1" />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="transaction_date">Payment Date *</Label>
                            <Input
                                id="transaction_date"
                                value={data.transaction_date}
                                onChange={(e) => setData('transaction_date', e.target.value)}
                                type="date"
                                required
                            />
                            {errors.transaction_date && <InputError message={errors.transaction_date} className="mt-1" />}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reference_number">Reference Number</Label>
                        <Input
                            id="reference_number"
                            placeholder="e.g., CHQ001, TRANSFER123"
                            value={data.reference_number}
                            onChange={(e) => setData('reference_number', e.target.value)}
                        />
                        {errors.reference_number && <InputError message={errors.reference_number} className="mt-1" />}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Payment method, additional notes..."
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                        />
                        {errors.notes && <InputError message={errors.notes} className="mt-1" />}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={processing || !data.payment_amount}>
                            {processing ? 'Recording Payment...' : 'Record Payment'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default MakePaymentModal;
