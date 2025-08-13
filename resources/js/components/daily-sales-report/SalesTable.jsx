import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SalesTable({ title, sales, amountTotal, amountColor, onPageChange }) {
    const renderPagination = () => (
        <nav className="mt-4 flex justify-center space-x-2">
            <button
                disabled={!sales.prev_page_url}
                onClick={() => onPageChange(sales.current_page - 1)}
                className={`rounded border px-3 py-1 ${!sales.prev_page_url ? 'cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
            >
                Previous
            </button>
            <span className="rounded border px-3 py-1">{sales.current_page}</span>
            <button
                disabled={!sales.next_page_url}
                onClick={() => onPageChange(sales.current_page + 1)}
                className={`rounded border px-3 py-1 ${!sales.next_page_url ? 'cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
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
                            <TableHead>Time</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Products</TableHead>
                            <TableHead>Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-500">
                                    No records found
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.data.map((sale, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{sale.time}</TableCell>
                                    <TableCell className="font-medium">{sale.customer}</TableCell>
                                    <TableCell>{sale.products}</TableCell>
                                    <TableCell className="font-medium">GH₵{Number(sale.amount || 0).toFixed(2)}</TableCell>
                                </TableRow>
                            ))
                        )}
                        <TableRow className={amountColor === 'text-green-600' ? 'bg-green-50' : 'bg-orange-50'}>
                            <TableCell colSpan={3} className="font-bold">
                                Total {title}
                            </TableCell>
                            <TableCell className={`font-bold ${amountColor}`}>GH₵{Number(amountTotal || 0).toFixed(2)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                {renderPagination()}
            </CardContent>
        </Card>
    );
}
