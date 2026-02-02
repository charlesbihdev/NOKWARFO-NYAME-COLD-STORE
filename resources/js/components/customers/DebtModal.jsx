import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';

export default function DebtModal({ customer, open, onOpenChange }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        debt_date: new Date().toISOString().split('T')[0],
        description: '',
        notes: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('customers.debts.store', customer.id), {
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Debt
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Debt Record</DialogTitle>
                    <DialogDescription>Record a debt entry for {customer.name}. This can be a previous debt or any outstanding amount.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="amount">
                                Amount <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                placeholder="0.00"
                                required
                            />
                            {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
                        </div>

                        <div>
                            <Label htmlFor="debt_date">
                                Debt Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="debt_date"
                                type="date"
                                value={data.debt_date}
                                onChange={(e) => setData('debt_date', e.target.value)}
                                required
                            />
                            {errors.debt_date && <p className="mt-1 text-sm text-red-500">{errors.debt_date}</p>}
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                type="text"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Brief description of the debt..."
                                maxLength={500}
                            />
                            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                        </div>

                        <div>
                            <Label htmlFor="notes">Additional Notes</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Any additional notes or details..."
                                rows={3}
                                maxLength={1000}
                            />
                            {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes}</p>}
                        </div>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-red-600 hover:bg-red-700">
                            {processing ? 'Adding...' : 'Add Debt'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
