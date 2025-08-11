import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck } from 'lucide-react';

export default function StockMovementsTable({ stock_movements, onDelete }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Stock Movements
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Total Cost</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stock_movements.map((movement) => (
                                <TableRow key={movement.id}>
                                    <TableCell>{movement.product?.name}</TableCell>
                                    <TableCell>{movement.supplier?.name}</TableCell>
                                    <TableCell>{movement.type}</TableCell>
                                    <TableCell>{movement.quantity_display}</TableCell>
                                    <TableCell>GH₵{parseFloat(movement.price_per_carton).toFixed(2)}</TableCell>
                                    <TableCell>GH₵{parseFloat(movement.total_cost).toFixed(2)}</TableCell>
                                    <TableCell>{movement.notes}</TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => onDelete(movement.id)}>
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
