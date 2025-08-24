import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditStockModal({ isOpen, onClose, stockMovement, data, setData, products, suppliers, errors, processing, onSubmit }) {
    // Helper functions for carton/line formatting
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

    const pricePerCarton = (pricePerLine, linesPerCarton) => {
        if (linesPerCarton <= 0) return 0;
        return pricePerLine * linesPerCarton;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Stock Movement</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-product-id" className="text-right">
                            Product *
                        </Label>
                        <div className="col-span-3">
                            <select
                                id="edit-product-id"
                                value={data.product_id}
                                onChange={(e) => setData('product_id', e.target.value)}
                                required
                                className="w-full rounded border px-2 py-1"
                            >
                                <option value="">Select product</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                            {errors.product_id && <div className="mt-1 text-xs text-red-500">{errors.product_id}</div>}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-supplier-id" className="text-right">
                            Supplier
                        </Label>
                        <div className="col-span-3">
                            <select
                                id="edit-supplier-id"
                                value={data.supplier_id}
                                onChange={(e) => setData('supplier_id', e.target.value)}
                                className="w-full rounded border px-2 py-1"
                            >
                                <option value="">Select supplier</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                            {errors.supplier_id && <div className="mt-1 text-xs text-red-500">{errors.supplier_id}</div>}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-type" className="text-right">
                            Type *
                        </Label>
                        <div className="col-span-3">
                            <select
                                id="edit-type"
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
                        <Label htmlFor="edit-quantity" className="text-right">
                            Quantity *
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="edit-quantity"
                                type="text"
                                value={data.quantity}
                                onChange={(e) => setData('quantity', e.target.value)}
                                placeholder="e.g., 5C2L (5 cartons, 2 lines)"
                                required
                            />
                            {errors.quantity && <div className="mt-1 text-xs text-red-500">{errors.quantity}</div>}
                            <div className="text-muted-foreground mt-1 text-xs">
                                Format: XCYL (X cartons, Y lines) or just a number for lines
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-unit-cost" className="text-right">
                            Unit Cost (GH₵) *
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="edit-unit-cost"
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
                        <Label htmlFor="edit-notes" className="text-right">
                            Notes
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="edit-notes"
                                placeholder="Optional notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                            />
                            {errors.notes && <div className="mt-1 text-xs text-red-500">{errors.notes}</div>}
                        </div>
                    </div>

                    <Button type="submit" disabled={processing}>
                        {processing ? 'Updating...' : 'Update Stock Movement'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

