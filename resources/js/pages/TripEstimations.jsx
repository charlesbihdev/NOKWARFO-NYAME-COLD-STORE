import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, MapPin, TrendingUp, DollarSign, Eye } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import DateRangePicker from '@/components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AddTripModal from '@/components/trip/AddTripModal';
import EditTripModal from '@/components/trip/EditTripModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TripEstimations({ 
    trips = [], 
    overview = {},
    start_date = '',
    end_date = ''
}) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editTrip, setEditTrip] = useState(null);
    const [deleteTrip, setDeleteTrip] = useState(null);
    const [viewTrip, setViewTrip] = useState(null);
    
    // Default to current month if no dates provided
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(start_date || currentMonthStart);
    const [endDate, setEndDate] = useState(end_date || currentMonthEnd);

    // Handle date changes
    const handleDateChange = (value, type) => {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;

        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('trip-estimations.index'),
            {
                start_date: newStartDate,
                end_date: newEndDate,
                page: 1,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    function handleEdit(trip) {
        setEditTrip(trip);
    }

    function handleDeleteConfirm() {
        if (!deleteTrip) return;

        router.delete(route('trip-estimations.destroy', deleteTrip.id), {
            preserveScroll: true,
            preserveState: true,
            only: ['trips', 'overview', 'errors', 'flash'],
            onSuccess: () => setDeleteTrip(null),
        });
    }

    function handleView(trip) {
        setViewTrip(trip);
    }

    function formatCurrency(amount) {
        return `GHC ${parseFloat(amount || 0).toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }

    function getProfitColor(profit) {
        const amount = parseFloat(profit || 0);
        if (amount > 0) return 'text-green-600';
        if (amount < 0) return 'text-red-600';
        return 'text-gray-600';
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Trip Profit Estimator', href: '/trip-estimations' }]}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Trip Profit Estimator</h1>
                    <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Trip
                    </Button>
                </div>

                {/* Date Filter */}
                <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />

                {/* Overview Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overview.total_trips || 0}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Selling Price</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(overview.total_selling_price)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost Price</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(overview.total_cost_price)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getProfitColor(overview.total_gross_profit)}`}>
                                {formatCurrency(overview.total_gross_profit)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {formatCurrency(overview.total_expenses)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getProfitColor(overview.total_net_profit)}`}>
                                {formatCurrency(overview.total_net_profit)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Trips Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Trip Estimations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Cost Price</TableHead>
                                    <TableHead className="text-right">Selling Price</TableHead>
                                    <TableHead className="text-right">Gross Profit</TableHead>
                                    <TableHead className="text-right">Expenses</TableHead>
                                    <TableHead className="text-right">Net Profit</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trips.data?.length > 0 ? (
                                    trips.data.map((trip) => (
                                        <TableRow key={trip.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {trip.trip_date}
                                                </div>
                                            </TableCell>
                                            <TableCell>{trip.description || '-'}</TableCell>
                                            <TableCell>{trip.location || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{trip.items_count} items</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(trip.total_cost_price)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(trip.total_selling_price)}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono ${getProfitColor(trip.gross_profit)}`}>
                                                {formatCurrency(trip.gross_profit)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(trip.total_expenses)}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono ${getProfitColor(trip.net_profit)}`}>
                                                {formatCurrency(trip.net_profit)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleView(trip)}
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(trip)}
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setDeleteTrip(trip)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                            No trip estimations found for the selected period.
                                            <br />
                                            <Button 
                                                variant="link" 
                                                onClick={() => setIsAddModalOpen(true)}
                                                className="mt-2"
                                            >
                                                Add your first trip estimation
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {trips.data?.length > 0 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-gray-600">
                                    Showing {trips.data.length} trips
                                </div>
                                <div className="flex gap-2">
                                    {trips.prev_page_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(trips.prev_page_url, {}, { 
                                                preserveState: true, 
                                                preserveScroll: true 
                                            })}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {trips.next_page_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(trips.next_page_url, {}, { 
                                                preserveState: true, 
                                                preserveScroll: true 
                                            })}
                                        >
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modals */}
                <AddTripModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)} 
                />

                {editTrip && (
                    <EditTripModal 
                        isOpen={!!editTrip} 
                        onClose={() => setEditTrip(null)} 
                        trip={editTrip}
                    />
                )}

                {/* View Trip Modal */}
                {viewTrip && (
                    <Dialog open={!!viewTrip} onOpenChange={() => setViewTrip(null)}>
                        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Trip Details</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Trip Date</div>
                                        <div className="font-medium">{viewTrip.trip_date}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Location</div>
                                        <div className="font-medium">{viewTrip.location || '-'}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-sm text-gray-600">Description</div>
                                        <div className="font-medium">{viewTrip.description || '-'}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-sm text-gray-600">Notes</div>
                                        <div className="font-medium whitespace-pre-wrap">{viewTrip.notes || '-'}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Total Cost</div>
                                        <div className="font-mono">{formatCurrency(viewTrip.total_cost_price)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Total Selling</div>
                                        <div className="font-mono">{formatCurrency(viewTrip.total_selling_price)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Gross Profit</div>
                                        <div className={`font-mono ${getProfitColor(viewTrip.gross_profit)}`}>{formatCurrency(viewTrip.gross_profit)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Expenses</div>
                                        <div className="font-mono">{formatCurrency(viewTrip.total_expenses)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Net Profit</div>
                                        <div className={`font-mono ${getProfitColor(viewTrip.net_profit)}`}>{formatCurrency(viewTrip.net_profit)}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-semibold text-blue-900 mb-2">Items ({viewTrip.items?.length || 0})</div>
                                    <div className="space-y-2">
                                        {viewTrip.items?.length ? (
                                            viewTrip.items.map((it, idx) => (
                                                <div key={idx} className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded border">
                                                    <div className="min-w-[120px]">
                                                        <div className="text-xs text-gray-600">Product</div>
                                                        <div className="font-medium">{it.product_name}</div>
                                                    </div>
                                                    <div className="min-w-[60px]">
                                                        <div className="text-xs text-gray-600">Qty</div>
                                                        <div className="font-mono">{it.quantity}</div>
                                                    </div>
                                                    <div className="min-w-[100px]">
                                                        <div className="text-xs text-gray-600">Unit Prices</div>
                                                        <div className="font-mono text-xs">
                                                            Cost: {Number(it.unit_cost_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}<br/>
                                                            Sell: {Number(it.unit_selling_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-[100px]">
                                                        <div className="text-xs text-gray-600">Total Cost</div>
                                                        <div className="font-mono text-xs">
                                                            {Number(it.unit_cost_price * it.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-[100px]">
                                                        <div className="text-xs text-gray-600">Total Selling</div>
                                                        <div className="font-mono text-xs">
                                                            {Number(it.unit_selling_price * it.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-[100px]">
                                                        <div className="text-xs text-gray-600">Profit (GHC)</div>
                                                        <div className="font-mono text-green-600 font-bold">
                                                            {Number(((parseFloat(it.unit_selling_price || 0) - parseFloat(it.unit_cost_price || 0)) * parseFloat(it.quantity || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-500 text-sm">No items found.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deleteTrip} onOpenChange={() => setDeleteTrip(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Trip Estimation</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this trip estimation? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDeleteConfirm}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
