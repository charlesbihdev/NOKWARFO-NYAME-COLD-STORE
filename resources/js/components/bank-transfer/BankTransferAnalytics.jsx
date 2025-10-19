export default function BankTransferAnalytics({ analytics }) {
    if (!analytics) return null;

    const { overall, by_tag } = analytics;

    return (
        <div className="space-y-6">
            {/* Overall Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100">
                                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Credit</p>
                            <p className="text-2xl font-semibold text-green-600">₵{overall.total_credit}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100">
                                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Debit</p>
                            <p className="text-2xl font-semibold text-red-600">₵{overall.total_debit}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100">
                                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                            <p className="text-2xl font-semibold text-blue-600">{overall.total_transactions}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-md ${
                                    parseFloat(overall.net_amount.replace(/,/g, '')) >= 0 ? 'bg-green-100' : 'bg-red-100'
                                }`}
                            >
                                <svg
                                    className={`h-5 w-5 ${parseFloat(overall.net_amount.replace(/,/g, '')) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Net Amount</p>
                            <p
                                className={`text-2xl font-semibold ${
                                    parseFloat(overall.net_amount.replace(/,/g, '')) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                ₵{overall.net_amount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics by Tag */}
            {by_tag && by_tag.length > 0 && (
                <div className="rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h3 className="text-lg font-medium text-gray-900">Analytics by Tag</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Tag</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Total Credit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Total Debit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Transactions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Net Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {by_tag.map((tagData, index) => (
                                    <tr key={tagData.tag_id || index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 flex-shrink-0">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                                                        <span className="text-sm font-medium text-gray-600">
                                                            {tagData.tag_name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">{tagData.tag_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-green-600">₵{tagData.total_credit}</td>
                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-red-600">₵{tagData.total_debit}</td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">{tagData.transaction_count}</td>
                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                            <span
                                                className={`${
                                                    parseFloat(tagData.net_amount.replace(/,/g, '')) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}
                                            >
                                                ₵{tagData.net_amount}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
