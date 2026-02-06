import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import DateRangePicker from '@/components/DateRangePicker';
import { Link, router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Calendar, DollarSign, Edit, Eye, Plus, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';

const DENOMINATIONS = [
    { key: 'note_200', value: 200, label: 'GH₵200' },
    { key: 'note_100', value: 100, label: 'GH₵100' },
    { key: 'note_50', value: 50, label: 'GH₵50' },
    { key: 'note_20', value: 20, label: 'GH₵20' },
    { key: 'note_10', value: 10, label: 'GH₵10' },
    { key: 'note_5', value: 5, label: 'GH₵5' },
];

// Form Modal Component - defined outside to prevent re-renders
function CashNoteFormModal({ isOpen, onClose, onSubmit, title, submitLabel, data, setData, errors, processing }) {
    // Calculate running total from form data
    const runningTotal = DENOMINATIONS.reduce((sum, denom) => {
        return sum + (parseInt(data[denom.key]) || 0) * denom.value;
    }, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pt-2">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="record_date">Date</Label>
                        <Input
                            id="record_date"
                            type="date"
                            value={data.record_date}
                            onChange={(e) => setData('record_date', e.target.value)}
                            required
                        />
                        {errors.record_date && <p className="text-sm text-red-500 mt-1">{errors.record_date}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {DENOMINATIONS.map((denom) => (
                            <div key={denom.key}>
                                <Label htmlFor={denom.key}>{denom.label}</Label>
                                <Input
                                    id={denom.key}
                                    type="number"
                                    min="0"
                                    value={data[denom.key] == null || data[denom.key] === 0 ? '' : Number(data[denom.key])}
                                    onChange={(e) =>
                                        setData(
                                            denom.key,
                                            e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                                        )
                                    }
                                    className="text-right"
                                    placeholder=""
                                />
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg bg-blue-50 p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-700">Running Total</span>
                            <span className="text-2xl font-bold text-blue-700">
                                GH₵{runningTotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Any additional notes..."
                            rows={2}
                        />
                    </div>

                    <div className="pt-2 pb-2">
                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Saving...' : submitLabel}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CashNotes({ today, today_formatted, records, analytics, filters }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [filterDate, setFilterDate] = useState(filters?.filter_date || '');
    
    // Date range for analytics
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        record_date: new Date().toISOString().split('T')[0],
        note_200: 0,
        note_100: 0,
        note_50: 0,
        note_20: 0,
        note_10: 0,
        note_5: 0,
        notes: '',
    });

    const breadcrumbs = [{ title: 'Cash Notes', href: '/cash-notes' }];

    // Handlers
    function handleOpenAdd() {
        reset();
        setData({
            record_date: new Date().toISOString().split('T')[0],
            note_200: 0,
            note_100: 0,
            note_50: 0,
            note_20: 0,
            note_10: 0,
            note_5: 0,
            notes: '',
        });
        setIsAddModalOpen(true);
    }

    function handleOpenEdit(record) {
        setSelectedRecord(record);
        setData({
            record_date: record.record_date,
            note_200: record.note_200,
            note_100: record.note_100,
            note_50: record.note_50,
            note_20: record.note_20,
            note_10: record.note_10,
            note_5: record.note_5,
            notes: record.notes || '',
        });
        setIsEditModalOpen(true);
    }

    function handleOpenView(record) {
        setSelectedRecord(record);
        setIsViewModalOpen(true);
    }

    function handleSubmit(e) {
        e.preventDefault();
        post(route('cash-notes.store'), {
            onSuccess: () => {
                reset();
                setIsAddModalOpen(false);
            },
        });
    }

    function handleUpdate(e) {
        e.preventDefault();
        put(route('cash-notes.update', selectedRecord.id), {
            onSuccess: () => {
                reset();
                setIsEditModalOpen(false);
                setSelectedRecord(null);
            },
        });
    }

    function handleDelete(id) {
        if (confirm('Are you sure you want to delete this record?')) {
            router.delete(route('cash-notes.destroy', id), {
                preserveScroll: true,
            });
        }
    }

    function handleFilterChange(date) {
        setFilterDate(date);
        router.get(
            route('cash-notes.index'),
            { 
                filter_date: date || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    }

    // Handle date range change for analytics
    function handleDateRangeChange(value, type) {
        const newStartDate = type === 'start' ? value : startDate;
        const newEndDate = type === 'end' ? value : endDate;
        
        if (type === 'start') setStartDate(value);
        if (type === 'end') setEndDate(value);

        router.get(
            route('cash-notes.index'),
            { 
                start_date: newStartDate || undefined,
                end_date: newEndDate || undefined,
                filter_date: filterDate || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    }

    function handleEditToday() {
        if (today) {
            handleOpenEdit(today);
        } else {
            handleOpenAdd();
        }
    }

    // Format compact breakdown for today's summary
    function formatCompactBreakdown(record) {
        if (!record) return '';
        const parts = [];
        DENOMINATIONS.forEach((denom) => {
            const count = record[denom.key];
            if (count > 0) {
                parts.push(`${denom.value}×${count}`);
            }
        });
        return parts.join(' • ') || 'No notes recorded';
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Cash Notes</h1>
                    <Button onClick={handleOpenAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Cash Notes
                    </Button>
                </div>

                {/* Today's Summary - Hero Section */}
                <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="rounded-full bg-blue-100 p-3">
                                    <Wallet className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 uppercase tracking-wide">Today's Total</p>
                                    <p className="text-xs text-gray-400 mb-1">{today_formatted}</p>
                                    <p className="text-4xl font-bold text-gray-900">
                                        GH₵{today ? parseFloat(today.total).toLocaleString('en-GH', { minimumFractionDigits: 2 }) : '0.00'}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {today ? formatCompactBreakdown(today) : 'No cash notes recorded today'}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={handleEditToday} variant={today ? 'outline' : 'default'}>
                                {today ? (
                                    <>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Today
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Record Today
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Date Range Picker for Analytics */}
                <DateRangePicker 
                    startDate={startDate} 
                    endDate={endDate} 
                    onChange={handleDateRangeChange} 
                />

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Period Total</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                GH₵{parseFloat(analytics.period_total || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {startDate && endDate ? `${startDate} to ${endDate}` : 'Select date range'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                GH₵{parseFloat(analytics.monthly_total || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-muted-foreground text-xs">This month</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Highest Day</CardTitle>
                            <ArrowUp className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">
                                {analytics.highest_day
                                    ? `GH₵${parseFloat(analytics.highest_day.total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
                                    : 'N/A'}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {analytics.highest_day ? analytics.highest_day.date : 'No records yet'}
                            </p>
                            {startDate && endDate && (
                                <p className="text-muted-foreground text-xs mt-1">
                                    {startDate} to {endDate}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Lowest Day</CardTitle>
                            <ArrowDown className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {analytics.lowest_day
                                    ? `GH₵${parseFloat(analytics.lowest_day.total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
                                    : 'N/A'}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {analytics.lowest_day ? analytics.lowest_day.date : 'No records yet'}
                            </p>
                            {startDate && endDate && (
                                <p className="text-muted-foreground text-xs mt-1">
                                    {startDate} to {endDate}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Records Table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Cash Notes History
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="filter_date" className="text-sm whitespace-nowrap">
                                    Filter by date:
                                </Label>
                                <Input
                                    id="filter_date"
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => handleFilterChange(e.target.value)}
                                    className="w-auto"
                                />
                                {filterDate && (
                                    <Button variant="ghost" size="sm" onClick={() => handleFilterChange('')}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {filterDate ? 'No records found for this date.' : 'No cash notes recorded yet.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.data.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">{record.formatted_date}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                GH₵{parseFloat(record.total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate text-gray-500">
                                                {record.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenView(record)}
                                                        title="View breakdown"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenEdit(record)}
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(record.id)}
                                                        title="Delete"
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {records.data.length > 0 && (
                            <div className="mt-4 flex items-center justify-center gap-4">
                                {records.prev_page_url && (
                                    <Link
                                        preserveScroll
                                        preserveState
                                        href={records.prev_page_url}
                                        className="rounded border px-4 py-2 hover:bg-gray-100"
                                    >
                                        « Previous
                                    </Link>
                                )}
                                <span className="px-4 py-2 font-medium">Page {records.current_page}</span>
                                {records.next_page_url && (
                                    <Link
                                        preserveScroll
                                        preserveState
                                        href={records.next_page_url}
                                        className="rounded border px-4 py-2 hover:bg-gray-100"
                                    >
                                        Next »
                                    </Link>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Add Modal */}
                <CashNoteFormModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={handleSubmit}
                    title="Record Cash Notes"
                    submitLabel="Save Cash Notes"
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                />

                {/* Edit Modal */}
                <CashNoteFormModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedRecord(null);
                    }}
                    onSubmit={handleUpdate}
                    title="Edit Cash Notes"
                    submitLabel="Update Cash Notes"
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                />

                {/* View Modal - Breakdown */}
                <Dialog open={isViewModalOpen} onOpenChange={() => setIsViewModalOpen(false)}>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="pt-2">
                            <DialogTitle>Cash Notes Breakdown</DialogTitle>
                        </DialogHeader>
                        {selectedRecord && (
                            <div className="space-y-4 py-4">
                                <div className="text-center border-b pb-4">
                                    <p className="text-sm text-gray-500">{selectedRecord.full_date}</p>
                                </div>

                                <div className="space-y-2">
                                    {DENOMINATIONS.map((denom) => {
                                        const count = selectedRecord[denom.key];
                                        const subtotal = count * denom.value;
                                        return (
                                            <div
                                                key={denom.key}
                                                className="flex items-center justify-between py-2 border-b border-gray-100"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="font-medium text-gray-700 w-16">{denom.label}</span>
                                                    <span className="text-gray-500">×</span>
                                                    <span className="font-medium w-8 text-center">{count}</span>
                                                </div>
                                                <span className="font-medium text-gray-900">
                                                    GH₵{subtotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t-2 border-gray-300">
                                    <span className="text-lg font-bold">Total</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        GH₵{parseFloat(selectedRecord.total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {selectedRecord.notes && (
                                    <div className="pt-4 border-t">
                                        <p className="text-sm text-gray-500 mb-1">Notes</p>
                                        <p className="text-gray-700">{selectedRecord.notes}</p>
                                    </div>
                                )}

                                <div className="pt-2 pb-2">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setIsViewModalOpen(false);
                                            handleOpenEdit(selectedRecord);
                                        }}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit This Record
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

export default CashNotes;
