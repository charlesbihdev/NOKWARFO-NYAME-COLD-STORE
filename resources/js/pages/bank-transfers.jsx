import { router } from '@inertiajs/react';
import { useState } from 'react';

import AppLayout from '@/layouts/app-layout';
import BankTransferForm from '../components/bank-transfer/BankTransferForm';
import BankTransfersTable from '../components/bank-transfer/BankTransfersTable';
import DeleteConfirmDialog from '../components/bank-transfer/DeleteConfirmDialog';
import TagCreationForm from '../components/bank-transfer/TagCreationForm';

export default function BankTransfers({ bank_transfers = [], tags = [], last_balance = 0 }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteTransferId, setDeleteTransferId] = useState(null);

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

                <BankTransfersTable bankTransfers={bank_transfers} onDeleteClick={setDeleteTransferId} />

                <DeleteConfirmDialog isOpen={!!deleteTransferId} onClose={() => setDeleteTransferId(null)} onConfirm={handleDelete} />
            </div>
        </AppLayout>
    );
}
