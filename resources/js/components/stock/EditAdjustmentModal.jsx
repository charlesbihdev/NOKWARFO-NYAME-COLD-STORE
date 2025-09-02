import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

function EditAdjustmentModal({ isOpen, onClose, stockMovement, products, errors = {} }) {
    const { data, setData, put, processing, reset } = useForm({
        product_id: '',
        type: '',
        quantity: '',
        notes: '',
    });

    useEffect(() => {
        if (stockMovement) {
            // Convert quantity from lines to carton/line format for display
            const formatCartonLine = (totalLines, linesPerCarton) => {
                if (linesPerCarton <= 1) {
                    return totalLines.toString();
                }
                const cartons = Math.floor(totalLines / linesPerCarton);
                const lines = totalLines % linesPerCarton;
                
                if (cartons > 0 && lines > 0) {
                    return `${cartons}C${lines}L`;
                } else if (cartons > 0) {
                    return `${cartons}C`;
                } else if (lines > 0) {
                    return `${lines}L`;
                }
                return '0';
            };

            setData({
                product_id: stockMovement.product_id || '',
                type: stockMovement.type || '',
                quantity: formatCartonLine(stockMovement.quantity, stockMovement.product?.lines_per_carton || 1),
                notes: stockMovement.notes || '',
            });
        }
    }, [stockMovement]);

    function handleSubmit() {
        if (!stockMovement) return;

        put(route('stock-control.updateAdjustment', stockMovement.id), {
            onSuccess: () => {
                reset();
                onClose();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['stock_movements', 'stock_activity_summary', 'errors', 'flash'],
        });
    }

    if (!stockMovement || !['adjustment_in', 'adjustment_out'].includes(stockMovement.type)) return null;

    const isAdjustmentIn = stockMovement.type === 'adjustment_in';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Stock Adjustment</DialogTitle>
                    <DialogDescription>
                        Update the {isAdjustmentIn ? 'stock addition' : 'stock reduction'} information. 
                        All fields marked with * are required.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-product-id">Product *</Label>
                            <select
                                id="edit-product-id"
                                value={data.product_id}
                                onChange={(e) => setData('product_id', e.target.value)}
                                required
                                className="w-full rounded border px-3 py-2"
                            >
                                <option value="">Select product</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                            {errors.product_id && <InputError message={errors.product_id} className="mt-1" />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-type">Adjustment Type</Label>
                            <div className={`w-full rounded border px-3 py-2 font-medium ${
                                isAdjustmentIn ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                                {isAdjustmentIn ? '➕ Stock Addition' : '➖ Stock Reduction'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-quantity">Quantity * (Format: 5C2L for 5 cartons + 2 lines)</Label>
                        <Input
                            id="edit-quantity"
                            placeholder="e.g., 5C2L, 10C, 15L, or 20"
                            value={data.quantity}
                            onChange={(e) => setData('quantity', e.target.value)}
                            required
                        />
                        {errors.quantity && <InputError message={errors.quantity} className="mt-1" />}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notes</Label>
                        <Textarea
                            id="edit-notes"
                            placeholder="Reason for this stock adjustment"
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
                        <Button onClick={handleSubmit} disabled={processing}>
                            {processing ? 'Updating...' : 'Update Adjustment'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default EditAdjustmentModal;
