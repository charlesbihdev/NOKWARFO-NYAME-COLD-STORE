// Receipt Component for Credit/Partial Payment
// Optimized for 80mm thermal printers (Birch CV2)
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

const CreditReceipt = ({ transaction, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    const totalAmount = transaction.sale_items.reduce((sum, item) => sum + parseFloat(item.total), 0);

    // Store information from environment variables
    const storeName = import.meta.env.VITE_STORE_NAME || 'STORE NAME';
    const storeAddress = import.meta.env.VITE_STORE_ADDRESS || '';
    const storePhone = import.meta.env.VITE_STORE_PHONE || '';

    return (
        <div className="receipt-print-wrapper fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:block print:bg-transparent print:p-0">
            <div className="receipt-container max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
                {/* Store Header */}
                <div className="mb-4 text-center print:mb-2">
                    <div className="mx-auto mb-2 w-full border-b-2 border-dashed border-black print:mb-1 print:border-b"></div>
                    <h1 className="text-xl font-bold tracking-wide uppercase print:text-base">{storeName}</h1>
                    {storeAddress && <p className="text-sm text-gray-600 print:text-xs print:text-black">{storeAddress}</p>}
                    {storePhone && <p className="text-sm text-gray-600 print:text-xs print:text-black">Tel: {storePhone}</p>}
                    <div className="mx-auto mt-2 w-full border-b-2 border-dashed border-black print:mt-1 print:border-b"></div>
                </div>

                {/* Receipt Type Badge */}
                <div className="mb-4 text-center print:mb-2">
                    <span className="inline-block rounded bg-red-100 px-4 py-1 text-lg font-bold text-red-700 print:border print:border-black print:bg-transparent print:px-0 print:py-0 print:text-sm print:text-black">
                        CREDIT SALE
                    </span>
                </div>

                {/* Transaction Details */}
                <div className="mb-4 space-y-2 text-sm print:mb-2 print:space-y-1 print:text-xs">
                    <div className="flex justify-between">
                        <span className="font-semibold">Receipt #:</span>
                        <span className="font-mono">{transaction.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold">Date:</span>
                        <span>{transaction.date}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold">Creditor:</span>
                        <span className="max-w-[60%] truncate text-right">{transaction.customer || 'Walk-in Customer'}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="my-3 border-t border-dashed border-gray-400 print:my-1 print:border-black"></div>

                {/* Items Table */}
                <table className="mb-4 w-full text-sm print:mb-2 print:text-[11px]">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="pb-2 text-left font-bold print:pb-1">Item</th>
                            <th className="pb-2 text-center font-bold print:pb-1">Qty</th>
                            <th className="pb-2 text-right font-bold print:pb-1">Price</th>
                            <th className="pb-2 text-right font-bold print:pb-1">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaction.sale_items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200 print:border-gray-400">
                                <td className="py-2 pr-1 print:max-w-[80px] print:truncate print:py-1">{item.product}</td>
                                <td className="py-2 text-center print:py-1">{item.quantity}</td>
                                <td className="py-2 text-right print:py-1">{parseFloat(item.unit_selling_price).toFixed(2)}</td>
                                <td className="py-2 text-right font-medium print:py-1">{parseFloat(item.total).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="space-y-2 border-t-2 border-black pt-3 print:space-y-1 print:pt-2">
                    <div className="flex justify-between text-base print:text-xs">
                        <span className="font-semibold">Subtotal:</span>
                        <span>GH₵ {totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base print:text-xs">
                        <span className="font-semibold">Amount Paid:</span>
                        <span>GH₵ {parseFloat(transaction.amount_paid).toFixed(2)}</span>
                    </div>
                    <div className="my-2 border-t border-dashed border-gray-400 print:my-1 print:border-black"></div>
                    <div className="flex justify-between text-lg font-bold print:text-sm">
                        <span className="text-red-600 print:text-black">BALANCE DUE:</span>
                        <span className="text-red-600 print:text-black">GH₵ {parseFloat(transaction.amount_owed).toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 border-t-2 border-dashed border-black pt-4 text-center print:mt-3 print:pt-2">
                    <p className="text-sm text-gray-500 print:text-[10px] print:text-black">Goods sold are NOT returnable.</p>
                    <p className="mt-2 text-sm font-semibold print:mt-1 print:text-xs">Thank You For Your Patronage!</p>
                    <div className="mt-3 text-[10px] text-gray-400 print:mt-2 print:text-[10px] print:text-black">*** CREDIT TRANSACTION ***</div>
                </div>

                {/* Action Buttons - Hidden when printing */}
                <div className="mt-6 flex gap-3 print:hidden">
                    <Button onClick={handlePrint} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        <Printer className="mr-2 h-4 w-4" />
                        Print Receipt
                    </Button>
                    <Button onClick={onClose} variant="outline" className="flex-1">
                        <X className="mr-2 h-4 w-4" />
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CreditReceipt;
