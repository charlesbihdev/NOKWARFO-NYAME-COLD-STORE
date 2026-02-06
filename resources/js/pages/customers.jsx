import ConfirmArchiveModal from '@/components/ConfirmArchiveModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { router, useForm, usePage } from '@inertiajs/react';
import { debounce } from 'lodash';
import { CreditCard, Edit, Mail, MapPin, Phone, Plus, Search, Trash2, Users, History, DollarSign, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

function Customers() {
    const { customers = [], filters = {} } = usePage().props;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        phone: '',
        email: '',
        address: '',
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Debounced search
    const debouncedSearch = useCallback(
        debounce((search) => {
            router.get(
                route('customers.index'),
                { search: search || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 400),
        [],
    );

    // Trigger search when searchTerm changes
    useEffect(() => {
        debouncedSearch(searchTerm);
    }, [searchTerm, debouncedSearch]);

    const breadcrumbs = [{ title: 'Customers', href: '/customers' }];

    function handleSubmit(e) {
        e.preventDefault();
        post(route('customers.store'), {
            onSuccess: () => {
                reset();
                setIsAddModalOpen(false);
            },
        });
    }

    function handleEdit(customer) {
        setEditingCustomer(customer);
        setData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
        });
        setIsEditModalOpen(true);
    }

    function handleUpdate(e) {
        e.preventDefault();
        put(route('customers.update', editingCustomer.id), {
            onSuccess: () => {
                reset();
                setIsEditModalOpen(false);
                setEditingCustomer(null);
            },
            preserveScroll: true,
            preserveState: true,
            only: ['customers', 'errors', 'flash'],
        });
    }

    function handleDelete(customer) {
        setCustomerToDelete(customer);
        setDeleteModalOpen(true);
    }

    function confirmDeleteCustomer() {
        if (!customerToDelete) return;
        setIsDeleting(true);
        router.delete(route('customers.destroy', customerToDelete.id), {
            preserveScroll: true,
            preserveState: true,
            only: ['customers', 'flash'],
            onFinish: () => {
                setIsDeleting(false);
                setDeleteModalOpen(false);
                setCustomerToDelete(null);
            },
        });
    }

    function getCustomerRelatedDataMessage(customer) {
        const parts = [];
        if (customer.sales_count > 0) {
            parts.push(`${customer.sales_count} sales`);
        }
        if (customer.debts_count > 0) {
            parts.push(`${customer.debts_count} debts`);
        }
        if (customer.outstanding_balance > 0) {
            parts.push(`GHC ${customer.outstanding_balance.toLocaleString()} outstanding`);
        }
        return parts.length > 0 ? parts.join(', ') : null;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Customers</h1>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Customer
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Add New Customer</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="customer-name" className="text-right">
                                        Customer Name
                                    </Label>
                                    <Input
                                        id="customer-name"
                                        className="col-span-3"
                                        placeholder="Enter customer name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="phone" className="text-right">
                                        Phone
                                    </Label>
                                    <Input
                                        id="phone"
                                        className="col-span-3"
                                        placeholder="+233 XX XXX XXXX"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="col-span-3"
                                        placeholder="customer@email.com"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="address" className="text-right">
                                        Address
                                    </Label>
                                    <Textarea
                                        id="address"
                                        className="col-span-3"
                                        placeholder="Customer address"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                    />
                                </div>

                                <Button type="submit" disabled={processing}>
                                    Add Customer
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Customer Stats */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                            <Users className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{customers.length}</div>
                            <p className="text-muted-foreground text-xs">Active customers</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                            <CreditCard className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                GH₵{customers.reduce((sum, c) => sum + parseFloat(c.outstanding_balance), 0).toFixed(2)}
                            </div>
                            <p className="text-muted-foreground text-xs">Total owed</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Customers List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Customer Directory
                        </CardTitle>
                        <div className="mt-4 flex items-center space-x-2">
                            <div className="relative flex-1 max-w-md">
                                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                                <Input
                                    placeholder="Search by name, phone, email, or address..."
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
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead>Contact Info</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Outstanding Balance</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.map((customer) => {
                                    return (
                                        <TableRow key={customer.id}>
                                            <TableCell className="font-medium">{customer.name}</TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Phone className="h-3 w-3" />
                                                        {customer.phone}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Mail className="h-3 w-3" />
                                                        {customer.email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                <div className="flex items-center gap-1 text-sm">
                                                    <MapPin className="h-3 w-3" />
                                                    {customer.address}
                                                </div>
                                            </TableCell>

                                            <TableCell className="font-medium">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={customer.outstanding_balance > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                                                            GH₵{parseFloat(customer.outstanding_balance).toFixed(2)}
                                                        </span>
                                                        {customer.has_outstanding_debt && (
                                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Total Debt: GH₵{parseFloat(customer.total_debt).toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Total Payments: GH₵{parseFloat(customer.total_payments).toFixed(2)}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => router.visit(route('customers.transactions', customer.id))}
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleDelete(customer)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        {customers.length === 0 && (
                            <div className="text-muted-foreground py-8 text-center">
                                {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Customer Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-customer-name" className="text-right">
                                Customer Name
                            </Label>
                            <Input
                                id="edit-customer-name"
                                className="col-span-3"
                                placeholder="Enter customer name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-phone" className="text-right">
                                Phone
                            </Label>
                            <Input
                                id="edit-phone"
                                className="col-span-3"
                                placeholder="+233 XX XXX XXXX"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-email" className="text-right">
                                Email
                            </Label>
                            <Input
                                id="edit-email"
                                type="email"
                                className="col-span-3"
                                placeholder="customer@email.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-address" className="text-right">
                                Address
                            </Label>
                            <Textarea
                                id="edit-address"
                                className="col-span-3"
                                placeholder="Customer address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                            />
                        </div>

                        <Button type="submit" disabled={processing}>
                            Update Customer
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete/Archive Confirmation Modal */}
            <ConfirmArchiveModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setCustomerToDelete(null);
                }}
                onConfirm={confirmDeleteCustomer}
                title="Delete Customer"
                itemName={customerToDelete?.name}
                relatedDataMessage={customerToDelete ? getCustomerRelatedDataMessage(customerToDelete) : null}
                isProcessing={isDeleting}
            />
        </AppLayout>
    );
}

export default Customers;
