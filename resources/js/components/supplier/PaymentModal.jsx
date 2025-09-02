import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function PaymentModal({ isOpen, onClose, supplier, errors = {} }) {
    const { data, setData, post, processing, reset, clearErrors } = useForm({
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: '',
    });

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            reset();
            clearErrors();
            setData({
                payment_amount: '',
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: '',
                notes: '',
            });
        }
    }, [isOpen, reset, clearErrors]);

    function handleSubmit(e) {
        e.preventDefault();
        
        post(route('suppliers.make-payment', supplier.id), {
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

    const totalOutstanding = supplier.total_outstanding || 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Make Payment to {supplier.name}</DialogTitle>
                    <DialogDescription>
                        Record a payment made to this supplier to reduce their outstanding debt.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Balance Display */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-yellow-800">Current Outstanding Balance</span>
                            <span className="text-2xl font-bold text-yellow-900">
                                GHC {totalOutstanding.toFixed(2)}
                            </span>
                        </div>
                        <div className="text-sm text-yellow-600 mt-2">
                            This payment will reduce the overall outstanding debt for {supplier.name}
                        </div>
                    </div>

                    {/* Payment Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_amount">Payment Amount *</Label>
                        <Input
                            id="payment_amount"
                            type="number"
                            min="0.01"
                            max={totalOutstanding}
                            step="0.01"
                            placeholder="Enter payment amount"
                            value={data.payment_amount}
                            onChange={(e) => setData('payment_amount', parseFloat(e.target.value))}
                            required
                        />
                        <div className="text-sm text-gray-500">
                            Maximum payment: GHC {totalOutstanding.toFixed(2)}
                        </div>
                        {errors.payment_amount && <div className="text-sm text-red-500">{errors.payment_amount}</div>}
                    </div>

                    {/* Payment Date */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_date">Payment Date *</Label>
                        <Input
                            id="payment_date"
                            type="date"
                            value={data.payment_date}
                            onChange={(e) => setData('payment_date', e.target.value)}
                            required
                        />
                        {errors.payment_date && <div className="text-sm text-red-500">{errors.payment_date}</div>}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_method">Payment Method</Label>
                        <Select value={data.payment_method} onValueChange={(value) => setData('payment_method', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                <SelectItem value="check">Check</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.payment_method && <div className="text-sm text-red-500">{errors.payment_method}</div>}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Optional notes about this payment"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                        />
                        {errors.notes && <div className="text-sm text-red-500">{errors.notes}</div>}
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-green-800">Payment Summary</span>
                            <span className="text-2xl font-bold text-green-900">
                                GHC {data.payment_amount || 0}
                            </span>
                        </div>
                        <div className="text-sm text-green-600 mt-2">
                            After this payment, the new outstanding balance will be: 
                            <span className="font-semibold ml-1">
                                GHC {Math.max(0, totalOutstanding - (data.payment_amount || 0)).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={processing || !data.payment_amount || data.payment_amount <= 0 || data.payment_amount > totalOutstanding}
                        >
                            {processing ? 'Processing...' : 'Record Payment'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
