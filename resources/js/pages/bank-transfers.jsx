import { router } from '@inertiajs/react';
import { useState } from 'react';

import AppLayout from '@/layouts/app-layout';
import DateRangePicker from '../components/DateRangePicker';
import BankTransferForm from '../components/bank-transfer/BankTransferForm';
import BankTransfersTable from '../components/bank-transfer/BankTransfersTable';
import DeleteConfirmDialog from '../components/bank-transfer/DeleteConfirmDialog';
import TagCreationForm from '../components/bank-transfer/TagCreationForm';

export default function BankTransfers({ 
    bank_transfers = [], 
    tags = [], 
    last_balance = 0,
    start_date = '',
    end_date = ''
}) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteTransferId, setDeleteTransferId] = useState(null);
    
    // Default to current month if no dates provided
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(start_date || currentMonthStart);
    const [endDate, setEndDate] = useState(end_date || currentMonthEnd);

    // Handle date changes - reset page params to 1 on new date filter
    const handleDateChange = (value, type) => {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;

        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('bank-transfers.index'),
            {
                start_date: newStartDate,
                end_date: newEndDate,
                page: 1, // Reset to first page when changing dates
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    function handleDelete() {
        if (!deleteTransferId) return;

        router.delete(route('bank-transfers.destroy', deleteTransferId), {
            method: 'delete',
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => setDeleteTransferId(null),
        });
    }

    function onTagAdded() {
        // Optional: you can refresh tags or do something after tag added
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Bank Transfers', href: '/bank-transfers' }]}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Bank Transfers</h1>
                    <div className="flex items-center space-x-4">
                        <TagCreationForm onAddTag={onTagAdded} />
                        <BankTransferForm tags={tags} lastBalance={last_balance} isOpen={isAddModalOpen} setIsOpen={setIsAddModalOpen} />
                    </div>
                </div>

                <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />

                <BankTransfersTable bankTransfers={bank_transfers} onDeleteClick={setDeleteTransferId} />

                <DeleteConfirmDialog isOpen={!!deleteTransferId} onClose={() => setDeleteTransferId(null)} onConfirm={handleDelete} />
            </div>
        </AppLayout>
    );
}
