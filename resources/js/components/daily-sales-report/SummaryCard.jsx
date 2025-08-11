import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SummaryCard({ title, icon: Icon, amount, subtitle, color }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${color}`}>{amount}</div>
                <p className="text-muted-foreground text-xs">{subtitle}</p>
            </CardContent>
        </Card>
    );
}
