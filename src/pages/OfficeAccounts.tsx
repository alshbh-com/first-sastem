import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function OfficeAccounts() {
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('all');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [period, setPeriod] = useState('all');

  // Advance payment
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceOffice, setAdvanceOffice] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');

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

      // Get advance payments for this office
      const { data: payments } = await supabase.from('company_payments').select('amount').eq('company_id', office.id);
      const advancePaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const deliveredTotal = orders.filter(o => o.status_id === deliveredStatus?.id).reduce((sum, o) => sum + Number(o.price), 0);
      const returnedTotal = orders.filter(o => returnStatuses.some(rs => rs.id === o.status_id)).reduce((sum, o) => sum + Number(o.price), 0);
      const postponedTotal = orders.filter(o => o.status_id === postponedStatus?.id).reduce((sum, o) => sum + Number(o.price), 0);
      
      const returnNoShipDeduction = orders
        .filter(o => o.status_id === returnNoShipStatus?.id || rejectStatuses.some(rs => rs.id === o.status_id))
        .reduce((sum, o) => sum + Number(o.delivery_price), 0);

      const partialOrders = orders.filter(o => o.status_id === partialStatus?.id);
      const partialDeliveredTotal = partialOrders.reduce((sum, o) => sum + Number(o.partial_amount || 0), 0);
      const partialReturnTotal = partialOrders.reduce((sum, o) => sum + (Number(o.price) - Number(o.partial_amount || 0)), 0);

      const settlement = deliveredTotal + partialDeliveredTotal - (returnedTotal + returnNoShipDeduction);
      const settlementWithPostponed = settlement + postponedTotal;

      return {
        id: office.id, name: office.name,
        orderCount: orders.length,
        deliveredTotal, returnedTotal, postponedTotal,
        returnNoShipDeduction, partialDeliveredTotal, partialReturnTotal,
        settlement, settlementWithPostponed, advancePaid,
        netAfterAdvance: settlement - advancePaid,
      };
    }));

    setAccounts(result.filter(Boolean));
  };

  const saveAdvance = async () => {
    if (!advanceOffice || !advanceAmount) return;
    const { error } = await supabase.from('company_payments').insert({
      company_id: advanceOffice,
      amount: parseFloat(advanceAmount),
      notes: advanceNotes || 'دفعة مقدمة',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('تم تسجيل الدفعة المقدمة');
    setAdvanceOpen(false); setAdvanceAmount(''); setAdvanceNotes(''); setAdvanceOffice('');
    loadAccounts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">حسابات المكاتب</h1>
        <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 ml-1" />دفعة مقدمة</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>تسجيل دفعة مقدمة</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>المكتب</Label>
                <Select value={advanceOffice} onValueChange={setAdvanceOffice}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
                  <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>المبلغ</Label><Input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label>ملاحظات</Label><Input value={advanceNotes} onChange={e => setAdvanceNotes(e.target.value)} className="bg-secondary border-border" placeholder="دفعة مقدمة..." /></div>
              <Button onClick={saveAdvance} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={selectedOffice} onValueChange={setSelectedOffice}>
          <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
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
                  <TableHead className="text-right hidden sm:table-cell">مرتجع جزئي</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">خصم شحن</TableHead>
                  <TableHead className="text-right">المدفوع مقدم</TableHead>
                  <TableHead className="text-right">المستحق</TableHead>
                  <TableHead className="text-right">بالمؤجل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">لا توجد بيانات</TableCell></TableRow>
                ) : accounts.map(a => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell className="font-medium text-sm">{a.name}</TableCell>
                    <TableCell className="text-sm">{a.orderCount}</TableCell>
                    <TableCell className="text-emerald-500 font-bold text-sm">{a.deliveredTotal} ج.م</TableCell>
                    <TableCell className="text-destructive font-bold text-sm">{a.returnedTotal} ج.م</TableCell>
                    <TableCell className="text-amber-500 font-bold text-sm">{a.postponedTotal} ج.م</TableCell>
                    <TableCell className="text-orange-400 font-bold text-sm hidden sm:table-cell">{a.partialReturnTotal} ج.م</TableCell>
                    <TableCell className="text-destructive text-sm hidden sm:table-cell">{a.returnNoShipDeduction} ج.م</TableCell>
                    <TableCell className="text-primary font-bold text-sm">{a.advancePaid} ج.م</TableCell>
                    <TableCell className="font-bold text-sm">{a.settlement} ج.م</TableCell>
                    <TableCell className="font-bold text-primary text-sm">{a.settlementWithPostponed} ج.م</TableCell>
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
