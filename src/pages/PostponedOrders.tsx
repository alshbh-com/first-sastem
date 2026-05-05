import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlarmClock, Save } from 'lucide-react';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function PostponedOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    // Find postponed status id
    const { data: sts } = await supabase.from('order_statuses').select('id, name');
    const postponed = (sts || []).find((s: any) => s.name === 'مؤجل' || s.name.includes('مؤج'));
    if (!postponed) { setOrders([]); setLoading(false); return; }

    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, address, barcode, price, delivery_price, offices(name)')
      .eq('status_id', postponed.id)
      .eq('is_closed', false)
      .order('created_at', { ascending: false });

    const ordersList = data || [];
    setOrders(ordersList);

    if (ordersList.length > 0) {
      const { data: sch } = await supabase
        .from('order_schedules')
        .select('*')
        .eq('user_id', user!.id)
        .in('order_id', ordersList.map(o => o.id));
      const map: Record<string, any> = {};
      (sch || []).forEach((s: any) => { map[s.order_id] = s; });
      setSchedules(map);
    }
    setLoading(false);
  };

  const updateField = (orderId: string, field: string, value: any) => {
    setSchedules(prev => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || { order_id: orderId, user_id: user!.id }), [field]: value }
    }));
  };

  const save = async (orderId: string) => {
    const s = schedules[orderId];
    if (!s) return;
    const { error } = await supabase.from('order_schedules').upsert({
      user_id: user!.id,
      order_id: orderId,
      scheduled_date: s.scheduled_date || null,
      time_from: s.time_from || '',
      time_to: s.time_to || '',
      any_time: !!s.any_time,
      notes: s.notes || '',
    }, { onConflict: 'user_id,order_id' });
    if (error) { toast.error(error.message); return; }
    toast.success('تم الحفظ');
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <AlarmClock className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">الأوردرات المؤجلة</h1>
      </div>
      <p className="text-sm text-muted-foreground">حدد لكل أوردر مؤجل التاريخ والساعة اللي العميل عايز يستلم فيها</p>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">من ساعة</TableHead>
                  <TableHead className="text-right">إلى ساعة</TableHead>
                  <TableHead className="text-center">أي وقت</TableHead>
                  <TableHead className="text-right">ملاحظة</TableHead>
                  <TableHead className="text-center">حفظ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد أوردرات مؤجلة</TableCell></TableRow>
                ) : orders.map(o => {
                  const s = schedules[o.id] || {};
                  return (
                    <TableRow key={o.id} className="border-border">
                      <TableCell className="text-sm">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{o.customer_phone}</div>
                      </TableCell>
                      <TableCell className="text-sm">{o.offices?.name || '-'}</TableCell>
                      <TableCell className="text-sm font-bold">{Number(o.price) + Number(o.delivery_price)}</TableCell>
                      <TableCell>
                        <Input type="date" value={s.scheduled_date || ''} onChange={e => updateField(o.id, 'scheduled_date', e.target.value)} className="bg-secondary border-border w-36 h-8 text-xs" disabled={s.any_time} />
                      </TableCell>
                      <TableCell>
                        <select value={s.time_from || ''} onChange={e => updateField(o.id, 'time_from', e.target.value)} disabled={s.any_time} className="bg-secondary border border-border rounded px-2 h-8 text-xs">
                          <option value="">-</option>
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select value={s.time_to || ''} onChange={e => updateField(o.id, 'time_to', e.target.value)} disabled={s.any_time} className="bg-secondary border border-border rounded px-2 h-8 text-xs">
                          <option value="">-</option>
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={!!s.any_time} onCheckedChange={v => updateField(o.id, 'any_time', !!v)} />
                      </TableCell>
                      <TableCell>
                        <Input value={s.notes || ''} onChange={e => updateField(o.id, 'notes', e.target.value)} className="bg-secondary border-border h-8 text-xs min-w-[120px]" placeholder="ملاحظة" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => save(o.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
