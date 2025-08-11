import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ProductsTable({
    title,
    products, // paginated data
    totalQty, // already calculated in backend
    totalAmount, // already calculated in backend
    totalAmountColor,
    showAmountPaid = false,
    totalAmountPaid, // already calculated in backend
    onPageChange,
}) {
    const renderPagination = () => (
        <nav className="mt-4 flex justify-center space-x-2">
            <button
                disabled={!products.prev_page_url}
                onClick={() => onPageChange(products.current_page - 1)}
                className={`rounded border px-3 py-1 ${!products.prev_page_url ? 'cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
            >
                Previous
            </button>
            <span className="rounded border px-3 py-1">{products.current_page}</span>
            <button
                disabled={!products.next_page_url}
                onClick={() => onPageChange(products.current_page + 1)}
                className={`rounded border px-3 py-1 ${!products.next_page_url ? 'cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
            >
                Next
            </button>
        </nav>
    );

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
                            <TableHead>Quantity</TableHead>
                            <TableHead>Total Amount</TableHead>
                            {showAmountPaid && <TableHead>Amount Paid</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showAmountPaid ? 4 : 3} className="text-center text-gray-500">
                                    No records found
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.data.map((item, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">{item.product}</TableCell>
                                    <TableCell>{item.qty}</TableCell>
                                    <TableCell className="font-medium">GH₵{parseFloat(item.total_amount).toFixed(2)}</TableCell>
                                    {showAmountPaid && (
                                        <TableCell className="font-medium">GH₵{parseFloat(item.amount_paid || 0).toFixed(2)}</TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                        <TableRow
                            className={`bg-${
                                totalAmountColor === 'text-green-600' ? 'green' : totalAmountColor === 'text-orange-600' ? 'orange' : 'yellow'
                            }-50`}
                        >
                            <TableCell className="font-bold">Total Products</TableCell>
                            <TableCell className="font-bold">{totalQty}</TableCell>
                            <TableCell className={`font-bold ${totalAmountColor}`}>GH₵{totalAmount.toFixed(2)}</TableCell>
                            {showAmountPaid && <TableCell className="font-bold text-green-600">GH₵{totalAmountPaid.toFixed(2)}</TableCell>}
                        </TableRow>
                    </TableBody>
                </Table>
                {renderPagination()}
            </CardContent>
        </Card>
    );
}
