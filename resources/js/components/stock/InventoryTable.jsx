import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InventoryTable({ products, onAddStock }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr>
                                <th className="p-2 text-left font-medium">Product Name</th>
                                <th className="p-2 text-center">Current Stock</th>
                                <th className="p-2 text-left">Supplier</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="border-t">
                                    <td className="p-2 font-medium">{product.name}</td>
                                    <td className="p-2 text-center">{product.current_stock_display ?? '0'}</td>
                                    <td className="p-2">{product.supplier?.name || 'N/A'}</td>
                                    <td className="p-2 text-center">
                                        <Button variant="outline" size="sm" onClick={() => onAddStock(product)}>
                                            Add Stock
                                        </Button>
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
