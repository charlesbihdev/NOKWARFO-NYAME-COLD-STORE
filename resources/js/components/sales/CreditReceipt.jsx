// Receipt Component for Credit/Partial Payment
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const CreditReceipt = ({ transaction, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    const totalAmount = transaction.sale_items.reduce((sum, item) => sum + parseFloat(item.total), 0);

    return (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-8 print:max-w-none print:shadow-none">
                <div className="mb-6 text-center">
                    <h1 className="mb-2 text-2xl font-bold">CREDIT</h1>
                    <h2 className="text-xl font-bold">RECEIPT</h2>
                    <div className="mt-2 border-t-2 border-black"></div>
                </div>

                <div className="mb-6 space-y-4">
                    <div className="flex justify-between">
                        <span className="font-bold">DATE</span>
                        <span className="ml-4 flex-1 border-b border-black">{transaction.date}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">CREDITOR</span>
                        <span className="ml-4 flex-1 border-b border-black">{transaction.customer}</span>
                    </div>
                    <div>
                        <span className="font-bold">DESCRIPTION</span>
                    </div>
                </div>

                <table className="mb-4 w-full border-2 border-black">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="border-r-2 border-black p-2 text-left font-bold">PRODUCT</th>
                            <th className="border-r-2 border-black p-2 text-left font-bold">QTY</th>
                            <th className="border-r-2 border-black p-2 text-left font-bold">UNIT PRICE</th>
                            <th className="p-2 text-left font-bold">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaction.sale_items.map((item, idx) => (
                            <tr key={idx} className="border-b border-black">
                                <td className="border-r-2 border-black p-2">{item.product}</td>
                                <td className="border-r-2 border-black p-2">{item.quantity}</td>
                                <td className="border-r-2 border-black p-2">GH₵{parseFloat(item.unit_selling_price).toFixed(2)}</td>
                                <td className="p-2">GH₵{parseFloat(item.total).toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* <tr className="border-b border-black">
                            <td className="border-r-2 border-black p-2">
                                {transaction.sale_items.reduce((sum, item) => sum + parseInt(item.quantity), 0)}
                            </td>
                            <td className="border-r-2 border-black p-2"></td>
                            <td className="p-2"></td>
                        </tr> */}
                    </tbody>
                </table>

                <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">TOTAL</span>
                        <div className="min-w-[100px] border-2 border-black p-2 text-center">GH₵{totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-bold">AMOUNT PAID</span>
                        <div className="min-w-[100px] border-2 border-black p-2 text-center">GH₵{parseFloat(transaction.amount_paid).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-red-600">AMOUNT OWED</span>
                        <div className="min-w-[100px] border-2 border-red-600 p-2 text-center font-bold text-red-600">
                            GH₵{parseFloat(transaction.amount_owed).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="border-t-2 border-black pt-4">
                    <div className="text-center">
                        <h3 className="text-lg font-bold">CREDIT TRANSACTION</h3>
                    </div>
                </div>

                <div className="mt-6 flex gap-2 print:hidden">
                    <Button onClick={handlePrint} className="flex-1">
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button onClick={onClose} variant="outline" className="flex-1">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CreditReceipt;
