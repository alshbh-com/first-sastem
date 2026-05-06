import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock4, Save } from 'lucide-react';
import { toast } from 'sonner';

const SETTINGS_KEY = 'orders_reminder_days';

export default function OrdersReminder() {
  const [days, setDays] = useState(5);
  const [editDays, setEditDays] = useState('5');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSetting(); }, []);
  useEffect(() => { load(); }, [days]);

  const loadSetting = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
    const d = parseInt(data?.value || '5') || 5;
    setDays(d); setEditDays(String(d));
  };

  const saveSetting = async () => {
    const d = parseInt(editDays) || 5;
    await supabase.from('app_settings').upsert({ key: SETTINGS_KEY, value: String(d), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setDays(d);
    toast.success('تم الحفظ');
  };

  const load = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color), offices(name)')
      .eq('is_closed', false)
      .eq('is_pending_approval', false)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(500);
    setOrders(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Clock4 className="h-6 w-6 text-amber-500" />
        <h1 className="text-xl sm:text-2xl font-bold">تذكير الأوردرات القديمة</h1>
        <Badge variant="outline">{orders.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">الأوردرات اللي بقالها أكتر من المدة المحددة ولسه مش مقفلة</p>

      <Card className="bg-card border-border">
        <CardContent className="p-3 flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">المدة (بالأيام)</label>
            <Input type="number" min={1} value={editDays} onChange={e => setEditDays(e.target.value)} className="w-24 bg-secondary border-border" />
          </div>
          <Button size="sm" onClick={saveSetting}><Save className="h-4 w-4 ml-1" />حفظ</Button>
          <span className="text-xs text-muted-foreground">المدة الحالية: {days} يوم</span>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">عمر الأوردر</TableHead>
                  <TableHead className="text-right">تاريخ التسجيل</TableHead>
                  <TableHead className="text-right">الباركود</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">المندوب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">مفيش أوردرات قديمة 👍</TableCell></TableRow>
                ) : orders.map(o => {
                  const ageDays = Math.floor((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <TableRow key={o.id} className="border-border">
                      <TableCell><Badge variant="outline" className="border-amber-500 text-amber-600">{ageDays} يوم</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell className="font-mono text-xs">{o.barcode || '-'}</TableCell>
                      <TableCell className="text-sm">{o.customer_name}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{o.customer_phone}</TableCell>
                      <TableCell className="text-sm">{o.offices?.name || o.office_name_snapshot || '-'}</TableCell>
                      <TableCell><Badge style={{ backgroundColor: o.order_statuses?.color }} className="text-xs">{o.order_statuses?.name || 'بدون حالة'}</Badge></TableCell>
                      <TableCell className="font-bold text-sm">{Number(o.price) + Number(o.delivery_price)}</TableCell>
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
