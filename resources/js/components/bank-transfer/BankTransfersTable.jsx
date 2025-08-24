import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, usePage } from '@inertiajs/react';
import { Banknote, Trash2 } from 'lucide-react';

export default function BankTransfersTable({ bankTransfers, onDeleteClick }) {
    const { start_date, end_date } = usePage().props;

    // Helper function to build pagination URLs with date parameters
    const buildPaginationUrl = (url) => {
        if (!url) return '#';
        
        const urlObj = new URL(url);
        urlObj.searchParams.set('start_date', start_date || '');
        urlObj.searchParams.set('end_date', end_date || '');
        return urlObj.toString();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Bank Transfer Ledger
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Previous Balance</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead>Total Balance</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Tag</TableHead>
                            <TableHead>Current Balance</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bankTransfers.data.length > 0 ? (
                            bankTransfers.data.map((transfer) => (
                                <TableRow key={transfer.id}>
                                    <TableCell>{transfer.date}</TableCell>
                                    <TableCell>GH₵{transfer.previous_balance || 0}</TableCell>
                                    <TableCell className="text-green-600">GH₵{transfer.credit || 0}</TableCell>
                                    <TableCell>GH₵{transfer.total_balance || 0}</TableCell>
                                    <TableCell className="text-red-600">GH₵{transfer.debit || 0}</TableCell>
                                    <TableCell>{transfer.tag ? transfer.tag.name : 'No tag'}</TableCell>
                                    <TableCell className="font-medium">GH₵{transfer.current_balance || 0}</TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate">{transfer.notes || '-'}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteClick(transfer.id)}
                                                className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="text-muted-foreground text-center">
                                    No bank transfers recorded for the selected date range
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <div className="my-3 flex items-center justify-center gap-4">
                    {bankTransfers.prev_page_url && (
                        <Link 
                            preserveScroll 
                            preserveState 
                            href={buildPaginationUrl(bankTransfers.prev_page_url)} 
                            className="rounded border px-4 py-2 hover:bg-gray-100"
                        >
                            « Previous
                        </Link>
                    )}
                    <span className="px-4 py-2 font-medium">Page {bankTransfers.current_page}</span>
                    {bankTransfers.next_page_url && (
                        <Link 
                            preserveScroll 
                            preserveState 
                            href={buildPaginationUrl(bankTransfers.next_page_url)} 
                            className="rounded border px-4 py-2 hover:bg-gray-100"
                        >
                            Next »
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
