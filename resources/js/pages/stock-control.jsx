import AppLayout from '@/layouts/app-layout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import DateRangePicker from '../components/DateRangePicker';

import AddStockModal from '../components/stock/AddStockModal';
import InventoryTable from '../components/stock/InventoryTable';
import StockActivitySummary from '../components/stock/StockActivitySummary';
import StockMovementsTable from '../components/stock/StockMovementsTable';

export default function StockControl({ stock_movements = [], products = [], suppliers = [], stock_activity_summary = [], date }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: '',
        supplier_id: '',
        type: 'received',
        quantity: '',
        unit_cost: '',
        total_cost: '',
        notes: '',
    });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const breadcrumbs = [{ title: 'Stock Control', href: '/stock-control' }];

    function openAddStock(product) {
        setSelectedProduct(product);
        setData({
            product_id: product.id,
            supplier_id: product.supplier_id ? product.supplier_id.toString() : '',
            type: 'received',
            quantity: '',
            unit_cost: product.cost_price || '',
            total_cost: '',
            notes: '',
        });
        setIsAddModalOpen(true);
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
                preserveState: false,
            });
        }
    }

    function handleEditStockMovement(id) {
        router.visit(route('stock-control.edit', id));
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
                <InventoryTable products={products} onAddStock={openAddStock} />

                <AddStockModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    selectedProduct={selectedProduct}
                    data={data}
                    setData={setData}
                    suppliers={suppliers}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleAddStock}
                />

                <StockMovementsTable stock_movements={stock_movements} onDelete={handleDeleteStockMovement} onEdit={handleEditStockMovement} />
            </div>
        </AppLayout>
    );
}
