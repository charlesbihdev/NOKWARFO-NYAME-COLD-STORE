import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AddStockModal({ isOpen, onClose, selectedProduct, data, setData, suppliers, errors, processing, onSubmit }) {
    function getQuantityInputProps() {
        return {
            type: 'number',
            step: 1,
            placeholder: 'Enter quantity',
            min: 1,
        };
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Stock for {selectedProduct?.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type *
                        </Label>
                        <div className="col-span-3">
                            <select
                                id="type"
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value)}
                                required
                                className="w-full rounded border px-2 py-1"
                            >
                                <option value="received">Stock In</option>
                                <option value="sold">Stock Out</option>
                            </select>
                            {errors.type && <div className="mt-1 text-xs text-red-500">{errors.type}</div>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity *
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="quantity"
                                {...getQuantityInputProps()}
                                value={data.quantity}
                                onChange={(e) => setData('quantity', e.target.value)}
                                required
                            />
                            {errors.quantity && <div className="mt-1 text-xs text-red-500">{errors.quantity}</div>}

                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit_cost" className="text-right">
                            Unit Cost (GH₵) *
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="unit_cost"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={data.unit_cost}
                                onChange={(e) => setData('unit_cost', e.target.value)}
                                required
                            />
                            {errors.unit_cost && <div className="mt-1 text-xs text-red-500">{errors.unit_cost}</div>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="supplier_id" className="text-right">
                            Supplier *
                        </Label>
                        <div className="col-span-3">
                            <select
                                id="supplier_id"
                                value={data.supplier_id}
                                onChange={(e) => setData('supplier_id', e.target.value)}
                                required
                                className="w-full rounded border px-2 py-1"
                            >
                                <option value="">Select supplier</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            {errors.supplier_id && <div className="mt-1 text-xs text-red-500">{errors.supplier_id}</div>}
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
