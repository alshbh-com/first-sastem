import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { DollarSign, PiggyBank, Wallet, TrendingUp, Receipt, CreditCard, Plus, Save, Download, FileText, ArrowUpDown } from 'lucide-react';

async function saveSetting(key: string, value: string) {
  const { data } = await supabase.from('app_settings').select('key').eq('key', key).single();
  if (data) {
    await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  } else {
    await (supabase.from('app_settings') as any).insert({ key, value });
  }
}

// ========== 1. Monthly Budget ==========
function MonthlyBudget() {
  const [budget, setBudget] = useState('0');
  const [expenses, setExpenses] = useState(0);
  const [saving, setSaving] = useState(false);
  const [month] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from('app_settings').select('*').eq('key', `budget_${month}`).single();
      if (s) setBudget(s.value);

      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const { data: exp } = await supabase.from('expenses').select('amount').gte('expense_date', format(start, 'yyyy-MM-dd')).lte('expense_date', format(end, 'yyyy-MM-dd'));
      setExpenses(exp?.reduce((sum, e) => sum + Number(e.amount), 0) || 0);
    };
    load();
  }, [month]);

  const save = async () => {
    setSaving(true);
    await saveSetting(`budget_${month}`, budget);
    toast.success('تم حفظ الميزانية');
    setSaving(false);
  };

  const budgetNum = Number(budget) || 0;
  const percent = budgetNum > 0 ? Math.min((expenses / budgetNum) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PiggyBank className="h-4 w-4" /> ميزانية شهر {format(new Date(), 'MMMM yyyy', { locale: ar })}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs">الميزانية:</Label>
          <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-32" />
          <Button size="sm" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>المصروف: {expenses.toLocaleString('en-US')} ج.م</span>
            <span>المتبقي: {(budgetNum - expenses).toLocaleString('en-US')} ج.م</span>
          </div>
          <Progress value={percent} className="h-3" />
          <p className="text-[10px] text-muted-foreground text-center">{percent.toFixed(1)}% من الميزانية</p>
        </div>
        {percent > 80 && <Badge variant="destructive" className="text-[10px]">⚠️ تم استهلاك أكثر من 80% من الميزانية!</Badge>}
      </CardContent>
    </Card>
  );
}

// ========== 2. Courier Wallet ==========
function CourierWallet() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'courier');
      const courierIds = roles?.map(r => r.user_id) || [];
      if (courierIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase.from('profiles').select('id, full_name');
      const { data: collections } = await supabase.from('courier_collections').select('courier_id, amount');
      const { data: advances } = await supabase.from('advances').select('user_id, amount, type');
      const { data: bonuses } = await supabase.from('courier_bonuses').select('courier_id, amount');

      const wallets = courierIds.map(id => {
        const name = profiles?.find(p => p.id === id)?.full_name || 'غير معروف';
        const totalCollected = collections?.filter(c => c.courier_id === id).reduce((s, c) => s + Number(c.amount), 0) || 0;
        const totalAdvances = advances?.filter(a => a.user_id === id && a.type === 'advance').reduce((s, a) => s + Number(a.amount), 0) || 0;
        const totalDeductions = advances?.filter(a => a.user_id === id && a.type === 'deduction').reduce((s, a) => s + Number(a.amount), 0) || 0;
        const totalBonuses = bonuses?.filter(b => b.courier_id === id).reduce((s, b) => s + Number(b.amount), 0) || 0;
        const balance = totalCollected - totalAdvances - totalDeductions + totalBonuses;
        return { id, name, totalCollected, totalAdvances, totalDeductions, totalBonuses, balance };
      });

      setCouriers(wallets.sort((a, b) => b.balance - a.balance));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" /> محفظة المندوبين</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-xs text-muted-foreground">جاري التحميل...</p> : couriers.length === 0 ? <p className="text-xs text-muted-foreground">لا يوجد مندوبين</p> : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right text-xs">المندوب</TableHead>
                  <TableHead className="text-right text-xs">محصّل</TableHead>
                  <TableHead className="text-right text-xs">سلفات</TableHead>
                  <TableHead className="text-right text-xs">خصومات</TableHead>
                  <TableHead className="text-right text-xs">مكافآت</TableHead>
                  <TableHead className="text-right text-xs">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couriers.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.totalCollected.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-xs text-red-500">{c.totalAdvances.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-xs text-red-500">{c.totalDeductions.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-xs text-green-500">{c.totalBonuses.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-xs font-bold">
                      <Badge variant={c.balance >= 0 ? 'default' : 'destructive'}>{c.balance.toLocaleString('en-US')} ج.م</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 3. Tiered Commission Calculator ==========
function TieredCommission() {
  const [tiers, setTiers] = useState([
    { min: 0, max: 50, rate: 5 },
    { min: 51, max: 100, rate: 7 },
    { min: 101, max: 9999, rate: 10 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('key', 'commission_tiers').single();
      if (data) try { setTiers(JSON.parse(data.value)); } catch {}
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await saveSetting('commission_tiers', JSON.stringify(tiers));
    toast.success('تم حفظ العمولات المتدرجة');
    setSaving(false);
  };

  const updateTier = (i: number, field: string, value: number) => {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> نظام عمولات متدرج</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">كل ما يوصل أكثر، العمولة تزيد</p>
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs">من</span>
            <Input type="number" value={t.min} onChange={e => updateTier(i, 'min', +e.target.value)} className="w-16 text-xs" />
            <span className="text-xs">إلى</span>
            <Input type="number" value={t.max} onChange={e => updateTier(i, 'max', +e.target.value)} className="w-16 text-xs" />
            <span className="text-xs">عمولة</span>
            <Input type="number" value={t.rate} onChange={e => updateTier(i, 'rate', +e.target.value)} className="w-16 text-xs" />
            <span className="text-xs">ج.م</span>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setTiers(prev => [...prev, { min: 0, max: 0, rate: 0 }])}>
            <Plus className="h-3 w-3 ml-1" /> إضافة
          </Button>
          <Button size="sm" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5 ml-1" /> حفظ</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== 4. Revenue vs Expenses Chart ==========
function RevenueVsExpenses() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = format(startOfMonth(d), 'yyyy-MM-dd');
        const end = format(endOfMonth(d), 'yyyy-MM-dd');
        const label = format(d, 'MMM', { locale: ar });

        const { data: orders } = await supabase.from('orders').select('delivery_price').gte('created_at', start).lte('created_at', end + 'T23:59:59');
        const revenue = orders?.reduce((s, o) => s + Number(o.delivery_price), 0) || 0;

        const { data: exp } = await supabase.from('expenses').select('amount').gte('expense_date', start).lte('expense_date', end);
        const expense = exp?.reduce((s, e) => s + Number(e.amount), 0) || 0;

        months.push({ label, revenue, expense, profit: revenue - expense });
      }
      setData(months);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ArrowUpDown className="h-4 w-4" /> الإيرادات مقابل المصروفات</CardTitle></CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="إيرادات" />
              <Bar dataKey="expense" fill="hsl(0 70% 50%)" name="مصروفات" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-xs text-muted-foreground">جاري التحميل...</p>}
      </CardContent>
    </Card>
  );
}

// ========== 5. Daily Cash Flow ==========
function DailyCashFlow() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: entries } = await supabase.from('cash_flow_entries').select('*').order('entry_date', { ascending: false }).limit(30);
      setData(entries || []);
    };
    load();
  }, []);

  const totalIn = data.filter(d => d.type === 'inside').reduce((s, d) => s + Number(d.amount), 0);
  const totalOut = data.filter(d => d.type === 'outside').reduce((s, d) => s + Number(d.amount), 0);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> التدفق النقدي</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded bg-green-500/10"><p className="text-[10px]">داخل</p><p className="text-sm font-bold text-green-600">{totalIn.toLocaleString('en-US')}</p></div>
          <div className="text-center p-2 rounded bg-red-500/10"><p className="text-[10px]">خارج</p><p className="text-sm font-bold text-red-600">{totalOut.toLocaleString('en-US')}</p></div>
          <div className="text-center p-2 rounded bg-blue-500/10"><p className="text-[10px]">صافي</p><p className="text-sm font-bold text-blue-600">{(totalIn - totalOut).toLocaleString('en-US')}</p></div>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-right text-[10px]">التاريخ</TableHead>
              <TableHead className="text-right text-[10px]">النوع</TableHead>
              <TableHead className="text-right text-[10px]">المبلغ</TableHead>
              <TableHead className="text-right text-[10px]">السبب</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.slice(0, 15).map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-[10px]">{e.entry_date}</TableCell>
                  <TableCell><Badge variant={e.type === 'inside' ? 'default' : 'destructive'} className="text-[8px]">{e.type === 'inside' ? 'داخل' : 'خارج'}</Badge></TableCell>
                  <TableCell className="text-[10px]">{Number(e.amount).toLocaleString('en-US')}</TableCell>
                  <TableCell className="text-[10px] truncate max-w-[100px]">{e.reason || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== 6. Auto Settlement Summary ==========
function AutoSettlement() {
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      const { data: orders } = await supabase.from('orders').select('office_id, price, delivery_price, is_closed, is_settled');
      const { data: payments } = await supabase.from('office_payments').select('office_id, amount');

      const result = offs?.map(office => {
        const offOrders = orders?.filter(o => o.office_id === office.id) || [];
        const totalOrders = offOrders.length;
        const delivered = offOrders.filter(o => o.is_closed).length;
        const totalRevenue = offOrders.filter(o => o.is_closed).reduce((s, o) => s + Number(o.delivery_price), 0);
        const totalPaid = payments?.filter(p => p.office_id === office.id).reduce((s, p) => s + Number(p.amount), 0) || 0;
        const balance = totalRevenue - totalPaid;
        const settled = offOrders.filter(o => o.is_settled).length;
        return { ...office, totalOrders, delivered, totalRevenue, totalPaid, balance, settled };
      }) || [];

      setOffices(result.filter(o => o.totalOrders > 0).sort((a, b) => b.balance - a.balance));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> ملخص تسويات المكاتب</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-xs text-muted-foreground">جاري التحميل...</p> : (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-right text-[10px]">المكتب</TableHead>
                <TableHead className="text-right text-[10px]">إيراد</TableHead>
                <TableHead className="text-right text-[10px]">مدفوع</TableHead>
                <TableHead className="text-right text-[10px]">متبقي</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {offices.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs font-medium">{o.name}</TableCell>
                    <TableCell className="text-xs">{o.totalRevenue.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-xs text-green-600">{o.totalPaid.toLocaleString('en-US')}</TableCell>
                    <TableCell><Badge variant={o.balance > 0 ? 'secondary' : 'default'} className="text-[10px]">{o.balance.toLocaleString('en-US')}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 7. Operating Cost ==========
function OperatingCost() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const { data: exp } = await supabase.from('expenses').select('category, amount').gte('expense_date', start).lte('expense_date', end);

      const categories: Record<string, number> = {};
      exp?.forEach(e => { categories[e.category] = (categories[e.category] || 0) + Number(e.amount); });
      setData(Object.entries(categories).map(([name, value]) => ({ name, value })));
    };
    load();
  }, []);

  const COLORS = ['hsl(var(--primary))', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> تكلفة التشغيل الشهرية</CardTitle></CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value.toLocaleString('en-US')}`}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs font-bold mt-2">إجمالي: {data.reduce((s, d) => s + d.value, 0).toLocaleString('en-US')} ج.م</p>
          </div>
        ) : <p className="text-xs text-muted-foreground">لا توجد مصروفات هذا الشهر</p>}
      </CardContent>
    </Card>
  );
}

// ========== 8. Invoice Generator ==========
function InvoiceGenerator() {
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('');

  useEffect(() => {
    supabase.from('offices').select('id, name').then(({ data }) => setOffices(data || []));
  }, []);

  const generateInvoice = async () => {
    if (!selectedOffice) { toast.error('اختر مكتب أولاً'); return; }
    const office = offices.find(o => o.id === selectedOffice);
    const { data: orders } = await supabase.from('orders').select('*').eq('office_id', selectedOffice).eq('is_closed', true).eq('is_settled', false);

    if (!orders || orders.length === 0) { toast.info('لا توجد أوردرات غير مسواة'); return; }

    const total = orders.reduce((s, o) => s + Number(o.delivery_price), 0);
    const content = `
فاتورة - ${office?.name}
التاريخ: ${format(new Date(), 'dd/MM/yyyy')}
عدد الأوردرات: ${orders.length}
إجمالي مستحق: ${total.toLocaleString('en-US')} ج.م
---
${orders.map((o, i) => `${i + 1}. ${o.tracking_id} - ${o.customer_name} - ${Number(o.delivery_price).toLocaleString('en-US')} ج.م`).join('\n')}
---
الإجمالي: ${total.toLocaleString('en-US')} ج.م
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${office?.name}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم إنشاء الفاتورة');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> فاتورة إلكترونية</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedOffice} onValueChange={setSelectedOffice}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
          <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={generateInvoice}><Download className="h-3.5 w-3.5 ml-1" /> إنشاء فاتورة</Button>
      </CardContent>
    </Card>
  );
}

// ========== Main ==========
export default function FinanceTab() {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MonthlyBudget />
        <OperatingCost />
      </div>
      <RevenueVsExpenses />
      <CourierWallet />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TieredCommission />
        <InvoiceGenerator />
      </div>
      <DailyCashFlow />
      <AutoSettlement />
    </div>
  );
}
