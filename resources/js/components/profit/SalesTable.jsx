import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SalesTable = ({ title, sales, profitColorClass, totalProfit, rowColorClass }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Units Sold</TableHead>
                            <TableHead>Cost Price</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Selling Price</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.product}</TableCell>
                                <TableCell>{item.total_product_sold}</TableCell>
                                <TableCell>GH₵{parseFloat(item.unit_cost_price).toFixed(2)}</TableCell>
                                <TableCell>GH₵{parseFloat(item.total_cost_amount).toFixed(2)}</TableCell>
                                <TableCell>GH₵{parseFloat(item.selling_price).toFixed(2)}</TableCell>
                                <TableCell>GH₵{parseFloat(item.total_amount).toFixed(2)}</TableCell>
                                <TableCell className={`font-medium ${profitColorClass}`}>GH₵{parseFloat(item.profit).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className={rowColorClass}>
                            <TableCell colSpan={6} className="font-bold">
                                {title.includes('Cash') ? 'Total Cash Profit' : 'Total Profit'}
                            </TableCell>
                            <TableCell className={`font-bold ${profitColorClass}`}>GH₵{totalProfit.toFixed(2)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default SalesTable;
