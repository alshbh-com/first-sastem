import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, Star, CreditCard, FileText, Phone, MessageSquare, Plus, Save, TrendingUp, AlertTriangle, Clock, DollarSign } from 'lucide-react';

async function saveSetting(key: string, value: string) {
  const { data } = await supabase.from('app_settings').select('key').eq('key', key).single();
  if (data) {
    await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  } else {
    await (supabase.from('app_settings') as any).insert({ key, value });
  }
}

// ========== 1. Office Rating ==========
function OfficeRating() {
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      const { data: orders } = await supabase.from('orders').select('office_id, is_closed');
      const { data: payments } = await supabase.from('office_payments').select('office_id, amount');

      const result = offs?.map(office => {
        const offOrders = orders?.filter(o => o.office_id === office.id) || [];
        const total = offOrders.length;
        const delivered = offOrders.filter(o => o.is_closed).length;
        const successRate = total > 0 ? ((delivered / total) * 100) : 0;
        const totalPaid = payments?.filter(p => p.office_id === office.id).reduce((s, p) => s + Number(p.amount), 0) || 0;

        let rating = 0;
        if (successRate >= 80) rating = 5;
        else if (successRate >= 60) rating = 4;
        else if (successRate >= 40) rating = 3;
        else if (successRate >= 20) rating = 2;
        else if (total > 0) rating = 1;

        return { ...office, total, delivered, successRate, totalPaid, rating };
      }) || [];

      setOffices(result.filter(o => o.total > 0).sort((a, b) => b.rating - a.rating));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" /> تقييم المكاتب</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-xs text-muted-foreground">جاري التحميل...</p> : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-right text-xs">المكتب</TableHead>
                <TableHead className="text-right text-xs">التقييم</TableHead>
                <TableHead className="text-right text-xs">نسبة النجاح</TableHead>
                <TableHead className="text-right text-xs">أوردرات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {offices.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs font-medium">{o.name}</TableCell>
                    <TableCell className="text-xs">{'⭐'.repeat(o.rating)}{'☆'.repeat(5 - o.rating)}</TableCell>
                    <TableCell className="text-xs">{o.successRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-xs">{o.delivered}/{o.total}</TableCell>
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

// ========== 2. Credit Limit ==========
function CreditLimit() {
  const [offices, setOffices] = useState<any[]>([]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      setOffices(offs || []);

      const { data } = await supabase.from('app_settings').select('*').like('key', 'credit_limit_%');
      const parsed: Record<string, string> = {};
      data?.forEach(s => { parsed[s.key.replace('credit_limit_', '')] = s.value; });
      setLimits(parsed);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    for (const [officeId, limit] of Object.entries(limits)) {
      await saveSetting(`credit_limit_${officeId}`, limit);
    }
    toast.success('تم حفظ الحدود الائتمانية');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> حد ائتماني للمكاتب</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">حدد الحد الأقصى للمديونية لكل مكتب (0 = بلا حد)</p>
        {offices.map(o => (
          <div key={o.id} className="flex items-center gap-2">
            <span className="text-xs min-w-[80px]">{o.name}</span>
            <Input
              type="number"
              value={limits[o.id] || '0'}
              onChange={e => setLimits(prev => ({ ...prev, [o.id]: e.target.value }))}
              className="w-28 text-xs"
              placeholder="0"
            />
            <span className="text-[10px] text-muted-foreground">ج.م</span>
          </div>
        ))}
        <Button size="sm" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5 ml-1" /> حفظ</Button>
      </CardContent>
    </Card>
  );
}

// ========== 3. Debt History ==========
function DebtHistory() {
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      const { data: orders } = await supabase.from('orders').select('office_id, delivery_price, is_closed, created_at');
      const { data: payments } = await supabase.from('office_payments').select('office_id, amount, created_at, notes');

      const result = offs?.map(office => {
        const offOrders = orders?.filter(o => o.office_id === office.id && o.is_closed) || [];
        const totalDue = offOrders.reduce((s, o) => s + Number(o.delivery_price), 0);
        const offPayments = payments?.filter(p => p.office_id === office.id) || [];
        const totalPaid = offPayments.reduce((s, p) => s + Number(p.amount), 0);
        const debt = totalDue - totalPaid;
        const lastPayment = offPayments.length > 0 ? offPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] : null;

        return { ...office, totalDue, totalPaid, debt, lastPayment, paymentCount: offPayments.length };
      }) || [];

      setOffices(result.filter(o => o.totalDue > 0).sort((a, b) => b.debt - a.debt));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> سجل مديونيات المكاتب</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-xs text-muted-foreground">جاري التحميل...</p> : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-right text-xs">المكتب</TableHead>
                <TableHead className="text-right text-xs">مستحق</TableHead>
                <TableHead className="text-right text-xs">مدفوع</TableHead>
                <TableHead className="text-right text-xs">متبقي</TableHead>
                <TableHead className="text-right text-xs">آخر دفعة</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {offices.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs font-medium">{o.name}</TableCell>
                    <TableCell className="text-xs">{o.totalDue.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-green-600">{o.totalPaid.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={o.debt > 0 ? 'destructive' : 'default'} className="text-[10px]">
                        {o.debt.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px]">
                      {o.lastPayment ? format(new Date(o.lastPayment.created_at), 'dd/MM') : 'لم يدفع'}
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

// ========== 4. Late Payment Alert ==========
function LatePaymentAlert() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      const { data: payments } = await supabase.from('office_payments').select('office_id, created_at').order('created_at', { ascending: false });
      const { data: orders } = await supabase.from('orders').select('office_id, delivery_price, is_closed');

      const result: any[] = [];
      offs?.forEach(office => {
        const offPayments = payments?.filter(p => p.office_id === office.id) || [];
        const lastPayment = offPayments[0];
        const offOrders = orders?.filter(o => o.office_id === office.id && o.is_closed) || [];
        const totalDue = offOrders.reduce((s, o) => s + Number(o.delivery_price), 0);
        const totalPaid = offPayments.length; // simplified

        if (!lastPayment && totalDue > 0) {
          result.push({ office: office.name, reason: 'لم يدفع أبداً', debt: totalDue, severity: 'high' });
        } else if (lastPayment) {
          const daysSince = Math.floor((Date.now() - new Date(lastPayment.created_at).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 30 && totalDue > 0) {
            result.push({ office: office.name, reason: `آخر دفعة من ${daysSince} يوم`, debt: totalDue, severity: daysSince > 60 ? 'high' : 'medium' });
          }
        }
      });

      setAlerts(result.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0)));
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> تنبيهات تأخر الدفع</CardTitle></CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">✅ لا توجد تنبيهات</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${a.severity === 'high' ? 'border-red-500/50 bg-red-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
                <div>
                  <p className="text-xs font-medium">{a.office}</p>
                  <p className="text-[10px] text-muted-foreground">{a.reason}</p>
                </div>
                <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {a.debt.toLocaleString()} ج.م
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 5. Office Classification ==========
function OfficeClassification() {
  const [offices, setOffices] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      setOffices(offs || []);
      const { data } = await supabase.from('app_settings').select('*').like('key', 'office_class_%');
      const parsed: Record<string, string> = {};
      data?.forEach(s => { parsed[s.key.replace('office_class_', '')] = s.value; });
      setClassifications(parsed);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    for (const [id, cls] of Object.entries(classifications)) {
      await saveSetting(`office_class_${id}`, cls);
    }
    toast.success('تم حفظ التصنيفات');
    setSaving(false);
  };

  const classOptions = [
    { value: 'vip', label: 'VIP', color: 'bg-amber-500' },
    { value: 'regular', label: 'عادي', color: 'bg-blue-500' },
    { value: 'new', label: 'جديد', color: 'bg-green-500' },
    { value: 'inactive', label: 'غير نشط', color: 'bg-gray-500' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> تصنيف المكاتب</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {offices.map(o => (
          <div key={o.id} className="flex items-center gap-2">
            <span className="text-xs min-w-[80px]">{o.name}</span>
            <div className="flex gap-1">
              {classOptions.map(cls => (
                <Badge
                  key={cls.value}
                  variant={classifications[o.id] === cls.value ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setClassifications(prev => ({ ...prev, [o.id]: cls.value }))}
                >
                  {cls.label}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5 ml-1" /> حفظ</Button>
      </CardContent>
    </Card>
  );
}

// ========== 6. Office Profitability ==========
function OfficeProfitability() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      const { data: orders } = await supabase.from('orders').select('office_id, delivery_price, is_closed');

      const result = offs?.map(o => {
        const offOrders = orders?.filter(or => or.office_id === o.id && or.is_closed) || [];
        const revenue = offOrders.reduce((s, or) => s + Number(or.delivery_price), 0);
        return { name: o.name, revenue };
      }).filter(o => o.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10) || [];

      setData(result);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> ربحية المكاتب</CardTitle></CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="إيراد" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-xs text-muted-foreground">لا توجد بيانات</p>}
      </CardContent>
    </Card>
  );
}

// ========== 7. Office Comparison Dashboard ==========
function OfficeComparison() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      const { data: orders } = await supabase.from('orders').select('office_id, is_closed');

      const result = offs?.map(o => {
        const all = orders?.filter(or => or.office_id === o.id) || [];
        const delivered = all.filter(or => or.is_closed).length;
        const rate = all.length > 0 ? (delivered / all.length) * 100 : 0;
        return { name: o.name, total: all.length, delivered, rate: Math.round(rate) };
      }).filter(o => o.total > 0).sort((a, b) => b.rate - a.rate) || [];

      setData(result);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> مقارنة أداء المكاتب</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {data.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs min-w-[80px] truncate">{o.name}</span>
              <Progress value={o.rate} className="h-2 flex-1" />
              <span className="text-[10px] min-w-[40px] text-left">{o.rate}%</span>
              <span className="text-[10px] text-muted-foreground">({o.delivered}/{o.total})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ========== 8. Simple CRM - Contact Log ==========
function OfficeCRM() {
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('offices').select('id, name, owner_name, owner_phone').then(({ data }) => setOffices(data || []));
  }, []);

  useEffect(() => {
    if (!selectedOffice) return;
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('key', `crm_log_${selectedOffice}`).single();
      if (data) try { setLogs(JSON.parse(data.value)); } catch { setLogs([]); }
      else setLogs([]);
    };
    load();
  }, [selectedOffice]);

  const addLog = async () => {
    if (!newNote.trim() || !selectedOffice) return;
    setSaving(true);
    const updated = [{ date: new Date().toISOString(), note: newNote }, ...logs];
    await saveSetting(`crm_log_${selectedOffice}`, JSON.stringify(updated));
    setLogs(updated);
    setNewNote('');
    toast.success('تم إضافة الملاحظة');
    setSaving(false);
  };

  const office = offices.find(o => o.id === selectedOffice);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> سجل متابعة المكاتب (CRM)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedOffice} onValueChange={setSelectedOffice}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
          <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>)}</SelectContent>
        </Select>

        {office && (
          <div className="p-2 rounded border bg-muted/30 text-xs space-y-1">
            <p>👤 {office.owner_name || 'غير محدد'}</p>
            {office.owner_phone && <p>📞 {office.owner_phone}</p>}
          </div>
        )}

        {selectedOffice && (
          <>
            <div className="flex gap-2">
              <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="اكتب ملاحظة..." className="text-xs min-h-[60px]" />
            </div>
            <Button size="sm" onClick={addLog} disabled={saving || !newNote.trim()}>
              <Plus className="h-3.5 w-3.5 ml-1" /> إضافة ملاحظة
            </Button>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {logs.map((l, i) => (
                <div key={i} className="p-2 rounded border text-xs">
                  <p className="text-[10px] text-muted-foreground">{format(new Date(l.date), 'dd/MM/yyyy HH:mm')}</p>
                  <p>{l.note}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 9. Loyalty Points ==========
function LoyaltyPoints() {
  const [offices, setOffices] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: offs } = await supabase.from('offices').select('id, name');
      const { data: orders } = await supabase.from('orders').select('office_id, is_closed');

      const result = offs?.map(o => {
        const delivered = orders?.filter(or => or.office_id === o.id && or.is_closed).length || 0;
        const points = delivered * 10;
        let tier = 'برونزي';
        if (points >= 5000) tier = 'ذهبي';
        else if (points >= 2000) tier = 'فضي';
        return { name: o.name, delivered, points, tier };
      }).filter(o => o.delivered > 0).sort((a, b) => b.points - a.points) || [];

      setOffices(result);
    };
    load();
  }, []);

  const tierColor = (t: string) => t === 'ذهبي' ? 'bg-amber-500 text-white' : t === 'فضي' ? 'bg-gray-400 text-white' : 'bg-orange-700 text-white';

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" /> نقاط ولاء المكاتب</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {offices.map((o, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded border">
              <div>
                <p className="text-xs font-medium">{o.name}</p>
                <p className="text-[10px] text-muted-foreground">{o.delivered} توصيلة = {o.points} نقطة</p>
              </div>
              <Badge className={`text-[10px] ${tierColor(o.tier)}`}>{o.tier}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ========== Main ==========

// We need to import this tab into NewSystem.tsx - it's the office management tab
// But the plan says to put it inside the existing tabs structure.
// Let me create a new component that will be added as a new tab.

export default function OfficeManagementTab() {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OfficeRating />
        <OfficeClassification />
      </div>
      <OfficeComparison />
      <OfficeProfitability />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CreditLimit />
        <LatePaymentAlert />
      </div>
      <DebtHistory />
      <LoyaltyPoints />
      <OfficeCRM />
    </div>
  );
}
