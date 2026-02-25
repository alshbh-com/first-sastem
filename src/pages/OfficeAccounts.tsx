import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OfficeAccounts() {
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('all');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    supabase.from('offices').select('id, name').order('name').then(({ data }) => setOffices(data || []));
    supabase.from('order_statuses').select('*').order('sort_order').then(({ data }) => setStatuses(data || []));
  }, []);

  useEffect(() => { loadAccounts(); }, [selectedOffice, period, offices, statuses]);

  const getDateFilter = () => {
    const now = new Date();
    if (period === 'daily') return now.toISOString().split('T')[0];
    if (period === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    if (period === 'yearly') return new Date(now.getFullYear(), 0, 1).toISOString();
    return null;
  };

  const loadAccounts = async () => {
    if (offices.length === 0 || statuses.length === 0) return;
    const officeList = selectedOffice === 'all' ? offices : offices.filter(o => o.id === selectedOffice);
    const dateFilter = getDateFilter();

    const deliveredStatus = statuses.find(s => s.name === 'تم التسليم');
    const returnStatuses = statuses.filter(s => s.name.includes('مرتجع') && s.name !== 'مرتجع دون شحن');
    const returnNoShipStatus = statuses.find(s => s.name === 'مرتجع دون شحن');
    const postponedStatus = statuses.find(s => s.name === 'مؤجل');
    const rejectStatuses = statuses.filter(s => s.name.includes('رفض'));
    const partialStatus = statuses.find(s => s.name === 'تسليم جزئي');

    const result = await Promise.all(officeList.map(async (office) => {
      let query = supabase.from('orders').select('price, delivery_price, status_id, partial_amount').eq('office_id', office.id);
      if (dateFilter) query = query.gte('created_at', dateFilter);
      const { data: orders } = await query;
      if (!orders) return null;

      const deliveredTotal = orders.filter(o => o.status_id === deliveredStatus?.id).reduce((sum, o) => sum + Number(o.price), 0);
      const returnedTotal = orders.filter(o => returnStatuses.some(rs => rs.id === o.status_id)).reduce((sum, o) => sum + Number(o.price), 0);
      const postponedTotal = orders.filter(o => o.status_id === postponedStatus?.id).reduce((sum, o) => sum + Number(o.price), 0);
      
      // خصم شحن مرتجع دون شحن + رفض
      const returnNoShipDeduction = orders
        .filter(o => o.status_id === returnNoShipStatus?.id || rejectStatuses.some(rs => rs.id === o.status_id))
        .reduce((sum, o) => sum + Number(o.delivery_price), 0);

      // المرتجع الجزئي = سعر الأوردر - المبلغ المحصل (partial_amount)
      const partialOrders = orders.filter(o => o.status_id === partialStatus?.id);
      const partialDeliveredTotal = partialOrders.reduce((sum, o) => sum + Number(o.partial_amount || 0), 0);
      const partialReturnTotal = partialOrders.reduce((sum, o) => sum + (Number(o.price) - Number(o.partial_amount || 0)), 0);

      // المستحق = التسليمات - (المرتجع + خصم شحن مرتجع دون شحن)
      const settlement = deliveredTotal + partialDeliveredTotal - (returnedTotal + returnNoShipDeduction);
      // المستحق بالمؤجل = المستحق + المؤجل
      const settlementWithPostponed = settlement + postponedTotal;

      return {
        id: office.id, name: office.name,
        orderCount: orders.length,
        deliveredTotal,
        returnedTotal,
        postponedTotal,
        returnNoShipDeduction,
        partialDeliveredTotal,
        partialReturnTotal,
        settlement,
        settlementWithPostponed,
      };
    }));

    setAccounts(result.filter(Boolean));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">حسابات المكاتب</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedOffice} onValueChange={setSelectedOffice}>
          <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المكاتب</SelectItem>
            {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={period} onValueChange={setPeriod} className="w-auto">
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="daily">يومي</TabsTrigger>
            <TabsTrigger value="monthly">شهري</TabsTrigger>
            <TabsTrigger value="yearly">سنوي</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">عدد</TableHead>
                  <TableHead className="text-right">تسليم</TableHead>
                  <TableHead className="text-right">مرتجع</TableHead>
                  <TableHead className="text-right">مؤجل</TableHead>
                  <TableHead className="text-right">مرتجع جزئي</TableHead>
                  <TableHead className="text-right">خصم شحن</TableHead>
                  <TableHead className="text-right">المستحق</TableHead>
                  <TableHead className="text-right">المستحق بالمؤجل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد بيانات</TableCell></TableRow>
                ) : accounts.map(a => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.orderCount}</TableCell>
                    <TableCell className="text-emerald-500 font-bold">{a.deliveredTotal} ج.م</TableCell>
                    <TableCell className="text-destructive font-bold">{a.returnedTotal} ج.م</TableCell>
                    <TableCell className="text-amber-500 font-bold">{a.postponedTotal} ج.م</TableCell>
                    <TableCell className="text-orange-400 font-bold">{a.partialReturnTotal} ج.م</TableCell>
                    <TableCell className="text-destructive">{a.returnNoShipDeduction} ج.م</TableCell>
                    <TableCell className="font-bold">{a.settlement} ج.م</TableCell>
                    <TableCell className="font-bold text-primary">{a.settlementWithPostponed} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border p-4">
        <h3 className="font-semibold mb-2">معادلة صافي الحساب:</h3>
        <p className="text-sm text-muted-foreground">المستحق = (التسليمات + تسليم جزئي) - (المرتجع + خصم شحن مرتجع دون شحن/رفض)</p>
        <p className="text-sm text-muted-foreground">المستحق بالمؤجل = المستحق + المؤجل</p>
      </Card>
    </div>
  );
}
