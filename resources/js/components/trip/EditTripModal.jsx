import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/InputError';
import { useForm } from '@inertiajs/react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useEffect, useState } from 'react';

function EditTripModal({ isOpen, onClose, trip, errors = {} }) {
    const [editItems, setEditItems] = useState([]);

    const { data, setData, put, processing, reset, clearErrors } = useForm({
        trip_date: '',
        description: '',
        location: '',
        transportation_cost: '',
        other_expenses: '',
        notes: '',
        items: [],
    });

    // Prefill form when trip changes
    useEffect(() => {
        if (trip && isOpen) {
            // Parse the trip date properly
            const tripDate = new Date(trip.trip_date);
            const formattedDate = tripDate.toISOString().split('T')[0];

            const items = trip.items || [{ product_name: '', quantity: 1, unit_cost_price: 0, unit_selling_price: 0 }];
            
            setEditItems(items);
            setData({
                trip_date: formattedDate,
                description: trip.description || '',
                location: trip.location || '',
                transportation_cost: trip.transportation_cost || '',
                other_expenses: trip.other_expenses || '',
                notes: trip.notes || '',
                items: items,
            });
            clearErrors();
        }
    }, [trip, isOpen, clearErrors]);

    function handleSubmit(e) {
        e.preventDefault();
        
        if (!trip) return;

        // Update form data first, then submit
        setData({
            ...data,
            items: editItems
        });
        
        put(route('trip-estimations.update', trip.id), {
            onSuccess: () => {
                reset();
                clearErrors();
                onClose();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['trips', 'overview', 'errors', 'flash'],
        });
    }

    function handleClose() {
        reset();
        clearErrors();
        setEditItems([]);
        onClose();
    }

    function addEditItem() {
        const newItems = [...editItems, { product_name: '', quantity: 1, unit_cost_price: 0, unit_selling_price: 0 }];
        setEditItems(newItems);
        setData('items', newItems);
    }

    function removeEditItem(index) {
        if (editItems.length > 1) {
            const newItems = editItems.filter((_, i) => i !== index);
            setEditItems(newItems);
            setData('items', newItems);
        }
    }

    function updateEditItem(index, field, value) {
        const newItems = [...editItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditItems(newItems);
        setData('items', newItems);
    }

    if (!trip) return null;

    // Calculate totals
    const totals = editItems.reduce((acc, item) => {
        const quantity = parseInt(item.quantity) || 0;
        const unitCost = parseFloat(item.unit_cost_price) || 0;
        const unitSelling = parseFloat(item.unit_selling_price) || 0;
        
        const totalCost = quantity * unitCost;
        const totalSelling = quantity * unitSelling;
        const profit = totalSelling - totalCost;
        
        return {
            totalCost: acc.totalCost + totalCost,
            totalSelling: acc.totalSelling + totalSelling,
            grossProfit: acc.grossProfit + profit,
        };
    }, { totalCost: 0, totalSelling: 0, grossProfit: 0 });

    const transportationCost = parseFloat(data.transportation_cost) || 0;
    const otherExpenses = parseFloat(data.other_expenses) || 0;
    const totalExpenses = transportationCost + otherExpenses;
    const netProfit = totals.grossProfit - totalExpenses;

    function formatCurrency(amount) {
        return `${parseFloat(amount || 0).toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[95vh] w-[95vw] max-w-none overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Trip Estimation</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Trip Header Information */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="trip_date">Trip Date *</Label>
                            <Input
                                id="trip_date"
                                type="date"
                                value={data.trip_date}
                                onChange={(e) => setData('trip_date', e.target.value)}
                                required
                            />
                            {errors.trip_date && (
                                <InputError message={errors.trip_date} className="mt-1" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="e.g., Weekly stock purchase"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                            {errors.description && (
                                <InputError message={errors.description} className="mt-1" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                placeholder="e.g., Kumasi Market"
                                value={data.location}
                                onChange={(e) => setData('location', e.target.value)}
                            />
                            {errors.location && (
                                <InputError message={errors.location} className="mt-1" />
                            )}
                        </div>
                    </div>

                    {/* Products Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Products *</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addEditItem}
                                className="h-8"
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Product
                            </Button>
                        </div>

                      
                        {editItems.map((item, index) => {
                            const quantity = parseInt(item.quantity) || 0;
                            const unitCost = parseFloat(item.unit_cost_price) || 0;
                            const unitSelling = parseFloat(item.unit_selling_price) || 0;
                            const totalCost = quantity * unitCost;
                            const totalSelling = quantity * unitSelling;
                            const profit = totalSelling - totalCost;

                            return (
                                <div key={index} className="rounded-lg border bg-white shadow-sm">
                                    {/* Mobile Layout - Stacked */}
                                    <div className="block lg:hidden p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-gray-700">Product {index + 1}</h4>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeEditItem(index)}
                                                disabled={editItems.length === 1}
                                                className="h-8 w-8 p-0 text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-sm font-medium">Product Name</Label>
                                                <Input
                                                    placeholder="Enter product name"
                                                    value={item.product_name}
                                                    onChange={(e) => updateEditItem(index, 'product_name', e.target.value)}
                                                    required
                                                    className="mt-1"
                                                />
                                                {errors[`items.${index}.product_name`] && (
                                                    <InputError message={errors[`items.${index}.product_name`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-sm font-medium">Quantity</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateEditItem(index, 'quantity', e.target.value)}
                                                        min="1"
                                                        required
                                                        className="mt-1 w-full text-center text-lg font-medium h-12"
                                                    />
                                                    {errors[`items.${index}.quantity`] && (
                                                        <InputError message={errors[`items.${index}.quantity`]} className="mt-1" />
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <Label className="text-sm font-medium">Unit Cost (GHC)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={item.unit_cost_price}
                                                        onChange={(e) => updateEditItem(index, 'unit_cost_price', e.target.value)}
                                                        min="0"
                                                        required
                                                        className="mt-1"
                                                    />
                                                    {errors[`items.${index}.unit_cost_price`] && (
                                                        <InputError message={errors[`items.${index}.unit_cost_price`]} className="mt-1" />
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-sm font-medium">Total Cost</Label>
                                                    <div className="mt-1 flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-700 items-center">
                                                        {formatCurrency(totalCost)}
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <Label className="text-sm font-medium">Unit Selling (GHC)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={item.unit_selling_price}
                                                        onChange={(e) => updateEditItem(index, 'unit_selling_price', e.target.value)}
                                                        min="0"
                                                        required
                                                        className="mt-1"
                                                    />
                                                    {errors[`items.${index}.unit_selling_price`] && (
                                                        <InputError message={errors[`items.${index}.unit_selling_price`]} className="mt-1" />
                                                    )}
                                                </div>
                                            </div>
                                            
                                                                                         <div>
                                                 <Label className="text-sm font-medium">Profit</Label>
                                                 <div className={`mt-1 flex h-16 w-full rounded-md border-2 px-4 py-3 text-lg font-bold items-center justify-center ${
                                                     profit > 0 ? 'bg-green-50 text-green-700 border-green-300' : 
                                                     profit < 0 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-gray-50 text-gray-700 border-gray-300'
                                                 }`}>
                                                     {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                                                 </div>
                                             </div>
                                        </div>
                                    </div>

                                    {/* Desktop Layout - Compact with shared rows (XL screens) */}
                                    <div className="hidden xl:block xl:p-4 xl:space-y-3">
                                        <div className="grid grid-cols-4 gap-4 items-end">
                                            <div className="col-span-2">
                                                <Label className="text-sm font-medium mb-2 block">Product Name</Label>
                                                <Input
                                                    placeholder="Enter product name"
                                                    value={item.product_name}
                                                    onChange={(e) => updateEditItem(index, 'product_name', e.target.value)}
                                                    required
                                                    className="w-full h-12"
                                                />
                                                {errors[`items.${index}.product_name`] && (
                                                    <InputError message={errors[`items.${index}.product_name`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div className="col-span-2">
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-gray-700 mb-2">Profit</div>
                                                    <div className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-xl font-bold h-12 ${
                                                        profit > 0 ? 'bg-green-100 text-green-800 border-2 border-green-300' : 
                                                        profit < 0 ? 'bg-red-100 text-red-800 border-2 border-red-300' : 'bg-gray-100 text-gray-800 border-2 border-gray-300'
                                                    }`}>
                                                        {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid gap-4" style={{gridTemplateColumns: '1fr 1fr 1fr 40px'}}>
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Quantity</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateEditItem(index, 'quantity', e.target.value)}
                                                    min="1"
                                                    required
                                                    className="text-center w-full text-lg font-bold h-12"
                                                />
                                                {errors[`items.${index}.quantity`] && (
                                                    <InputError message={errors[`items.${index}.quantity`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Unit Cost</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={item.unit_cost_price}
                                                    onChange={(e) => updateEditItem(index, 'unit_cost_price', e.target.value)}
                                                    min="0"
                                                    required
                                                    className="w-full h-12"
                                                />
                                                <div className="text-center text-xs text-gray-600 mt-1">
                                                    Total: {formatCurrency(quantity * unitCost)}
                                                </div>
                                                {errors[`items.${index}.unit_cost_price`] && (
                                                    <InputError message={errors[`items.${index}.unit_cost_price`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Unit Selling</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={item.unit_selling_price}
                                                    onChange={(e) => updateEditItem(index, 'unit_selling_price', e.target.value)}
                                                    min="0"
                                                    required
                                                    className="w-full h-12"
                                                />
                                                <div className="text-center text-xs text-gray-600 mt-1">
                                                    Total: {formatCurrency(quantity * unitSelling)}
                                                </div>
                                                {errors[`items.${index}.unit_selling_price`] && (
                                                    <InputError message={errors[`items.${index}.unit_selling_price`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div className="flex justify-center items-end h-12">
                                                <Trash2 
                                                    className={`h-5 w-5 cursor-pointer transition-colors ${
                                                        editItems.length === 1 
                                                            ? 'text-gray-400 cursor-not-allowed' 
                                                            : 'text-red-600 hover:text-red-800'
                                                    }`}
                                                    onClick={() => editItems.length > 1 && removeEditItem(index)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tablet Layout - Compact with shared rows (LG screens) */}
                                    <div className="hidden lg:block xl:hidden lg:p-3 lg:space-y-3">
                                        <div className="grid grid-cols-2 gap-3 items-end">
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Product Name</Label>
                                                <Input
                                                    placeholder="Enter product name"
                                                    value={item.product_name}
                                                    onChange={(e) => updateEditItem(index, 'product_name', e.target.value)}
                                                    required
                                                    className="w-full h-10"
                                                />
                                                {errors[`items.${index}.product_name`] && (
                                                    <InputError message={errors[`items.${index}.product_name`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div>
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-gray-700 mb-2">Profit</div>
                                                    <div className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-base font-bold h-10 w-full ${
                                                        profit > 0 ? 'bg-green-100 text-green-800 border-2 border-green-300' : 
                                                        profit < 0 ? 'bg-red-100 text-red-800 border-2 border-red-300' : 'bg-gray-100 text-gray-800 border-2 border-gray-300'
                                                    }`}>
                                                        {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid gap-3" style={{gridTemplateColumns: '1fr 1fr 1fr 32px'}}>
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Quantity</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateEditItem(index, 'quantity', e.target.value)}
                                                    min="1"
                                                    required
                                                    className="text-center w-full text-base font-medium h-10"
                                                />
                                                {errors[`items.${index}.quantity`] && (
                                                    <InputError message={errors[`items.${index}.quantity`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Unit Cost</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={item.unit_cost_price}
                                                    onChange={(e) => updateEditItem(index, 'unit_cost_price', e.target.value)}
                                                    min="0"
                                                    required
                                                    className="w-full h-10"
                                                />
                                                <div className="text-center text-xs text-gray-600 mt-1">
                                                    {formatCurrency(quantity * unitCost)}
                                                </div>
                                                {errors[`items.${index}.unit_cost_price`] && (
                                                    <InputError message={errors[`items.${index}.unit_cost_price`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Unit Selling</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={item.unit_selling_price}
                                                    onChange={(e) => updateEditItem(index, 'unit_selling_price', e.target.value)}
                                                    min="0"
                                                    required
                                                    className="w-full h-10"
                                                />
                                                <div className="text-center text-xs text-gray-600 mt-1">
                                                    {formatCurrency(quantity * unitSelling)}
                                                </div>
                                                {errors[`items.${index}.unit_selling_price`] && (
                                                    <InputError message={errors[`items.${index}.unit_selling_price`]} className="mt-1" />
                                                )}
                                            </div>
                                            
                                            <div className="flex justify-center items-end h-10">
                                                <Trash2 
                                                    className={`h-4 w-4 cursor-pointer transition-colors ${
                                                        editItems.length === 1 
                                                            ? 'text-gray-400 cursor-not-allowed' 
                                                            : 'text-red-600 hover:text-red-800'
                                                    }`}
                                                    onClick={() => editItems.length > 1 && removeEditItem(index)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Trip Expenses */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <Label className="text-base font-semibold">Trip Expenses</Label>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="transportation_cost">Transportation Cost (GHC)</Label>
                                <Input
                                    id="transportation_cost"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={data.transportation_cost}
                                    onChange={(e) => setData('transportation_cost', e.target.value)}
                                />
                                {errors.transportation_cost && (
                                    <InputError message={errors.transportation_cost} className="mt-1" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="other_expenses">Other Expenses (GHC)</Label>
                                <Input
                                    id="other_expenses"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={data.other_expenses}
                                    onChange={(e) => setData('other_expenses', e.target.value)}
                                />
                                {errors.other_expenses && (
                                    <InputError message={errors.other_expenses} className="mt-1" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Trip Summary */}
                    <div className="space-y-4 rounded-lg bg-blue-50 p-4">
                        <div className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-blue-600" />
                            <Label className="text-base font-semibold text-blue-900">Trip Summary</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                            <div>
                                <div className="text-sm text-gray-600">Total Cost</div>
                                <div className="text-lg font-semibold text-red-600">
                                    {formatCurrency(totals.totalCost)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Total Selling</div>
                                <div className="text-lg font-semibold text-green-600">
                                    {formatCurrency(totals.totalSelling)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Gross Profit</div>
                                <div className={`text-lg font-semibold ${
                                    totals.grossProfit > 0 ? 'text-green-600' : 
                                    totals.grossProfit < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                    {formatCurrency(totals.grossProfit)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Total Expenses</div>
                                <div className="text-lg font-semibold text-orange-600">
                                    {formatCurrency(totalExpenses)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Net Profit</div>
                                <div className={`text-lg font-semibold ${
                                    netProfit > 0 ? 'text-green-600' : 
                                    netProfit < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                    {formatCurrency(netProfit)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Additional notes about this trip"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                        />
                        {errors.notes && (
                            <InputError message={errors.notes} className="mt-1" />
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Trip Estimation'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default EditTripModal;
