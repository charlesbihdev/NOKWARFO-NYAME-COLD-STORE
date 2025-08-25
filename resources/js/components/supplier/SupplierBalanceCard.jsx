import { Badge } from '@/components/ui/badge';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

function SupplierBalanceCard({ supplier }) {
    const totalOwed = parseFloat(supplier.total_owed || 0) || 0;
    const totalPaid = parseFloat(supplier.total_paid || 0) || 0;
    const totalOutstanding = parseFloat(supplier.total_outstanding || 0) || 0;
    const transactionsCount = supplier.transactions_count || 0;

    const getBalanceColor = () => {
        if (totalOutstanding > 0) return 'text-red-600';
        if (totalOutstanding < 0) return 'text-green-600';
        return 'text-gray-600';
    };

    const getBalanceIcon = () => {
        if (totalOutstanding > 0) return <TrendingUp className="h-3 w-3" />;
        if (totalOutstanding < 0) return <TrendingDown className="h-3 w-3" />;
        return <Minus className="h-3 w-3" />;
    };

    const formatCurrency = (amount) => {
        const numAmount = parseFloat(amount) || 0;
        return `GHC ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-2">
            {/* Current Outstanding Balance */}
            <div className={`flex items-center gap-1 font-medium ${getBalanceColor()}`}>
                {getBalanceIcon()}
                <span className="text-sm">
                    {totalOutstanding > 0 && 'Outstanding: '}
                    {totalOutstanding < 0 && 'Credit: '}
                    {totalOutstanding === 0 && 'Settled: '}
                    {formatCurrency(totalOutstanding)}
                </span>
            </div>

            {/* Financial Summary */}
            {transactionsCount > 0 && (
                <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                        <span>Total Owed:</span>
                        <span>{formatCurrency(totalOwed)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Paid:</span>
                        <span>{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Transactions:</span>
                        <span>{transactionsCount}</span>
                    </div>
                    {supplier.last_transaction_date && (
                        <div className="flex justify-between">
                            <span>Last Activity:</span>
                            <span>{supplier.last_transaction_date}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Status Badges */}
            <div className="flex gap-1">
                {totalOutstanding > 0 && (
                    <Badge className="text-xs bg-red-600 text-white hover:bg-red-700">
                        Outstanding
                    </Badge>
                )}
                {totalOutstanding < 0 && (
                    <Badge variant="secondary" className="text-xs">
                        Overpaid
                    </Badge>
                )}
                {totalOutstanding === 0 && transactionsCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                        Settled
                    </Badge>
                )}
                {transactionsCount === 0 && (
                    <Badge variant="outline" className="text-xs">
                        No Transactions
                    </Badge>
                )}
            </div>
        </div>
    );
}

export default SupplierBalanceCard;
