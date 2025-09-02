import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InventoryTable({ products, onAddStock, onAdjustStock }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Product Inventoryyyy</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr>
                                <th className="p-2 text-left font-medium">Product Name</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="border-t">
                                    <td className="p-2 font-medium">{product.name}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <Button variant="outline" size="sm" onClick={() => onAddStock(product)}>
                                                Add Stock
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => onAdjustStock(product)}>
                                                Stock Adjustment
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
