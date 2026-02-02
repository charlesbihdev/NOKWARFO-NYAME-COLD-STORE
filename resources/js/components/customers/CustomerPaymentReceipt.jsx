// Receipt Component for Customer Debt Payment
// Optimized for 80mm thermal printers (Birch CV2)
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

const CustomerPaymentReceipt = ({ payment, customer, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    // Store information from environment variables
    const storeName = import.meta.env.VITE_STORE_NAME || 'STORE NAME';
    const storeAddress = import.meta.env.VITE_STORE_ADDRESS || '';
    const storePhone = import.meta.env.VITE_STORE_PHONE || '';

    return (
         <div className="receipt-print-wrapper fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:block print:bg-transparent print:p-0">
            <div className="receipt-container max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
                <div className="mb-4 text-center print:mb-2">
                    <div className="mx-auto mb-2 w-full border-b-2 border-dashed border-black print:mb-1 print:border-b"></div>
                    <h1 className="text-xl font-bold uppercase tracking-wide print:text-base">{storeName}</h1>
                    {storeAddress && <p className="text-sm text-gray-600 print:text-[10px] print:text-black">{storeAddress}</p>}
                    {storePhone && <p className="text-sm text-gray-600 print:text-[10px] print:text-black">Tel: {storePhone}</p>}
                    <div className="mx-auto mt-2 w-full border-b-2 border-dashed border-black print:mt-1 print:border-b"></div>
                </div>

                {/* Receipt Type Badge */}
                <div className="mb-4 text-center print:mb-2">
                    <span className="inline-block rounded bg-green-100 px-4 py-1 text-lg font-bold text-green-700 print:border print:border-black print:bg-transparent print:px-0 print:py-0 print:text-sm print:text-black">
                        PAYMENT RECEIPT
                    </span>
                </div>

                {/* Transaction Details */}
                <div className="mb-4 space-y-2 text-sm print:mb-2 print:space-y-1 print:text-[10px]">
                    <div className="flex justify-between">
                        <span className="font-semibold">Receipt #:</span>
                        <span className="font-mono">{payment.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold">Date:</span>
                        <span>{payment.payment_date || payment.date}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold">Customer:</span>
                        <span className="max-w-[60%] truncate text-right">{customer.name}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="my-3 border-t border-dashed border-gray-400 print:my-1 print:border-black"></div>

                {/* Payment Details */}
                <div className="mb-4 space-y-2 print:mb-2 print:space-y-1">
                    <div className="flex justify-between text-base print:text-sm">
                        <span className="font-semibold">Payment Amount:</span>
                        <span className="font-bold text-green-600 print:text-black">GH₵ {parseFloat(payment.amount_collected || payment.payment_amount || 0).toFixed(2)}</span>
                    </div>

                    {payment.previous_balance !== undefined && (
                        <div className="flex justify-between text-sm print:text-[10px]">
                            <span className="text-gray-600 print:text-black">Previous Balance:</span>
                            <span>GH₵ {parseFloat(payment.previous_balance).toFixed(2)}</span>
                        </div>
                    )}

                    {payment.outstanding_balance !== undefined && (
                        <>
                            <div className="my-2 border-t border-dashed border-gray-400 print:my-1 print:border-black"></div>
                            <div className="flex justify-between text-base print:text-sm">
                                <span className="font-semibold">Remaining Balance:</span>
                                <span className="font-bold text-red-600 print:text-black">GH₵ {parseFloat(payment.outstanding_balance || payment.current_balance || 0).toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Notes */}
                {payment.notes && (
                    <div className="mb-4 print:mb-2">
                        <div className="my-2 border-t border-dashed border-gray-400 print:my-1 print:border-black"></div>
                        <p className="text-sm text-gray-600 print:text-[10px] print:text-black">
                            <span className="font-semibold">Notes: </span>
                            {payment.notes}
                        </p>
                    </div>
                )}

                {/* Payment Status */}
                <div className="space-y-2 border-t-2 border-black pt-3 print:space-y-1 print:pt-2">
                    {payment.outstanding_balance > 0 || payment.current_balance > 0 ? (
                        <div className="text-center text-sm text-orange-600 print:text-[10px] print:text-black">
                            <p className="font-semibold">PARTIAL PAYMENT RECEIVED</p>
                            <p className="mt-1">Outstanding balance: GH₵ {parseFloat(payment.outstanding_balance || payment.current_balance || 0).toFixed(2)}</p>
                        </div>
                    ) : (
                        <div className="flex justify-between text-base text-green-600 print:text-sm print:text-black">
                            <span className="font-semibold">ACCOUNT SETTLED</span>
                            <span>✓</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 border-t-2 border-dashed border-black pt-4 text-center print:mt-3 print:pt-2">
                    <p className="text-sm text-gray-500 print:text-[10px] print:text-black">Thank you for your payment!</p>
                    <p className="mt-2 text-sm font-semibold print:mt-1 print:text-xs">We appreciate your business.</p>
                    <div className="mt-3 text-[10px] text-gray-400 print:mt-2 print:text-[10px] print:text-black">*** PAYMENT RECEIPT ***</div>
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

export default CustomerPaymentReceipt;
