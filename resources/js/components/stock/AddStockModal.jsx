import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AddStockModal({ isOpen, onClose, selectedProduct, data, setData, errors, processing, onSubmit }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Stock for {selectedProduct?.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity *
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="quantity"
                                type="text"
                                placeholder="e.g., 5C2L, 10C, 15L, or 20"
                                value={data.quantity}
                                onChange={(e) => setData('quantity', e.target.value)}
                                required
                            />
                            <div className="mt-1 text-xs text-gray-500">
                                Format: 5C2L = 5 cartons + 2 lines, 10C = 10 cartons, 15L = 15 lines, or just a number
                            </div>
                            {errors.quantity && <div className="mt-1 text-xs text-red-500">{errors.quantity}</div>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notes
                        </Label>
                        <div className="col-span-3">
                            <Input id="notes" placeholder="Optional notes" value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </div>
                    </div>
                    <Button type="submit" disabled={processing}>
                        Add Stock
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
