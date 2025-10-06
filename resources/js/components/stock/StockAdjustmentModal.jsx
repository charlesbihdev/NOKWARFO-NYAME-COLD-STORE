import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function StockAdjustmentModal({ isOpen, onClose, selectedProduct, errors = {} }) {
    const { data, setData, post, processing, reset, clearErrors } = useForm({
        product_id: '',
        date: new Date().toISOString().split('T')[0],
        available_stock_target: '',
        received_today_target: '',
        notes: '',
        current_system_stock: '',
    });



    // Reset form when modal opens/closes or product changes
    useEffect(() => {
        if (isOpen && selectedProduct) {
            reset();
            clearErrors();
            setData({
                product_id: selectedProduct.id,
                date: new Date().toISOString().split('T')[0],
                available_stock_target: '',
                received_today_target: '',
                notes: '',
                current_system_stock: selectedProduct.current_stock_display || '0',
            });
        }
    }, [isOpen, selectedProduct, reset, clearErrors]);

    function handleSubmit(e) {
        e.preventDefault();
        
        post(route('stock-control.adjust'), {
            onSuccess: () => {
                reset();
                clearErrors();
                onClose();
            },
            preserveScroll: true,
            preserveState: true,
            // Include movements so the new adjustment row appears without full refresh
            only: ['products', 'stock_movements', 'stock_activity_summary', 'errors', 'flash'],
        });
    }

    function handleClose() {
        reset();
        clearErrors();
        onClose();
    }

    if (!selectedProduct) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Stock Adjustment for {selectedProduct.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Hidden product_id field */}
                    <input type="hidden" name="product_id" value={data.product_id} />
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="date"
                                type="date"
                                value={data.date}
                                onChange={(e) => setData('date', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="available_stock_target" className="text-right">
                            Set Available Stock (as of date)
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="available_stock_target"
                                type="text"
                                placeholder="e.g., 5C2L, 10C, 15L, or 20"
                                value={data.available_stock_target}
                                onChange={(e) => setData('available_stock_target', e.target.value)}
                            />
                            {errors.available_stock_target && <div className="mt-1 text-xs text-red-500">{errors.available_stock_target}</div>}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="received_today_target" className="text-right">
                            Set Stock Received today (for date)
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="received_today_target"
                                type="text"
                                placeholder="e.g., 5C2L, 10C, 15L, or 20"
                                value={data.received_today_target}
                                onChange={(e) => setData('received_today_target', e.target.value)}
                            />
                            {errors.received_today_target && <div className="mt-1 text-xs text-red-500">{errors.received_today_target}</div>}
                        </div>
                    </div>



                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notes
                        </Label>
                        <div className="col-span-3">
                            <Input 
                                id="notes" 
                                placeholder="Additional details about this adjustment" 
                                value={data.notes} 
                                onChange={(e) => setData('notes', e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">
                            Info
                        </Label>
                        <div className="col-span-3">
                            <div className="p-3 bg-blue-50 rounded border">
                                <div className="text-sm text-gray-600">
                                    Fill any field you want to set for the selected date. The system will compute adjustments to sync to those targets.
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button type="submit" disabled={processing}>
                        {processing ? 'Processing...' : 'Apply Adjustment'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
