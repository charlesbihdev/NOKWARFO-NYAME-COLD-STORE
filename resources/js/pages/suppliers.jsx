import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { router } from '@inertiajs/react';
import { CreditCard, DollarSign, Edit, History, Mail, MapPin, Phone, Plus, Trash2, Users } from 'lucide-react';

import { useState } from 'react';

// Import our custom components
import AddSupplierModal from '../components/supplier/AddSupplierModal';
import AddCreditTransactionModal from '../components/supplier/AddCreditTransactionModal';
import EditSupplierModal from '../components/supplier/EditSupplierModal';
import SupplierBalanceCard from '../components/supplier/SupplierBalanceCard';

function Suppliers({ suppliers = [], products = [], errors = {} }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreditTransactionModalOpen, setIsCreditTransactionModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    const breadcrumbs = [{ title: 'Suppliers', href: '/suppliers' }];

    function handleEdit(supplier) {
        setEditingSupplier(supplier);
        setIsEditModalOpen(true);
    }

    function handleDelete(supplierId) {
        if (confirm('Are you sure you want to delete this supplier?')) {
            router.delete(route('suppliers.destroy', supplierId), {
                preserveScroll: true,
                preserveState: true,
                only: ['suppliers', 'flash', 'errors'],
            });
        }
    }

    function handleAddCreditTransaction(supplier) {
        setSelectedSupplier(supplier);
        setIsCreditTransactionModalOpen(true);
    }

    function handleCloseCreditTransactionModal() {
        setIsCreditTransactionModalOpen(false);
        setSelectedSupplier(null);
    }

    function handleViewTransactions(supplier) {
        router.get(route('suppliers.transactions', supplier.id));
    }

    function toggleSupplierStatus(supplier) {
        router.patch(
            route('suppliers.toggle-status', supplier.id),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['suppliers', 'flash'],
            },
        );
    }

    // Calculate summary stats using new data structure
    const summaryStats = {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter((s) => s.is_active).length,
        totalOutstanding: suppliers.reduce((sum, s) => {
            const outstanding = parseFloat(s.total_outstanding || 0) || 0;
            return sum + outstanding;
        }, 0),
        suppliersWithDebt: suppliers.filter((s) => {
            const outstanding = parseFloat(s.total_outstanding || 0) || 0;
            return outstanding > 0;
        }).length,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Supplier Management</h1>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Supplier
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Total Suppliers</p>
                                    <p className="text-2xl font-bold">{summaryStats.totalSuppliers}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <Users className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Active Suppliers</p>
                                    <p className="text-2xl font-bold">{summaryStats.activeSuppliers}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-5 w-5 text-red-500" />
                                <div>
                                    <p className="text-sm text-gray-600">Total Outstanding</p>
                                    <p className="text-2xl font-bold">GHC {summaryStats.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <CreditCard className="h-5 w-5 text-orange-500" />
                                <div>
                                    <p className="text-sm text-gray-600">With Outstanding Debt</p>
                                    <p className="text-2xl font-bold">{summaryStats.suppliersWithDebt}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Suppliers Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Supplier Directory
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier Details</TableHead>
                                    <TableHead>Contact Info</TableHead>
                                    <TableHead>Financial Status</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suppliers.map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{supplier.name}</p>
                                                {supplier.contact_person && <p className="text-sm text-gray-500">{supplier.contact_person}</p>}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-1">
                                                {supplier.phone && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Phone className="h-3 w-3" />
                                                        {supplier.phone}
                                                    </div>
                                                )}
                                                {supplier.email && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Mail className="h-3 w-3" />
                                                        {supplier.email}
                                                    </div>
                                                )}
                                                {supplier.address && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <MapPin className="h-3 w-3" />
                                                        <span className="max-w-32 truncate">{supplier.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <SupplierBalanceCard supplier={supplier} />
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={supplier.is_active ? 'default' : 'secondary'}
                                                    className="cursor-pointer"
                                                    onClick={() => toggleSupplierStatus(supplier)}
                                                >
                                                    {supplier.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                {supplier.has_outstanding_debt && (
                                                    <Badge className="text-xs bg-red-600 text-white hover:bg-red-700">
                                                        Debt
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                                                    <Edit className="h-3 w-3" />
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewTransactions(supplier)}
                                                    title="View Transactions"
                                                >
                                                    <History className="h-3 w-3" />
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleAddCreditTransaction(supplier)}
                                                    title="Add Transaction"
                                                    className="text-blue-600"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(supplier.id)}
                                                    className="text-red-600"
                                                    disabled={supplier.has_outstanding_debt}
                                                    title={
                                                        supplier.has_outstanding_debt
                                                            ? 'Cannot delete supplier with outstanding debt'
                                                            : 'Delete supplier'
                                                    }
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {suppliers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                                            No suppliers found. Add your first supplier to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Modals */}
                <AddSupplierModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} errors={errors} />

                <EditSupplierModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} supplier={editingSupplier} errors={errors} />

                <AddCreditTransactionModal
                    isOpen={isCreditTransactionModalOpen}
                    onClose={() => {
                        setIsCreditTransactionModalOpen(false);
                        setSelectedSupplier(null);
                    }}
                    supplier={selectedSupplier}
                    products={products}
                    errors={errors}
                />
            </div>
        </AppLayout>
    );
}

export default Suppliers;
