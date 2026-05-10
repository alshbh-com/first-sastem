import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

const EXCLUDED_STATUSES = ['قيد التنفيذ', 'قيد التوصيل'];

export default function StatusChangedToday() {
  const [orders, setOrders] = useState<any[]>([]);
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
      .eq('is_closed', false)
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
    setLoading(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">الأوردرات اللي اتغيرت حالتها اليوم</h1>
        <Badge variant="outline">{orders.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        أي أوردر تتغير حالته خلال اليوم يظهر هنا (ما عدا "قيد التنفيذ" و"بدون حالة"). يتم مسحها تلقائياً مع بداية اليوم التالي.
      </p>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">وقت التغيير</TableHead>
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
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">مفيش أوردرات اتغيرت حالتها النهاردة</TableCell></TableRow>
                ) : orders.map(o => (
                  <TableRow key={o.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{o.barcode || '-'}</TableCell>
                    <TableCell className="text-sm">{o.customer_name}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{o.customer_phone}</TableCell>
                    <TableCell className="text-sm">{o.offices?.name || o.office_name_snapshot || '-'}</TableCell>
                    <TableCell className="text-sm">{o.courier_name_snapshot || '-'}</TableCell>
                    <TableCell><Badge style={{ backgroundColor: o.order_statuses?.color }} className="text-xs">{o.order_statuses?.name}</Badge></TableCell>
                    <TableCell className="font-bold text-sm">{Number(o.price) + Number(o.delivery_price)}</TableCell>
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
