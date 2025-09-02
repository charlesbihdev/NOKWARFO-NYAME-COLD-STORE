import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck } from 'lucide-react';

export default function StockActivitySummary({ stock_activity_summary, start_date, end_date }) {
    return (
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
                <Truck className="h-6 w-6 text-gray-500" />
                <h2 className="text-2xl font-bold">
                    Product Stock Activity Summary{' '}
                    {start_date && end_date ? (
                        <>
                            ({new Date(start_date).toLocaleDateString()} - {new Date(end_date).toLocaleDateString()})
                        </>
                    ) : (
                        '(Today)'
                    )}
                </h2>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Stock Received today</TableHead>
                            <TableHead>Previous Stock</TableHead>
                            <TableHead className="bg-blue-50">Total Available</TableHead>
                            <TableHead>Cash Sales</TableHead>
                            <TableHead>Credit Sales</TableHead>
                            <TableHead>Partial Sales</TableHead>
                            <TableHead className="bg-green-50">Total Sales</TableHead>
                            <TableHead>Corrections</TableHead>
                            <TableHead className="bg-yellow-50">Remaining Stock</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stock_activity_summary.length ? (
                            stock_activity_summary.map((row, idx) => (
                                <TableRow key={row.product + idx}>
                                    <TableCell className="font-medium">{row.product}</TableCell>
                                    <TableCell className="text-center">{row.stock_received_today}</TableCell>
                                    <TableCell className="text-center">{row.previous_stock}</TableCell>
                                    <TableCell className="bg-blue-50 text-center font-semibold">{row.total_available}</TableCell>
                                    <TableCell className="text-center">{row.cash_sales}</TableCell>
                                    <TableCell className="text-center">{row.credit_sales}</TableCell>
                                    <TableCell className="text-center">{row.partial_sales}</TableCell>
                                    <TableCell className="bg-green-50 text-center font-semibold">{row.total_sales}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={`text-sm ${
                                            row.corrections.includes('Added') ? 'text-green-600 font-medium' : 
                                            row.corrections.includes('Reduced') ? 'text-red-600 font-medium' : 
                                            'text-gray-500'
                                        }`}>
                                            {row.corrections}
                                        </span>
                                    </TableCell>
                                    <TableCell className="bg-yellow-50 text-center font-semibold">{row.remaining_stock}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={10} className="text-muted-foreground py-4 text-center">
                                    No data for today.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Formula explanations */}
            <div className="text-muted-foreground mt-3 flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-sm border border-blue-100 bg-blue-50"></span>
                    <span>Total Available = Previous Stock + Stock Received + Adjustments</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-sm border border-green-100 bg-green-50"></span>
                    <span>Total Sales = Cash Sales + Credit Sales + Partial Sales</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-sm border border-yellow-100 bg-yellow-50"></span>
                    <span>Remaining Stock = Total Available - Total Sales</span>
                </div>
            </div>
        </div>
    );
}
