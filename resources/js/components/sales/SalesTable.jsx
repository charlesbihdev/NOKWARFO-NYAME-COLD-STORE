import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, router } from '@inertiajs/react';
import { debounce } from 'lodash'; // or implement simple debounce yourself
import { Pencil, Receipt } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import DateRangePicker from '../DateRangePicker';
import CreditReceipt from './CreditReceipt';
import InstantPaymentReceipt from './InstantPaymentReceipt';
import SearchBar from './SearchBar';

// Main Sales Table Component
const SalesTable = ({ sales_transactions, onEdit }) => {
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [receiptType, setReceiptType] = useState(null);

    // States for filters
    const [searchTerm, setSearchTerm] = useState('');

    // Default to last 3 days (including today)
    const todayStr = new Date().toISOString().slice(0, 10);
    const threeDaysAgoStr = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(threeDaysAgoStr);
    const [endDate, setEndDate] = useState(todayStr);

    // Pagination state from props
    const currentPage = sales_transactions.current_page;

    // Debounced router call
    // useCallback to memoize debounce fn
    const debouncedFetch = useCallback(
        debounce((search, start, end, page) => {
            router.get(
                route('sales-transactions.index'),
                { search, start_date: start, end_date: end, page },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 500), // 500ms debounce
        [],
    );

    // Whenever searchTerm, startDate, endDate, or currentPage changes, fire debounced fetch
    useEffect(() => {
        debouncedFetch(searchTerm, startDate, endDate, currentPage);
    }, [searchTerm, startDate, endDate, currentPage, debouncedFetch]);

    // DateRangePicker onChange handler
    const handleDateChange = (value, type) => {
        if (type === 'start') setStartDate(value);
        else setEndDate(value);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            router.delete(route('sales-transactions.destroy', id));
        }
    };

    // Handle receipt generation
    const handleGenerateReceipt = (transaction) => {
        setSelectedTransaction(transaction);
        if (transaction.status === 'Completed' && parseFloat(transaction.amount_owed) === 0) {
            setReceiptType('instant');
        } else {
            setReceiptType('credit');
        }
    };

    // Close receipt modal
    const closeReceipt = () => {
        setSelectedTransaction(null);
        setReceiptType(null);
    };

    // Filter transactions based on search term
    // const filteredTransactions = sales_transactions.data.filter((transaction) => {
    //     const searchLower = searchTerm.toLowerCase();
    //     return (
    //         transaction.id.toLowerCase().includes(searchLower) ||
    //         transaction.customer.toLowerCase().includes(searchLower) ||
    //         transaction.sale_items.some((item) => item.product.toLowerCase().includes(searchLower))
    //     );
    // });

    return (
        <>
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
            <Card>
                <CardHeader>
                    <CardTitle>Sales Transactions</CardTitle>
                    <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Payment Type</TableHead>
                                <TableHead>Amount Paid</TableHead>
                                <TableHead>Amount Owed</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales_transactions.data.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell className="font-medium">{transaction.id}</TableCell>
                                    <TableCell>{transaction.date}</TableCell>
                                    <TableCell>{transaction.customer}</TableCell>
                                    <TableCell>
                                        {transaction.sale_items.map((item, idx) => (
                                            <div key={idx}>{item.product}</div>
                                        ))}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.sale_items.map((item, idx) => (
                                            <div key={idx}>{item.quantity}</div>
                                        ))}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.sale_items.map((item, idx) => (
                                            <div key={idx}>GH₵{parseFloat(item.unit_selling_price).toFixed(2)}</div>
                                        ))}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {transaction.sale_items.map((item, idx) => (
                                            <div key={idx}>GH₵{parseFloat(item.total).toFixed(2)}</div>
                                        ))}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                transaction.status === 'Partial'
                                                    ? 'secondary'
                                                    : transaction.payment_type === 'Cash'
                                                      ? 'default'
                                                      : 'secondary'
                                            }
                                        >
                                            {transaction.status === 'Partial' ? 'Partial' : transaction.payment_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>GH₵{parseFloat(transaction.amount_paid).toFixed(2)}</TableCell>
                                    <TableCell>GH₵{parseFloat(transaction.amount_owed).toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                transaction.status === 'Completed'
                                                    ? 'default'
                                                    : transaction.status === 'Partial'
                                                      ? 'secondary'
                                                      : transaction.status === 'Credit'
                                                        ? 'outline'
                                                        : 'secondary'
                                            }
                                        >
                                            {transaction.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onEdit && onEdit(transaction)}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                <Pencil className="mr-1 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGenerateReceipt(transaction)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Receipt className="mr-1 h-4 w-4" />
                                                Receipt
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(transaction.id)}
                                                className="text-white"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {sales_transactions.data.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center">No transactions found matching your search.</div>
                    ) : (
                        <div className="my-3 flex items-center justify-center gap-4">
                            {sales_transactions.prev_page_url && (
                                <Link
                                    preserveScroll
                                    preserveState
                                    href={sales_transactions.prev_page_url}
                                    className="rounded border px-4 py-2 hover:bg-gray-100"
                                >
                                    « Previous
                                </Link>
                            )}
                            <span className="px-4 py-2 font-medium">Page {sales_transactions.current_page}</span>
                            {sales_transactions.next_page_url && (
                                <Link
                                    preserveScroll
                                    preserveState
                                    href={sales_transactions.next_page_url}
                                    className="rounded border px-4 py-2 hover:bg-gray-100"
                                >
                                    Next »
                                </Link>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Receipt Modals */}
            {selectedTransaction && receiptType === 'instant' && <InstantPaymentReceipt transaction={selectedTransaction} onClose={closeReceipt} />}

            {selectedTransaction && receiptType === 'credit' && <CreditReceipt transaction={selectedTransaction} onClose={closeReceipt} />}
        </>
    );
};

export default SalesTable;
