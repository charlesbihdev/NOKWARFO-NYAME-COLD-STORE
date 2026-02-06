import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { router, usePage } from '@inertiajs/react';
import { Archive, Package, RotateCcw, Users } from 'lucide-react';

function ArchivePage() {
    const { products = [], customers = [], suppliers = [] } = usePage().props;

    const breadcrumbs = [{ title: 'Archive', href: '/archive' }];

    function handleRestoreProduct(productId) {
        if (confirm('Are you sure you want to restore this product?')) {
            router.patch(route('archive.restore-product', productId), {}, {
                preserveScroll: true,
                preserveState: true,
                only: ['products', 'customers', 'suppliers', 'flash'],
            });
        }
    }

    function handleRestoreCustomer(customerId) {
        if (confirm('Are you sure you want to restore this customer?')) {
            router.patch(route('archive.restore-customer', customerId), {}, {
                preserveScroll: true,
                preserveState: true,
                only: ['products', 'customers', 'suppliers', 'flash'],
            });
        }
    }

    function handleRestoreSupplier(supplierId) {
        if (confirm('Are you sure you want to restore this supplier?')) {
            router.patch(route('archive.restore-supplier', supplierId), {}, {
                preserveScroll: true,
                preserveState: true,
                only: ['products', 'customers', 'suppliers', 'flash'],
            });
        }
    }

    const totalArchived = products.length + customers.length + suppliers.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Archive</h1>
                        <p className="text-muted-foreground">View and restore archived items</p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Archive className="h-5 w-5" />
                        <span>{totalArchived} archived items</span>
                    </div>
                </div>

                <Tabs defaultValue="products" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="products" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Products ({products.length})
                        </TabsTrigger>
                        <TabsTrigger value="customers" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Customers ({customers.length})
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Suppliers ({suppliers.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="products">
                        <Card>
                            <CardHeader>
                                <CardTitle>Archived Products</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {products.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No archived products</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Supplier</TableHead>
                                                <TableHead>Sales Count</TableHead>
                                                <TableHead>Stock Movements</TableHead>
                                                <TableHead>Archived Date</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.map((product) => (
                                                <TableRow key={product.id}>
                                                    <TableCell className="font-medium">{product.name}</TableCell>
                                                    <TableCell>{product.category || 'N/A'}</TableCell>
                                                    <TableCell>{product.supplier_name || 'N/A'}</TableCell>
                                                    <TableCell>{product.sale_items_count}</TableCell>
                                                    <TableCell>{product.stock_movements_count}</TableCell>
                                                    <TableCell>{product.updated_at}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRestoreProduct(product.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <RotateCcw className="h-4 w-4 mr-1" />
                                                            Restore
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="customers">
                        <Card>
                            <CardHeader>
                                <CardTitle>Archived Customers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {customers.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No archived customers</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Sales Count</TableHead>
                                                <TableHead>Outstanding Balance</TableHead>
                                                <TableHead>Archived Date</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {customers.map((customer) => (
                                                <TableRow key={customer.id}>
                                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                                    <TableCell>{customer.phone || 'N/A'}</TableCell>
                                                    <TableCell>{customer.email || 'N/A'}</TableCell>
                                                    <TableCell>{customer.sales_count}</TableCell>
                                                    <TableCell>
                                                        {customer.outstanding_balance > 0 ? (
                                                            <span className="text-red-600 font-medium">
                                                                GHC {customer.outstanding_balance.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            'GHC 0'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{customer.updated_at}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRestoreCustomer(customer.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <RotateCcw className="h-4 w-4 mr-1" />
                                                            Restore
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="suppliers">
                        <Card>
                            <CardHeader>
                                <CardTitle>Archived Suppliers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {suppliers.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No archived suppliers</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Contact Person</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Transactions</TableHead>
                                                <TableHead>Payments</TableHead>
                                                <TableHead>Outstanding</TableHead>
                                                <TableHead>Archived Date</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {suppliers.map((supplier) => (
                                                <TableRow key={supplier.id}>
                                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                                    <TableCell>{supplier.contact_person || 'N/A'}</TableCell>
                                                    <TableCell>{supplier.phone || 'N/A'}</TableCell>
                                                    <TableCell>{supplier.transactions_count}</TableCell>
                                                    <TableCell>{supplier.payments_count}</TableCell>
                                                    <TableCell>
                                                        {supplier.total_outstanding > 0 ? (
                                                            <span className="text-red-600 font-medium">
                                                                GHC {supplier.total_outstanding.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            'GHC 0'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{supplier.updated_at}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRestoreSupplier(supplier.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <RotateCcw className="h-4 w-4 mr-1" />
                                                            Restore
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

export default ArchivePage;
