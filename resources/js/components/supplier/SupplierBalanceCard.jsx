import { Badge } from '@/components/ui/badge';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

function SupplierBalanceCard({ supplier }) {
    const balance = parseFloat(supplier.current_balance || 0);
    const totalPurchases = parseFloat(supplier.total_purchases || 0);
    const totalPayments = parseFloat(supplier.total_payments || 0);
    const transactionsCount = supplier.transactions_count || 0;

    const getBalanceColor = () => {
        if (balance > 0) return 'text-red-600';
        if (balance < 0) return 'text-green-600';
        return 'text-gray-600';
    };

    const getBalanceIcon = () => {
        if (balance > 0) return <TrendingUp className="h-3 w-3" />;
        if (balance < 0) return <TrendingDown className="h-3 w-3" />;
        return <Minus className="h-3 w-3" />;
    };

    const formatCurrency = (amount) => {
        return `GHC ${Math.abs(amount).toFixed(2)}`;
    };

    return (
        <div className="space-y-2">
            {/* Current Balance */}
            <div className={`flex items-center gap-1 font-medium ${getBalanceColor()}`}>
                {getBalanceIcon()}
                <span className="text-sm">
                    {balance > 0 && 'Owes: '}
                    {balance < 0 && 'Credit: '}
                    {balance === 0 && 'Settled: '}
                    {formatCurrency(balance)}
                </span>
            </div>

            {/* Financial Summary */}
            {transactionsCount > 0 && (
                <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                        <span>Total Purchases:</span>
                        <span>GHC {totalPurchases.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Payments:</span>
                        <span>GHC {totalPayments.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Transactions:</span>
                        <span>{transactionsCount}</span>
                    </div>
                    {supplier.last_transaction_date && (
                        <div className="flex justify-between">
                            <span>Last Activity:</span>
                            <span>{new Date(supplier.last_transaction_date).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Status Badges */}
            <div className="flex gap-1">
                {supplier.balance_status === 'debt' && (
                    <Badge variant="destructive" className="text-xs">
                        Outstanding
                    </Badge>
                )}
                {supplier.balance_status === 'credit' && (
                    <Badge variant="secondary" className="text-xs">
                        Overpaid
                    </Badge>
                )}
                {supplier.balance_status === 'settled' && transactionsCount > 0 && (
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
