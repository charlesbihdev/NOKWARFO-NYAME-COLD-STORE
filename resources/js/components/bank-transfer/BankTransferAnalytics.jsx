import { useState } from 'react';

export default function BankTransferAnalytics({ statistics, startDate, endDate }) {
    const [showBreakdown, setShowBreakdown] = useState(false);
    if (!statistics) return null;

    const isToday = (date) => {
        const today = new Date().toISOString().split('T')[0];
        return date === today;
    };

    const formatPeriod = () => {
        if (startDate === endDate) {
            return isToday(startDate) ? 'Today' : new Date(startDate).toLocaleDateString();
        }
        return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    };

    return (
        <div className="space-y-6">
            {/* Period Summary Cards */}
            <div>
                <h2 className="mb-4 text-lg font-semibold text-gray-700">
                    Period Summary ({formatPeriod()})
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-lg bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100">
                                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500">Total Money IN</p>
                                <p className="text-base font-semibold text-green-600">GH₵{parseFloat(statistics.total_credit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                <p className="text-xs text-gray-400">Credit/Deposits</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100">
                                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500">Total Money OUT</p>
                                <p className="text-base font-semibold text-red-600">GH₵{parseFloat(statistics.total_debit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                <p className="text-xs text-gray-400">Debit/Expenses</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${parseFloat(statistics.net_flow) >= 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                                    <svg className={`h-6 w-6 ${parseFloat(statistics.net_flow) >= 0 ? 'text-green-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500">Net Flow</p>
                                <p className={`text-base font-semibold ${parseFloat(statistics.net_flow) >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {parseFloat(statistics.net_flow) >= 0 ? '+' : ''}GH₵{Math.abs(parseFloat(statistics.net_flow)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </p>
                                <p className="text-xs text-gray-400">{parseFloat(statistics.net_flow) >= 0 ? 'Profit' : 'Loss'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow border-2 border-blue-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100">
                                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 mb-1">Today's Activity</p>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-semibold text-green-600">+GH₵{parseFloat(statistics.today_credit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    <span className="text-xs font-semibold text-red-600">-GH₵{parseFloat(statistics.today_debit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{statistics.today_count} transaction{statistics.today_count !== 1 ? 's' : ''} today</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown by Tags */}
            {statistics.tag_breakdown && statistics.tag_breakdown.length > 0 && (
                <div className="rounded-lg bg-white shadow">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Where is Your Money Going?</h3>
                            <p className="mt-1 text-sm text-gray-500">Detailed breakdown of transactions by category</p>
                        </div>
                        <button
                            onClick={() => setShowBreakdown(!showBreakdown)}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400"
                        >
                            {showBreakdown ? (
                                <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    Hide Details
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    Show Details
                                </>
                            )}
                        </button>
                    </div>

                    {showBreakdown && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Category</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">Money IN</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">Money OUT</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase">Transactions</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">Net Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {statistics.tag_breakdown.map((tagData, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 flex-shrink-0">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                                                            <span className="text-sm font-bold text-white">
                                                                {tagData.tag_name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900">{tagData.tag_name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-right text-green-600">
                                                +GH₵{parseFloat(tagData.total_credit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-right text-red-600">
                                                -GH₵{parseFloat(tagData.total_debit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="px-6 py-4 text-sm whitespace-nowrap text-center">
                                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                    {tagData.transaction_count} txn{tagData.transaction_count > 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-right">
                                                <span className={`font-semibold ${parseFloat(tagData.net_amount) >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {parseFloat(tagData.net_amount) >= 0 ? '+' : ''}GH₵{Math.abs(parseFloat(tagData.net_amount)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
