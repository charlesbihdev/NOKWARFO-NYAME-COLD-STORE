import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function StockAdjustmentModal({ isOpen, onClose, selectedProduct, errors = {} }) {
    const { data, setData, post, processing, reset, clearErrors } = useForm({
        product_id: '',
        physical_count: '',
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
                physical_count: '',
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
            preserveState: false,
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
                        <Label htmlFor="current_stock" className="text-right">
                            Current System Stock
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="current_stock"
                                type="text"
                                value={data.current_system_stock || '0'}
                                disabled
                                className="bg-gray-100"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="physical_count" className="text-right">
                            Physical Count *
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="physical_count"
                                type="text"
                                placeholder="e.g., 5C2L, 10C, 15L, or 20"
                                value={data.physical_count}
                                onChange={(e) => setData('physical_count', e.target.value)}
                                required
                            />
                            <div className="mt-1 text-xs text-gray-500">
                                Enter the actual count from your physical inventory
                            </div>
                            {errors.physical_count && <div className="mt-1 text-xs text-red-500">{errors.physical_count}</div>}
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
                                    Enter the physical count and reason. The system will automatically calculate the adjustment needed.
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
