import AppLayout from '@/layouts/app-layout';
import { Link, router, usePage } from '@inertiajs/react';
import moment from 'moment';

function SupplierTransactions() {
    const { supplier, transactions } = usePage().props;

    console.log('Supplier Transactions:', transactions);

    const goBack = () => router.get(route('suppliers.index'));

    return (
        <AppLayout breadcrumbs={[{ title: 'Suppliers', href: '/suppliers' }, { title: 'Transactions' }]}>
            <div className="min-h-screen space-y-4 bg-gray-100 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Transactions for {supplier.name}</h2>
                        <p className="text-sm text-gray-500">
                            Contact: {supplier.phone} | Email: {supplier.email}
                        </p>
                    </div>
                    <Link href="/suppliers" className="rounded bg-gray-200 px-4 py-2 text-black hover:bg-gray-300">
                        ← Back
                    </Link>
                </div>

                {transactions.data.map((transaction) => (
                    <div key={transaction.id} className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold">
                            DATE:{' '}
                            {moment(transaction.transaction_date).isValid()
                                ? moment(transaction.transaction_date).format('D MMMM YYYY')
                                : 'Invalid Date'}
                        </h3>

                        <table className="mb-4 w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 text-left">Product</th>
                                    <th className="py-2 text-right">Quantity</th>
                                    <th className="py-2 text-right">Price</th>
                                    <th className="py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transaction.items.map((item, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="py-2">{item.product_name}</td>
                                        <td className="py-2 text-right">{item.quantity}</td>
                                        <td className="py-2 text-right">GHC {Number(item.unit_price).toFixed(2)}</td>
                                        <td className="py-2 text-right">GHC {Number(item.total_amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="space-y-1 text-sm leading-6">
                            <p>
                                <strong>Total Cost of Product:</strong> GHC {Number(transaction.total_amount).toFixed(2)}
                            </p>
                            <p>
                                <strong>Previous Debt Balance:</strong> GHC {Number(transaction.previous_balance).toFixed(2)}
                            </p>
                            <p>
                                <strong>Total Debt Balance:</strong> GHC{' '}
                                {(Number(transaction.previous_balance) + Number(transaction.total_amount)).toFixed(2)}
                            </p>
                            <p>
                                <strong>Payment Made:</strong> GHC {Number(transaction.payment_amount).toFixed(2)}
                            </p>
                            <p>
                                <strong>Current Outstanding Balance:</strong> GHC {Number(transaction.current_balance).toFixed(2)}
                            </p>
                        </div>
                    </div>
                ))}

                <div className="flex items-center justify-center gap-4">
                    {transactions.prev_page_url && (
                        <Link href={transactions.prev_page_url} className="rounded border px-4 py-2 hover:bg-gray-100">
                            « Previous
                        </Link>
                    )}
                    <span className="px-4 py-2 font-medium">Page {transactions.current_page}</span>
                    {transactions.next_page_url && (
                        <Link href={transactions.next_page_url} className="rounded border px-4 py-2 hover:bg-gray-100">
                            Next »
                        </Link>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

export default SupplierTransactions;
