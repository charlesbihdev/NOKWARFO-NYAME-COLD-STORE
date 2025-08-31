import AppLayout from '@/layouts/app-layout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import DateRangePicker from '../components/DateRangePicker';

import AddStockModal from '../components/stock/AddStockModal';
import StockAdjustmentModal from '../components/stock/StockAdjustmentModal';
import EditStockMovementModal from '../components/stock/EditStockMovementModal';
import EditAdjustmentModal from '../components/stock/EditAdjustmentModal';
import InventoryTable from '../components/stock/InventoryTable';
import StockActivitySummary from '../components/stock/StockActivitySummary';
import StockMovementsTable from '../components/stock/StockMovementsTable';


export default function StockControl({ stock_movements = [], products = [], stock_activity_summary = [], date }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditAdjustmentModalOpen, setIsEditAdjustmentModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [editingStockMovement, setEditingStockMovement] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: '',
        quantity: '',
        notes: '',
    });

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const breadcrumbs = [{ title: 'Stock Control', href: '/stock-control' }];

    function openAddStock(product) {
        setSelectedProduct(product);
        setData({
            product_id: product.id,
            quantity: '',
            notes: '',
        });
        setIsAddModalOpen(true);
    }

    function openAdjustStock(product) {
        setSelectedProduct(product);
        setIsAdjustModalOpen(true);
    }

    function handleAddStock(e) {
        e.preventDefault();
        post(route('stock-control.store'), {
            onSuccess: () => {
                reset();
                setIsAddModalOpen(false);
                setSelectedProduct(null);
            },
            preserveScroll: true,
            preserveState: true,
            only: ['products', 'stock_movements', 'stock_activity_summary', 'errors', 'flash'],
        });
    }



    function handleDeleteStockMovement(id) {
        if (confirm('Are you sure you want to delete this stock movement?')) {
            router.delete(route('stock-control.destroy', id), {
                preserveScroll: true,
                preserveState: true,
                only: ['stock_movements', 'products', 'stock_activity_summary', 'flash'],
            });
        }
    }

    function handleEditStockMovement(stockMovement) {
        setEditingStockMovement(stockMovement);
        
        // Determine which modal to show based on movement type
        if (stockMovement.type === 'received') {
            setIsEditModalOpen(true);
            setIsEditAdjustmentModalOpen(false);
        } else if (['adjustment_in', 'adjustment_out'].includes(stockMovement.type)) {
            setIsEditAdjustmentModalOpen(true);
            setIsEditModalOpen(false);
        }
    }

    const handleDateRangeChange = (value, type) => {
        if (type === 'start') setStartDate(value);
        else if (type === 'end') setEndDate(value);

        if ((type === 'start' && endDate) || (type === 'end' && startDate)) {
            router.get(
                route('stock-control.index'),
                {
                    start_date: type === 'start' ? value : startDate,
                    end_date: type === 'end' ? value : endDate,
                },
                {
                    preserveState: true,
                    replace: true,
                },
            );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateRangeChange} />

                <StockActivitySummary stock_activity_summary={stock_activity_summary} start_date={startDate} end_date={endDate} />
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Inventory Management</h1>
                </div>

                {/* Pass backend stock directly */}
                <InventoryTable products={products} onAddStock={openAddStock} onAdjustStock={openAdjustStock} />

                <AddStockModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    selectedProduct={selectedProduct}
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleAddStock}
                />

                <StockAdjustmentModal
                    isOpen={isAdjustModalOpen}
                    onClose={() => setIsAdjustModalOpen(false)}
                    selectedProduct={selectedProduct}
                />

                <EditStockMovementModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingStockMovement(null);
                    }}
                    stockMovement={editingStockMovement}
                    products={products}
                    errors={errors}
                />

                <EditAdjustmentModal
                    isOpen={isEditAdjustmentModalOpen}
                    onClose={() => {
                        setIsEditAdjustmentModalOpen(false);
                        setEditingStockMovement(null);
                    }}
                    stockMovement={editingStockMovement}
                    products={products}
                    errors={errors}
                />

                <StockMovementsTable stock_movements={stock_movements} onDelete={handleDeleteStockMovement} onEdit={handleEditStockMovement} />
            </div>
        </AppLayout>
    );
}
