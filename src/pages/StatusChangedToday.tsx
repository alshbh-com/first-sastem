import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Activity } from 'lucide-react';
import { toast } from 'sonner';

const EXCLUDED_STATUSES = ['قيد التنفيذ', 'قيد التوصيل'];

export default function StatusChangedToday() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color), offices(name)')
      .eq('is_pending_approval', false)
      .not('status_id', 'is', null)
      .gte('updated_at', start.toISOString())
      .order('updated_at', { ascending: false })
      .limit(500);

    const filtered = (data || []).filter(o => {
      const name = o.order_statuses?.name;
      return name && !EXCLUDED_STATUSES.includes(name);
    });
    setOrders(filtered);

    if (filtered.length > 0) {
      const ids = filtered.map(o => o.id);
      const { data: noteRows } = await supabase
        .from('status_change_notes' as any)
        .select('order_id, note')
        .in('order_id', ids);
      const m: Record<string, string> = {};
      (noteRows || []).forEach((n: any) => { m[n.order_id] = n.note || ''; });
      setNotes(m);
    } else {
      setNotes({});
    }
    setLoading(false);
  };

  const saveNote = async (orderId: string, value: string) => {
    const { error } = await supabase
      .from('status_change_notes' as any)
      .upsert({ order_id: orderId, note: value, created_by: user?.id }, { onConflict: 'order_id' });
    if (error) toast.error('فشل حفظ الملاحظة');
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">الأوردرات اللي اتغيرت حالتها اليوم</h1>
        <Badge variant="outline">{orders.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        أي أوردر تتغير حالته خلال اليوم يظهر هنا (ما عدا "قيد التنفيذ" و"قيد التوصيل"). يتم مسحها تلقائياً مع بداية اليوم التالي. تقفيل الأوردر لا يخفيه من القسم.
      </p>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">وقت التغيير</TableHead>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">المندوب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right min-w-[200px]">ملاحظة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">مفيش أوردرات اتغيرت حالتها النهاردة</TableCell></TableRow>
                ) : orders.map(o => (
                  <TableRow key={o.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{o.customer_code || '-'}</TableCell>
                    <TableCell className="text-sm">{o.product_name || '-'}</TableCell>
                    <TableCell className="text-sm">{o.customer_name}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{o.customer_phone}</TableCell>
                    <TableCell className="text-sm">{o.offices?.name || o.office_name_snapshot || '-'}</TableCell>
                    <TableCell className="text-sm">{o.courier_name_snapshot || '-'}</TableCell>
                    <TableCell><Badge style={{ backgroundColor: o.order_statuses?.color }} className="text-xs">{o.order_statuses?.name}</Badge></TableCell>
                    <TableCell className="font-bold text-sm">{Number(o.price) + Number(o.delivery_price)}</TableCell>
                    <TableCell>
                      <Input
                        value={notes[o.id] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                        onBlur={e => saveNote(o.id, e.target.value)}
                        placeholder="اكتب ملاحظة..."
                        className="bg-secondary border-border h-8 text-xs"
                      />
                    </TableCell>
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
