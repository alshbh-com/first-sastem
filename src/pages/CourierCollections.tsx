import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CourierCollections() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [commissionPerOrder, setCommissionPerOrder] = useState('');
  const [commissionStatuses, setCommissionStatuses] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'courier');
      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', roles.map(r => r.user_id));
        setCouriers(profiles || []);
      }
      const { data: sts } = await supabase.from('order_statuses').select('*').order('sort_order');
      setStatuses(sts || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedCourier) {
      loadCourierData();
    }
  }, [selectedCourier]);

  const loadCourierData = async () => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, order_statuses(name, color)')
      .eq('courier_id', selectedCourier)
      .order('created_at', { ascending: false });
    setOrders(orderData || []);

    const { data: collData } = await supabase
      .from('courier_collections')
      .select('*, orders(tracking_id)')
      .eq('courier_id', selectedCourier)
      .order('created_at', { ascending: false });
    setCollections(collData || []);
  };

  const calculateCommission = () => {
    if (!commissionPerOrder || commissionStatuses.length === 0 || !selectedCourier) {
      toast.error('اختر مندوب وحالات ومبلغ العمولة');
      return;
    }
    const rate = parseFloat(commissionPerOrder) || 0;
    const eligibleOrders = orders.filter(o => commissionStatuses.includes(o.status_id));
    const total = eligibleOrders.length * rate;
    toast.success(`العمولة: ${total} ج.م (${eligibleOrders.length} أوردر × ${rate} ج.م)`);
  };

  const toggleStatus = (statusId: string) => {
    setCommissionStatuses(prev => 
      prev.includes(statusId) ? prev.filter(s => s !== statusId) : [...prev, statusId]
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تحصيلات المندوبين</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">المندوب</Label>
          <Select value={selectedCourier} onValueChange={setSelectedCourier}>
            <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="اختر مندوب" /></SelectTrigger>
            <SelectContent>
              {couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCourier && (
        <>
          {/* Commission calculator */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">حاسبة العمولة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {statuses.map(s => (
                  <Badge key={s.id}
                    style={{ backgroundColor: commissionStatuses.includes(s.id) ? s.color : undefined }}
                    variant={commissionStatuses.includes(s.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleStatus(s.id)}
                  >
                    {s.name}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">مبلغ العمولة لكل أوردر (ج.م)</Label>
                  <Input type="number" value={commissionPerOrder} onChange={e => setCommissionPerOrder(e.target.value)}
                    className="w-40 bg-secondary border-border" placeholder="30"
                    onFocus={e => { if (e.target.value === '0') setCommissionPerOrder(''); }}
                  />
                </div>
                <Button onClick={calculateCommission}>احسب العمولة</Button>
              </div>
            </CardContent>
          </Card>

          {/* Courier orders */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">أوردرات المندوب ({orders.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-right">Tracking</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">لا توجد أوردرات</TableCell></TableRow>
                    ) : orders.map(o => (
                      <TableRow key={o.id} className="border-border">
                        <TableCell className="font-mono text-xs">{o.tracking_id}</TableCell>
                        <TableCell>{o.customer_name}</TableCell>
                        <TableCell>{o.price} ج.م</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: o.order_statuses?.color }} className="text-xs">
                            {o.order_statuses?.name || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
