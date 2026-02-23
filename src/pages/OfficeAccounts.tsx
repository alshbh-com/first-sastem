import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  useEffect(() => {
    loadAccounts();
  }, [selectedOffice, period]);

  const getDateFilter = () => {
    const now = new Date();
    if (period === 'daily') {
      return now.toISOString().split('T')[0];
    }
    if (period === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
    if (period === 'yearly') {
      return new Date(now.getFullYear(), 0, 1).toISOString();
    }
    return null;
  };

  const loadAccounts = async () => {
    const officeList = selectedOffice === 'all' ? offices : offices.filter(o => o.id === selectedOffice);
    if (officeList.length === 0 && selectedOffice !== 'all') return;

    const dateFilter = getDateFilter();

    const result = await Promise.all((selectedOffice === 'all' ? offices : officeList).map(async (office) => {
      let query = supabase.from('orders').select('price, delivery_price, status_id').eq('office_id', office.id);
      if (dateFilter) query = query.gte('created_at', dateFilter);
      const { data: orders } = await query;

      const deliveredStatus = statuses.find(s => s.name === 'تم التسليم');
      const returnStatuses = statuses.filter(s => s.name.includes('مرتجع'));

      const totalOrders = orders?.reduce((sum, o) => sum + Number(o.price), 0) || 0;
      const deliveredTotal = orders?.filter(o => o.status_id === deliveredStatus?.id).reduce((sum, o) => sum + Number(o.price), 0) || 0;
      const returnedTotal = orders?.filter(o => returnStatuses.some(rs => rs.id === o.status_id)).reduce((sum, o) => sum + Number(o.price), 0) || 0;

      return {
        id: office.id,
        name: office.name,
        totalOrders,
        deliveredTotal,
        returnedTotal,
        orderCount: orders?.length || 0,
      };
    }));

    setAccounts(result);
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
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-right">المكتب</TableHead>
                <TableHead className="text-right">عدد الأوردرات</TableHead>
                <TableHead className="text-right">مجموع الأوردرات (ج.م)</TableHead>
                <TableHead className="text-right">ما تم توصيله (ج.م)</TableHead>
                <TableHead className="text-right">المرتجع (ج.م)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">لا توجد بيانات</TableCell></TableRow>
              ) : accounts.map(a => (
                <TableRow key={a.id} className="border-border">
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.orderCount}</TableCell>
                  <TableCell>{a.totalOrders} ج.م</TableCell>
                  <TableCell className="text-emerald-500 font-bold">{a.deliveredTotal} ج.م</TableCell>
                  <TableCell className="text-destructive font-bold">{a.returnedTotal} ج.م</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
