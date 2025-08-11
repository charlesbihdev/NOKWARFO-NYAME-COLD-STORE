import { useForm, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Receipt, CreditCard, DollarSign, Trash2 } from "lucide-react"
import AppLayout from '@/layouts/app-layout';

function Sales() {
  const { sales = [] } = usePage().props;
  const { data, setData, post, processing, errors, reset } = useForm({
    customer_id: '',
    payment_type: '',
    items: [], // This would be an array of {product_id, quantity, unit_price}
    subtotal: '',
    tax: '',
    total: '',
    status: 'completed',
  });

  const breadcrumbs = [
    { title: 'Sales', href: '/sales' },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    post(route('sales.store'), {
      onSuccess: () => reset(),
    });
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales & Transactions</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create New Sale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                {/* Add your sale form fields here, e.g. customer, payment type, items, etc. */}
                <Button type="submit" disabled={processing}>Create Sale</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sales List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sales Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.transaction_id}</TableCell>
                    <TableCell>{sale.customer_name || (sale.customer && sale.customer.name)}</TableCell>
                    <TableCell>GH₵{parseFloat(sale.total).toFixed(2)}</TableCell>
                    <TableCell>{sale.payment_type}</TableCell>
                    <TableCell>
                      <Badge>{sale.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default Sales; 