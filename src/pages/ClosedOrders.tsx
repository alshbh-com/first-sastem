import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function ClosedOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_statuses(name, color), companies(name), offices(name)')
        .eq('is_closed', true)
        .order('updated_at', { ascending: false })
        .limit(500);
      setOrders(data || []);
    };
    load();
  }, []);

  const filtered = orders.filter(o =>
    !search || o.tracking_id?.includes(search) || o.customer_name?.includes(search) || o.customer_phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الأوردرات القديمة (المقفلة)</h1>
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 bg-secondary border-border" />
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">Tracking</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الشركة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد أوردرات مقفلة</TableCell></TableRow>
                ) : filtered.map(order => (
                  <TableRow key={order.id} className="border-border">
                    <TableCell className="font-mono text-xs">{order.tracking_id}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>{order.price} ج.م</TableCell>
                    <TableCell>{order.companies?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: order.order_statuses?.color || undefined }} className="text-xs">
                        {order.order_statuses?.name || '-'}
                      </Badge>
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
