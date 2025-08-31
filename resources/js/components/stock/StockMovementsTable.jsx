import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Edit, Trash2 } from 'lucide-react';

export default function StockMovementsTable({ stock_movements, onDelete, onEdit }) {
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
                                <TableHead>Type</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stock_movements.map((movement) => (
                                <TableRow key={movement.id} className={movement.type.includes('adjustment') ? 'bg-yellow-50' : 'bg-green-50'}>
                                    <TableCell className="font-medium">{movement.product?.name}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            movement.type === 'received'
                                                ? 'bg-green-100 text-green-800'
                                                : movement.type === 'adjustment_in'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {movement.type === 'received' ? 'Stock In' : 
                                             movement.type === 'adjustment_in' ? 'Adjustment In' : 'Adjustment Out'}
                                        </span>
                                    </TableCell>
                                    <TableCell className={`font-medium ${
                                        movement.type === 'adjustment_out' ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                        {movement.quantity_display}
                                    </TableCell>
                                    <TableCell>
                                        {movement.notes}
                                    </TableCell>
                                    <TableCell>{new Date(movement.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => onEdit(movement)}>
                                                <Edit className="h-4 w-4 mr-1" />
                                                Edit
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => onDelete(movement.id)}>
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Delete
                                            </Button>
                                        </div>
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
