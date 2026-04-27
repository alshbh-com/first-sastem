import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Wallet } from 'lucide-react';

type Row = {
  courier_id: string;
  courier_name: string;
  orders_count: number;
  pending_amount: number;
};

export default function PendingCollections() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    // Get courier role users
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'courier');

    const courierIds = (roles || []).map((r) => r.user_id);
    if (courierIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', courierIds);

    // Active orders per courier (not closed)
    const { data: orders } = await supabase
      .from('orders')
      .select('courier_id, price, delivery_price, courier_name_snapshot')
      .eq('is_closed', false)
      .eq('is_pending_approval', false)
      .not('courier_id', 'is', null);

    // Collections per courier
    const { data: collections } = await supabase
      .from('courier_collections')
      .select('courier_id, amount');

    const collectedByCourier: Record<string, number> = {};
    (collections || []).forEach((c: any) => {
      collectedByCourier[c.courier_id] = (collectedByCourier[c.courier_id] || 0) + Number(c.amount || 0);
    });

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p) => { profileMap[p.id] = p.full_name; });

    const agg: Record<string, { orders_count: number; total_due: number; name: string }> = {};
    (orders || []).forEach((o: any) => {
      if (!o.courier_id) return;
      const total = Number(o.price || 0) + Number(o.delivery_price || 0);
      if (!agg[o.courier_id]) {
        agg[o.courier_id] = {
          orders_count: 0,
          total_due: 0,
          name: profileMap[o.courier_id] || o.courier_name_snapshot || 'مندوب محذوف',
        };
      }
      agg[o.courier_id].orders_count += 1;
      agg[o.courier_id].total_due += total;
    });

    // Also include couriers who have collections but no active orders
    Object.keys(collectedByCourier).forEach((cid) => {
      if (!agg[cid] && profileMap[cid]) {
        agg[cid] = { orders_count: 0, total_due: 0, name: profileMap[cid] };
      }
    });

    const result: Row[] = Object.entries(agg)
      .map(([courier_id, v]) => {
        const collected = collectedByCourier[courier_id] || 0;
        const pending = v.total_due - collected;
        return {
          courier_id,
          courier_name: v.name,
          orders_count: v.orders_count,
          pending_amount: pending,
        };
      })
      // فقط المناديب اللي عليهم اوردرات أو عليهم تحصيل
      .filter((r) => r.orders_count > 0 || Math.abs(r.pending_amount) > 0.01)
      .sort((a, b) => b.pending_amount - a.pending_amount);

    setRows(result);
    setLoading(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">معلق</h1>
        <Badge variant="outline" className="text-xs">
          {rows.length} مندوب
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        المناديب اللي معاهم أوردرات أو عليهم تحصيل
      </p>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">المندوب</TableHead>
                  <TableHead className="text-right">عدد الأوردرات</TableHead>
                  <TableHead className="text-right">المبلغ المعلق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">لا يوجد مناديب عليهم تحصيل أو أوردرات</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow
                    key={r.courier_id}
                    className="border-border cursor-pointer hover:bg-secondary/50"
                    onClick={() => navigate(`/courier-collections?courier=${r.courier_id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {r.courier_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {r.orders_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${r.pending_amount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {r.pending_amount.toLocaleString('en-US')} ج.م
                      </span>
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
