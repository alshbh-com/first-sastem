import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, RefreshCw, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STATUS_NAME = 'رفض ورفض';

export default function RejectReject() {
  const { user, isOwner } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [days, setDays] = useState('30');
  const [savingDays, setSavingDays] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Auto-delete expired orders per configured period (isolated from the rest of the system)
      await supabase.rpc('cleanup_reject_reject_orders');

      const [settingsRes, statusRes] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'reject_reject_auto_delete_days').maybeSingle(),
        supabase.from('order_statuses').select('id, name').eq('name', STATUS_NAME).maybeSingle(),
      ]);
      if (settingsRes.data?.value) setDays(String(settingsRes.data.value));

      const statusId = (statusRes.data as any)?.id;
      if (!statusId) { setOrders([]); return; }

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_statuses(name, color)')
        .eq('status_id', statusId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    } finally {
      setLoading(false);
    }
  };

  const saveDays = async () => {
    const n = parseInt(days);
    if (!n || n < 1) { toast.error('أدخل عدد أيام صحيح'); return; }
    setSavingDays(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'reject_reject_auto_delete_days', value: String(n), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      toast.success(`سيتم حذف أوردرات «رفض ورفض» تلقائيًا بعد ${n} يوم من تاريخ إنشائها`);
      logActivity('تحديد مدة الحذف التلقائي لقسم رفض ورفض', { days: n });
      load();
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ - الحفظ للمالك فقط');
    } finally {
      setSavingDays(false);
    }
  };

  const deleteOrder = async (o: any) => {
    if (!confirm(`حذف نهائي للأوردر (${o.customer_name})؟ لا يمكن التراجع.`)) return;
    setDeleteLoading(o.id);
    try {
      const { error } = await supabase.rpc('delete_reject_reject_order', { p_order_id: o.id });
      if (error) throw error;
      logActivity('حذف أوردر من قسم رفض ورفض', { order_id: o.id, customer: o.customer_name });
      toast.success('تم حذف الأوردر نهائيًا');
      setOrders(prev => prev.filter(x => x.id !== o.id));
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    } finally {
      setDeleteLoading(null);
    }
  };

  const deleteSelected = async (ids: string[]) => {
    if (!confirm(`حذف نهائي لـ ${ids.length} أوردر؟ لا يمكن التراجع.`)) return;
    try {
      for (const id of ids) {
        const { error } = await supabase.rpc('delete_reject_reject_order', { p_order_id: id });
        if (error) throw error;
      }
      logActivity('حذف أوردرات من قسم رفض ورفض', { count: ids.length });
      toast.success(`تم حذف ${ids.length} أوردر نهائيًا`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    }
  };

  const totalPrice = orders.reduce((s, o) => s + Number(o.price || 0), 0);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">رفض ورفض</h1>
          <Badge variant="outline" className="border-red-500 text-red-500">{orders.length} أوردر</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm whitespace-nowrap">حذف تلقائي بعد (يوم)</Label>
            <Input
              type="number"
              min={1}
              value={days}
              onChange={e => setDays(e.target.value)}
              className="w-24 bg-secondary border-border"
              disabled={!isOwner}
            />
            <Button size="sm" variant="outline" onClick={saveDays} disabled={savingDays || !isOwner}>
              {savingDays ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            يجري حذف الأوردرات القديمة تلقائيًا عند فتح القسم — بدون أي تأثير على باقي النظام
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">الباركود</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الشحن</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد أوردرات بحالة «رفض ورفض»</TableCell></TableRow>
                ) : orders.map(o => (
                  <TableRow key={o.id} className="border-border">
                    <TableCell className="font-mono font-bold text-sm">{o.barcode || o.tracking_id || '-'}</TableCell>
                    <TableCell className="font-medium text-sm">{o.customer_name}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{o.customer_phone}</TableCell>
                    <TableCell className="text-sm">{o.product_name}</TableCell>
                    <TableCell className="text-sm font-bold">{o.price} ج.م</TableCell>
                    <TableCell className="text-sm">{o.delivery_price} ج.م</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteOrder(o)}
                        disabled={deleteLoading === o.id}
                      >
                        {deleteLoading === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        الإجمالي: {orders.length} أوردر — مجموع السعر: {totalPrice} ج.م
      </div>
    </div>
  );
}
