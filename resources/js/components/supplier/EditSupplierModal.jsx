import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

function EditSupplierModal({ isOpen, onClose, supplier, errors = {} }) {
    const { data, setData, put, processing, reset } = useForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        additional_info: '',
    });

    useEffect(() => {
        if (supplier) {
            setData({
                name: supplier.name || '',
                contact_person: supplier.contact_person || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                additional_info: supplier.additional_info || '',
            });
        }
    }, [supplier]);

    function handleSubmit() {
        if (!supplier) return;

        put(route('suppliers.update', supplier.id), {
            onSuccess: () => {
                reset();
                onClose();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['suppliers', 'errors', 'flash'],
        });
    }

    if (!supplier) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Supplier</DialogTitle>
                    <DialogDescription>Update the supplier information. All fields marked with * are required.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Supplier Name *</Label>
                            <Input
                                id="edit-name"
                                placeholder="Enter supplier name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <InputError message={errors.name} className="mt-1" />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-contact_person">Contact Person</Label>
                            <Input
                                id="edit-contact_person"
                                placeholder="Contact person name"
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                            />
                            {errors.contact_person && <InputError message={errors.contact_person} className="mt-1" />}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">Phone Number</Label>
                            <Input
                                id="edit-phone"
                                placeholder="+233 XX XXX XXXX"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                type="tel"
                            />
                            {errors.phone && <InputError message={errors.phone} className="mt-1" />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email Address</Label>
                            <Input
                                id="edit-email"
                                placeholder="supplier@example.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                type="email"
                            />
                            {errors.email && <InputError message={errors.email} className="mt-1" />}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-address">Address</Label>
                        <Textarea
                            id="edit-address"
                            placeholder="Business address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            rows={2}
                        />
                        {errors.address && <InputError message={errors.address} className="mt-1" />}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-additional_info">Additional Information</Label>
                        <Textarea
                            id="edit-additional_info"
                            placeholder="Any additional notes or information"
                            value={data.additional_info}
                            onChange={(e) => setData('additional_info', e.target.value)}
                            rows={3}
                        />
                        {errors.additional_info && <InputError message={errors.additional_info} className="mt-1" />}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={processing}>
                            {processing ? 'Updating...' : 'Update Supplier'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default EditSupplierModal;
