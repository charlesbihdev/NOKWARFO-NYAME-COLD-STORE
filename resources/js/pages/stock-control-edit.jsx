import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';


export default function StockControlEdit({ stockMovement, products, suppliers }) {
    // Helper functions for carton/line formatting
    const formatCartonLine = (totalLines, linesPerCarton) => {
        if (linesPerCarton <= 1) {
            return totalLines.toString();
        }
        const cartons = Math.floor(totalLines / linesPerCarton);
        const lines = totalLines % linesPerCarton;
        
        if (cartons > 0 && lines > 0) {
            return `${cartons}C${lines}L`;
        } else if (cartons > 0) {
            return `${cartons}C`;
        } else if (lines > 0) {
            return `${lines}L`;
        }
        return '0';
    };

    const pricePerCarton = (pricePerLine, linesPerCarton) => {
        if (linesPerCarton <= 0) return 0;
        return pricePerLine * linesPerCarton;
    };

    const { data, setData, put, processing, errors } = useForm({
        product_id: stockMovement.product_id,
        supplier_id: stockMovement.supplier_id || '',
        type: stockMovement.type,
        quantity: formatCartonLine(stockMovement.quantity, stockMovement.product.lines_per_carton),
        unit_cost: pricePerCarton(stockMovement.unit_cost, stockMovement.product.lines_per_carton),
        notes: stockMovement.notes || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('stock-control.update', stockMovement.id));
    };

    const breadcrumbs = [
        { title: 'Stock Control', href: '/stock-control' },
        { title: 'Edit Stock Movement', href: '#' }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            href={route('stock-control.index')}
                            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Stock Control
                        </Link>
                        <h1 className="text-3xl font-bold">Edit Stock Movement</h1>
                        <p className="text-gray-600 mt-1">Update stock movement details</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Edit Stock Movement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="product_id">Product *</Label>
                                    <select
                                        id="product_id"
                                        value={data.product_id}
                                        onChange={(e) => setData('product_id', e.target.value)}
                                        className="w-full rounded border px-3 py-2 mt-1"
                                        required
                                    >
                                        <option value="">Select product</option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.product_id && (
                                        <p className="text-red-500 text-sm mt-1">{errors.product_id}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="supplier_id">Supplier</Label>
                                    <select
                                        id="supplier_id"
                                        value={data.supplier_id}
                                        onChange={(e) => setData('supplier_id', e.target.value)}
                                        className="w-full rounded border px-3 py-2 mt-1"
                                    >
                                        <option value="">Select supplier</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.supplier_id && (
                                        <p className="text-red-500 text-sm mt-1">{errors.supplier_id}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="type">Type *</Label>
                                    <select
                                        id="type"
                                        value={data.type}
                                        onChange={(e) => setData('type', e.target.value)}
                                        className="w-full rounded border px-3 py-2 mt-1"
                                        required
                                    >
                                        <option value="received">Stock In</option>
                                        <option value="sold">Stock Out</option>
                                    </select>
                                    {errors.type && (
                                        <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="quantity">Quantity (Cartons/Lines) *</Label>
                                    <Input
                                        id="quantity"
                                        type="text"
                                        value={data.quantity}
                                        onChange={(e) => setData('quantity', e.target.value)}
                                        placeholder="e.g., 5C2L (5 cartons, 2 lines)"
                                        className="mt-1"
                                        required
                                    />
                                    {errors.quantity && (
                                        <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>
                                    )}
                                    <p className="text-gray-500 text-sm mt-1">
                                        Format: XCYL (X cartons, Y lines) or just a number for lines
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="unit_cost">Unit Cost per Carton (GH₵) *</Label>
                                    <Input
                                        id="unit_cost"
                                        type="number"
                                        step="0.01"
                                        value={data.unit_cost}
                                        onChange={(e) => setData('unit_cost', e.target.value)}
                                        placeholder="0.00"
                                        className="mt-1"
                                        required
                                    />
                                    {errors.unit_cost && (
                                        <p className="text-red-500 text-sm mt-1">{errors.unit_cost}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="notes">Notes</Label>
                                    <Input
                                        id="notes"
                                        type="text"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Optional notes"
                                        className="mt-1"
                                    />
                                    {errors.notes && (
                                        <p className="text-red-500 text-sm mt-1">{errors.notes}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4">
                                <Link
                                    href={route('stock-control.index')}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Updating...' : 'Update Stock Movement'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
