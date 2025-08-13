import InputError from '@/components/InputError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { router, useForm } from '@inertiajs/react';
import { Edit, Package, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

function Products({ products = [], suppliers = [], errors = {} }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Form for product data
    const {
        data: productData,
        setData: setProductData,
        post: postProduct,
        put: putProduct,
        processing: productProcessing,
        reset: resetProduct,
        errors: productErrors,
    } = useForm({
        name: '',
        description: '',
        category: '',
        supplier_id: '',
        lines_per_carton: 1,
    });

    const breadcrumbs = [{ title: 'Products', href: '/products' }];

    // Handle product form submission
    function handleProductSubmit(e) {
        e.preventDefault();
        postProduct(route('products.store'), {
            onSuccess: () => {
                resetProduct();
                setIsAddModalOpen(false);
            },
            preserveScroll: true,
            preserveState: true,
            only: ['products', 'errors', 'flash'],
        });
    }

    // Handle product edit
    function handleEditProduct(product) {
        setEditingProduct(product);
        setProductData({
            name: product.name,
            description: product.description || '',
            category: product.category,
            supplier_id: product.supplier_id ? product.supplier_id.toString() : '',
            lines_per_carton: product.lines_per_carton,
        });
        setIsEditModalOpen(true);
    }

    // Handle product update
    function handleUpdateProduct(e) {
        e.preventDefault();
        putProduct(route('products.update', editingProduct.id), {
            onSuccess: () => {
                resetProduct();
                setIsEditModalOpen(false);
                setEditingProduct(null);
            },
            preserveScroll: true,
            preserveState: true,
            only: ['products', 'errors', 'flash'],
        });
    }

    // Handle product deletion
    function handleDeleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            router.delete(route('products.destroy', productId), {
                preserveScroll: true,
                preserveState: true,
                only: ['products', 'flash'],
            });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen space-y-6 bg-gray-100 p-6">
                {/* Info alert for users about catalog vs inventory */}
                <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4 text-blue-900">
                    <strong>Note:</strong> This page is for managing your <b>product catalog</b> only.
                    <br />
                    <ul className="mt-2 list-disc pl-6">
                        <li>Add, edit, or remove product details (name, price, supplier, etc.) here.</li>
                        <li>
                            <b>
                                All stock changes (add, remove, adjust) are done in <u>Inventory Management</u>, not here.
                            </b>
                        </li>
                        <li>Think of this as your “master list” of what you could possibly have in your store.</li>
                    </ul>
                </div>
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Products</h1>

                    {/* Add Product Modal */}
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Add New Product</DialogTitle>
                                <DialogDescription>Enter the product details. All fields marked with * are required.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleProductSubmit} className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        Product Name *
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="name"
                                            placeholder="Enter product name"
                                            value={productData.name}
                                            onChange={(e) => setProductData('name', e.target.value)}
                                            required
                                        />
                                        {productErrors.name && <InputError message={productErrors.name} className="mt-2" />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="lines_per_carton" className="text-right">
                                        Lines per Carton *
                                    </Label>
                                    <div className="col-span-3">
                                        <Select
                                            value={productData.lines_per_carton?.toString()}
                                            onValueChange={(value) => setProductData('lines_per_carton', value)}
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select lines per carton" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5].map((num) => (
                                                    <SelectItem key={num} value={num.toString()}>
                                                        {num}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {productErrors.lines_per_carton && <InputError message={productErrors.lines_per_carton} className="mt-2" />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">
                                        Description
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="description"
                                            placeholder="Product description"
                                            value={productData.description}
                                            onChange={(e) => setProductData('description', e.target.value)}
                                        />
                                        {productErrors.description && <InputError message={productErrors.description} className="mt-2" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category" className="text-right">
                                        Category *
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="category"
                                            placeholder="e.g., Frozen, Chilled, Beverages"
                                            value={productData.category}
                                            onChange={(e) => setProductData('category', e.target.value)}
                                            required
                                        />
                                        {productErrors.category && <InputError message={productErrors.category} className="mt-2" />}
                                    </div>
                                </div>
                                {/* <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="supplier" className="text-right">
                                        Supplier *
                                    </Label>
                                    <div className="col-span-3">
                                        <Select
                                            value={productData.supplier_id}
                                            onValueChange={(value) => setProductData('supplier_id', value)}
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select supplier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {productErrors.supplier_id && <InputError message={productErrors.supplier_id} className="mt-2" />}
                                    </div>
                                </div> */}
                                <Button type="submit" disabled={productProcessing}>
                                    Add Product
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Edit Product Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Product</DialogTitle>
                            <DialogDescription>Update the product information. All fields marked with * are required.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateProduct} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                    Product Name *
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="edit-name"
                                        placeholder="Enter product name"
                                        value={productData.name}
                                        onChange={(e) => setProductData('name', e.target.value)}
                                        required
                                    />
                                    {productErrors.name && <InputError message={productErrors.name} className="mt-2" />}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="lines_per_carton" className="text-right">
                                    Lines per Carton *
                                </Label>
                                <div className="col-span-3">
                                    <Select
                                        value={productData.lines_per_carton?.toString()}
                                        onValueChange={(value) => setProductData('lines_per_carton', value)}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select lines per carton" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5].map((num) => (
                                                <SelectItem key={num} value={num.toString()}>
                                                    {num}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {productErrors.lines_per_carton && <InputError message={productErrors.lines_per_carton} className="mt-2" />}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-description" className="text-right">
                                    Description
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="edit-description"
                                        placeholder="Product description"
                                        value={productData.description}
                                        onChange={(e) => setProductData('description', e.target.value)}
                                    />
                                    {productErrors.description && <InputError message={productErrors.description} className="mt-2" />}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-category" className="text-right">
                                    Category *
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="edit-category"
                                        placeholder="e.g., Frozen, Chilled, Beverages"
                                        value={productData.category}
                                        onChange={(e) => setProductData('category', e.target.value)}
                                        required
                                    />
                                    {productErrors.category && <InputError message={productErrors.category} className="mt-2" />}
                                </div>
                            </div>
                            {/* <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-supplier" className="text-right">
                                    Supplier *
                                </Label>
                                <div className="col-span-3">
                                    <Select value={productData.supplier_id} onValueChange={(value) => setProductData('supplier_id', value)} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((supplier) => (
                                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                                    {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {productErrors.supplier_id && <InputError message={productErrors.supplier_id} className="mt-2" />}
                                </div>
                            </div> */}
                            <Button type="submit" disabled={productProcessing}>
                                Update Product
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Products List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Product Directory
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Lines per Carton</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.lines_per_carton}</TableCell>
                                        <TableCell>{product.category}</TableCell>
                                        <TableCell>{product.supplier?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                                                {product.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {products.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                                            No products found. Add your first product to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

export default Products;
