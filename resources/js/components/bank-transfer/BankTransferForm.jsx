import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function BankTransferForm({ tags, lastBalance, isOpen, setIsOpen }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        date: new Date().toISOString().split('T')[0],
        previous_balance: lastBalance.toString(),
        credit: '0',
        total_balance: lastBalance.toString(),
        debit: '0',
        tag_id: '',
        current_balance: lastBalance.toString(),
        notes: '',
    });

    // Auto-calculate balances
    useEffect(() => {
        const prevBalance = parseFloat(data.previous_balance) || 0;
        const credit = parseFloat(data.credit) || 0;
        const debit = parseFloat(data.debit) || 0;
        const totalBalance = prevBalance + credit;
        const currentBalance = totalBalance - debit;
        setData((prev) => ({
            ...prev,
            total_balance: totalBalance.toFixed(2),
            current_balance: currentBalance.toFixed(2),
        }));
    }, [data.previous_balance, data.credit, data.debit]);

    function handleSubmit(e) {
        e.preventDefault();
        post(route('bank-transfers.store'), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                reset();
                setIsOpen(false);
            },
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>Record Transfer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Record Bank Transfer</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
                            {errors.date && <div className="text-sm text-red-500">{errors.date}</div>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="previous_balance">Previous Balance</Label>
                            <Input
                                id="previous_balance"
                                type="number"
                                step="0.01"
                                value={data.previous_balance}
                                onChange={(e) => setData('previous_balance', e.target.value)}
                            />
                            {errors.previous_balance && <div className="text-sm text-red-500">{errors.previous_balance}</div>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="credit">Credit Amount</Label>
                            <Input id="credit" type="number" step="0.01" value={data.credit} onChange={(e) => setData('credit', e.target.value)} />
                            {errors.credit && <div className="text-sm text-red-500">{errors.credit}</div>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="total_balance">Total Balance</Label>
                            <Input
                                id="total_balance"
                                type="number"
                                step="0.01"
                                value={data.total_balance}
                                readOnly
                                className="cursor-not-allowed bg-gray-200"
                            />
                            {errors.total_balance && <div className="text-sm text-red-500">{errors.total_balance}</div>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="debit">Debit Amount</Label>
                            <Input id="debit" type="number" step="0.01" value={data.debit} onChange={(e) => setData('debit', e.target.value)} />
                            {errors.debit && <div className="text-sm text-red-500">{errors.debit}</div>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tag">Tag</Label>
                            <Select value={data.tag_id} onValueChange={(value) => setData('tag_id', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a tag" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tags.map((tag) => (
                                        <SelectItem key={tag.id} value={tag.id.toString()}>
                                            {tag.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.tag_id && <div className="text-sm text-red-500">{errors.tag_id}</div>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="current_balance">Current Balance</Label>
                            <Input
                                id="current_balance"
                                type="number"
                                step="0.01"
                                value={data.current_balance}
                                readOnly
                                className="cursor-not-allowed bg-gray-200"
                            />
                            {errors.current_balance && <div className="text-sm text-red-500">{errors.current_balance}</div>}
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <textarea
                                id="notes"
                                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Enter any additional notes..."
                            />
                            {errors.notes && <div className="text-sm text-red-500">{errors.notes}</div>}
                        </div>
                    </div>
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Recording...' : 'Record Transfer'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
