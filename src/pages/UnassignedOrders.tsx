import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function UnassignedOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignCourier, setAssignCourier] = useState('');
  const [filterCourier, setFilterCourier] = useState('unassigned');

  useEffect(() => {
    loadOrders();
    loadCouriers();
  }, []);

  const loadCouriers = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'courier');
    if (roles && roles.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', roles.map(r => r.user_id));
      setCouriers(profiles || []);
    }
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color), offices(name), companies(name)')
      .eq('is_closed', false)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const filtered = orders.filter(o => {
    if (filterCourier === 'unassigned') return !o.courier_id;
    if (filterCourier === 'all') return true;
    return o.courier_id === filterCourier;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  };

  const assignToCourier = async () => {
    if (!assignCourier || selected.size === 0) { toast.error('اختر مندوب واوردرات'); return; }
    const { error } = await supabase.from('orders').update({ courier_id: assignCourier }).in('id', Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success(`تم تعيين ${selected.size} أوردر للمندوب`);
    setSelected(new Set());
    setAssignCourier('');
    loadOrders();
  };

  const courierName = (id: string | null) => {
    if (!id) return 'غير معين';
    return couriers.find(c => c.id === id)?.full_name || '-';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">جميع الأوردرات الغير مقفلة</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <Select value={filterCourier} onValueChange={setFilterCourier}>
          <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="فلتر" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأوردرات</SelectItem>
            <SelectItem value="unassigned">غير معينة</SelectItem>
            {couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-secondary rounded-lg border border-border">
          <span className="text-sm font-medium">تم تحديد {selected.size} أوردر</span>
          <Select value={assignCourier} onValueChange={setAssignCourier}>
            <SelectTrigger className="w-44 bg-card border-border"><SelectValue placeholder="اختر مندوب" /></SelectTrigger>
            <SelectContent>
              {couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={assignToCourier} disabled={!assignCourier}>
            <UserPlus className="h-4 w-4 ml-1" />تعيين مندوب
          </Button>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="text-right">Tracking</TableHead>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">المندوب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell></TableRow>
                ) : filtered.map(order => (
                  <TableRow key={order.id} className="border-border">
                    <TableCell><Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} /></TableCell>
                    <TableCell className="font-mono text-xs">{order.tracking_id}</TableCell>
                    <TableCell className="font-mono text-xs">{order.customer_code || '-'}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>{Number(order.price) + Number(order.delivery_price)} ج.م</TableCell>
                    <TableCell>{order.offices?.name || '-'}</TableCell>
                    <TableCell>{courierName(order.courier_id)}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: order.order_statuses?.color || undefined }} className="text-xs">
                        {order.order_statuses?.name || 'بدون حالة'}
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
