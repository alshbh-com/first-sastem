import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calculator, DollarSign, Minus } from 'lucide-react';

export default function ProfitReport() {
  const [orders, setOrders] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [officePayments, setOfficePayments] = useState<any[]>([]);
  const [period, setPeriod] = useState('30');

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(period));
    const [ordersRes, officesRes, statusRes, paymentsRes] = await Promise.all([
      supabase.from('orders').select('*').gte('created_at', daysAgo.toISOString()),
      supabase.from('offices').select('*'),
      supabase.from('order_statuses').select('*'),
      supabase.from('office_payments').select('*').gte('created_at', daysAgo.toISOString()),
    ]);
    setOrders(ordersRes.data || []);
    setOffices(officesRes.data || []);
    setStatuses(statusRes.data || []);
    setOfficePayments(paymentsRes.data || []);
  };

  const deliveredStatuses = statuses.filter(s => s.name?.includes('تسليم') || s.name?.includes('مسلم')).map(s => s.id);
  const deliveredOrders = orders.filter(o => deliveredStatuses.includes(o.status_id));

  const totalRevenue = deliveredOrders.reduce((s, o) => s + Number(o.price), 0);
  const totalShipping = deliveredOrders.reduce((s, o) => s + Number(o.delivery_price), 0);
  const totalPayments = officePayments.reduce((s, p) => s + Number(p.amount), 0);
  const netProfit = totalShipping - totalPayments;

  // Per-office profit
  const officeProfit = offices.map(o => {
    const offOrders = deliveredOrders.filter(ord => ord.office_id === o.id);
    const shipping = offOrders.reduce((s, ord) => s + Number(ord.delivery_price), 0);
    const payments = officePayments.filter(p => p.office_id === o.id).reduce((s, p) => s + Number(p.amount), 0);
    return {
      name: o.name,
      shipping,
      payments,
      profit: shipping - payments,
      orders: offOrders.length,
    };
  }).filter(o => o.orders > 0).sort((a, b) => b.profit - a.profit);

  const chartData = officeProfit.slice(0, 8).map(o => ({
    name: o.name.length > 10 ? o.name.slice(0, 10) + '..' : o.name,
    شحن: o.shipping,
    مدفوع: o.payments,
    ربح: o.profit,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">تقرير الأرباح</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="60">آخر 60 يوم</SelectItem>
            <SelectItem value="90">آخر 90 يوم</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border"><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-primary/20"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي الإيرادات</p><p className="text-lg font-bold">{totalRevenue.toLocaleString()} ج.م</p></div>
          </div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-warning/20"><Calculator className="h-5 w-5 text-warning" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي الشحن</p><p className="text-lg font-bold">{totalShipping.toLocaleString()} ج.م</p></div>
          </div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-destructive/20"><Minus className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">المدفوعات</p><p className="text-lg font-bold">{totalPayments.toLocaleString()} ج.م</p></div>
          </div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-success/20"><TrendingUp className="h-5 w-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">صافي الربح</p><p className={`text-lg font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{netProfit.toLocaleString()} ج.م</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">الربح حسب المكتب</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,16%,20%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215,20%,60%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215,20%,60%)' }} />
                <Tooltip contentStyle={{ background: 'hsl(220,20%,13%)', border: '1px solid hsl(220,16%,20%)', borderRadius: 8, color: '#fff' }} />
                <Legend />
                <Bar dataKey="شحن" fill="hsl(38,92%,50%)" />
                <Bar dataKey="مدفوع" fill="hsl(0,72%,51%)" />
                <Bar dataKey="ربح" fill="hsl(142,76%,36%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-center">الأوردرات</TableHead>
                  <TableHead className="text-right">الشحن</TableHead>
                  <TableHead className="text-right">المدفوع</TableHead>
                  <TableHead className="text-right">الربح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officeProfit.map(o => (
                  <TableRow key={o.name} className="border-border">
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell className="text-center">{o.orders}</TableCell>
                    <TableCell>{o.shipping.toLocaleString()} ج.م</TableCell>
                    <TableCell>{o.payments.toLocaleString()} ج.م</TableCell>
                    <TableCell className={`font-bold ${o.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{o.profit.toLocaleString()} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
