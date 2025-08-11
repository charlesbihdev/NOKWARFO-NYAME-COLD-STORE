import { useForm, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, DollarSign } from "lucide-react"
import AppLayout from '@/layouts/app-layout';

function DailyCollections() {
  const { daily_collections = [] } = usePage().props;
  const { data, setData, post, processing, errors, reset } = useForm({
    customer_name: '',
    amount_collected: '',
    payment_method: '',
    notes: '',
  });

  const breadcrumbs = [
    { title: 'Daily Collections', href: '/daily-collections' },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    post(route('daily-collections.store'), {
      onSuccess: () => reset(),
    });
  }

  const totalCollected = daily_collections.reduce((sum, col) => sum + parseFloat(col.amount_collected), 0);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Daily Collections</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Daily Collection</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customer" className="text-right">
                    Customer
                  </Label>
                  <Input id="customer" className="col-span-3" placeholder="Customer name" value={data.customer_name} onChange={e => setData('customer_name', e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Amount (GH₵)
                  </Label>
                  <Input id="amount" type="number" className="col-span-3" placeholder="0.00" value={data.amount_collected} onChange={e => setData('amount_collected', e.target.value)} />
                </div>
                <Button type="submit" disabled={processing}>Record Collection</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections Today</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">GH₵{totalCollected.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {daily_collections.length} customers</p>
          </CardContent>
        </Card>

        {/* Collections Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Amount Collected</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily_collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>{collection.time}</TableCell>
                    <TableCell className="font-medium">{collection.customer_name}</TableCell>
                    <TableCell className="font-medium text-green-600">GH₵{parseFloat(collection.amount_collected).toFixed(2)}</TableCell>
                    <TableCell>{collection.payment_method}</TableCell>
                    <TableCell>{collection.notes}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-green-50">
                  <TableCell colSpan={2} className="font-bold">Total Collected</TableCell>
                  <TableCell className="font-bold text-green-600">GH₵{totalCollected.toFixed(2)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default DailyCollections; 