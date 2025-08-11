import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';

function AddSupplierModal({ isOpen, onClose, errors = {} }) {
    const { data, setData, post, processing, reset } = useForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        additional_info: '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        post(route('suppliers.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
            preserveScroll: true,
            preserveState: true,
            only: ['suppliers', 'errors', 'flash'],
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                    <DialogDescription>Enter the details for the new supplier. All fields marked with * are required.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Supplier Name *</Label>
                            <Input
                                id="name"
                                placeholder="Enter supplier name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <InputError message={errors.name} className="mt-1" />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact_person">Contact Person</Label>
                            <Input
                                id="contact_person"
                                placeholder="Contact person name"
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                                required
                            />
                            {errors.contact_person && <InputError message={errors.contact_person} className="mt-1" />}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                placeholder="+233 XX XXX XXXX"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                type="tel"
                            />
                            {errors.phone && <InputError message={errors.phone} className="mt-1" />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                placeholder="supplier@example.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                type="email"
                            />
                            {errors.email && <InputError message={errors.email} className="mt-1" />}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                            id="address"
                            placeholder="Business address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            rows={2}
                        />
                        {errors.address && <InputError message={errors.address} className="mt-1" />}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="additional_info">Additional Information</Label>
                        <Textarea
                            id="additional_info"
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
                            {processing ? 'Creating...' : 'Add Supplier'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default AddSupplierModal;
