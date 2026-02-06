import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { debounce } from 'lodash';
import { Archive, Edit, Eye, PiggyBank, Plus, Search, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

function Savings() {
    const { savings = { data: [] }, filters = {}, summary = {} } = usePage().props;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSaving, setEditingSaving] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    const debouncedSearch = useCallback(
        debounce((search) => {
            router.get(
                route('savings.index'),
                { search: search || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 400),
        [],
    );

    useEffect(() => {
        debouncedSearch(searchTerm);
    }, [searchTerm, debouncedSearch]);

    const breadcrumbs = [{ title: 'Savings', href: '/savings' }];

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS',
        }).format(amount);
    };

    const getBalanceStatusBadge = (status) => {
        switch (status) {
            case 'positive':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Positive</Badge>;
            case 'negative':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Zero</Badge>;
        }
    };

    function handleSubmit(e) {
        e.preventDefault();
        post(route('savings.store'), {
            onSuccess: () => {
                reset();
                setIsAddModalOpen(false);
            },
        });
    }

    function handleEdit(saving) {
        setEditingSaving(saving);
        setData({
            name: saving.name,
            description: saving.description || '',
            date: saving.date,
        });
        setIsEditModalOpen(true);
    }

    function handleUpdate(e) {
        e.preventDefault();
        put(route('savings.update', editingSaving.id), {
            onSuccess: () => {
                reset();
                setIsEditModalOpen(false);
                setEditingSaving(null);
            },
            preserveScroll: true,
            preserveState: true,
        });
    }

    function handleArchive(saving) {
        const action = saving.is_active ? 'archive' : 'restore';
        if (confirm(`Are you sure you want to ${action} this savings?`)) {
            router.patch(route('savings.archive', saving.id), {}, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Savings" />
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Savings</h1>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Savings
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md space-y-6">
                            <DialogHeader>
                                <DialogTitle>Create New Savings</DialogTitle>
                                <DialogDescription>Add a new savings to track credits and debits.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">
                                            Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            placeholder="Enter savings name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                        />
                                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Optional description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={3}
                                        />
                                        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date">
                                            Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={data.date}
                                            onChange={(e) => setData('date', e.target.value)}
                                            required
                                        />
                                        {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Creating...' : 'Create Savings'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                            <PiggyBank className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold">{summary.total_accounts || 0}</div>
                            <p className="text-muted-foreground text-xs">Active savings</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                            <Wallet className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-lg font-bold ${(summary.total_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(summary.total_balance || 0)}
                            </div>
                            <p className="text-muted-foreground text-xs">Combined balance across all savings</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Savings List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PiggyBank className="h-5 w-5" />
                            Savings 
                        </CardTitle>
                        <div className="mt-4 flex items-center space-x-2">
                            <div className="relative max-w-md flex-1">
                                <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
                                <Input
                                    placeholder="Search by name or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Credits</TableHead>
                                    <TableHead className="text-right">Debits</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {savings.data.map((saving) => (
                                    <TableRow key={saving.id} className={!saving.is_active ? 'opacity-50' : ''}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{saving.name}</div>
                                                {saving.description && (
                                                    <div className="max-w-xs truncate text-sm text-gray-500">{saving.description}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{saving.date}</TableCell>
                                        <TableCell className="text-right font-medium text-green-600">
                                            {formatCurrency(saving.total_credits)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-red-600">
                                            {formatCurrency(saving.total_debits)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={`font-bold ${saving.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(saving.balance)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{getBalanceStatusBadge(saving.balance_status)}</TableCell>
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.visit(route('savings.show', saving.id))}
                                                    className="text-blue-600 hover:text-blue-700"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(saving)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleArchive(saving)}
                                                    className={saving.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                                                >
                                                    <Archive className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {savings.data.length === 0 && (
                            <div className="text-muted-foreground py-8 text-center">
                                {searchTerm ? 'No savings found matching your search.' : 'No savings found. Create your first one!'}
                            </div>
                        )}

                        {/* Pagination */}
                        {(savings.prev_page_url || savings.next_page_url) && (
                            <div className="mt-6 flex items-center justify-center gap-4">
                                {savings.prev_page_url ? (
                                    <Link
                                        href={savings.prev_page_url}
                                        preserveState
                                        preserveScroll
                                        className="rounded border bg-white px-3 py-1 hover:bg-gray-100"
                                    >
                                        Previous
                                    </Link>
                                ) : (
                                    <span className="cursor-not-allowed rounded border bg-gray-200 px-3 py-1">Previous</span>
                                )}
                                <span className="rounded border px-3 py-1">{savings.current_page}</span>
                                {savings.next_page_url ? (
                                    <Link
                                        href={savings.next_page_url}
                                        preserveState
                                        preserveScroll
                                        className="rounded border bg-white px-3 py-1 hover:bg-gray-100"
                                    >
                                        Next
                                    </Link>
                                ) : (
                                    <span className="cursor-not-allowed rounded border bg-gray-200 px-3 py-1">Next</span>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Savings Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-md space-y-6">
                    <DialogHeader>
                        <DialogTitle>Edit Savings</DialogTitle>
                        <DialogDescription>Update the savings details.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">
                                    Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-name"
                                    placeholder="Enter savings name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    placeholder="Optional description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                />
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update Savings'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

export default Savings;
