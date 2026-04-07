import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function OfficeReport() {
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('offices').select('id, name').order('name').then(({ data }) => setOffices(data || []));
    supabase.from('order_statuses').select('id, name, color').order('sort_order').then(({ data }) => setStatuses(data || []));
  }, []);

  useEffect(() => {
    if (selectedOffice) loadOrders();
    else setOrders([]);
  }, [selectedOffice, dateFrom, dateTo]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_statuses(name, color)')
      .eq('office_id', selectedOffice)
      .eq('is_pending_approval', false)
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

    const { data } = await query.limit(1000);
    const ordersData = data || [];
    setOrders(ordersData);
    // Load existing notes
    const notesMap: Record<string, string> = {};
    ordersData.forEach(o => { if (o.notes) notesMap[o.id] = o.notes; });
    setOrderNotes(notesMap);
    setLoading(false);
  };

  const saveNote = async (orderId: string, note: string) => {
    setSavingNote(orderId);
    await supabase.from('orders').update({ notes: note }).eq('id', orderId);
    setSavingNote(null);
  };

  const filteredOrders = orderStatusFilter === 'all'
    ? orders
    : orders.filter(o => o.order_statuses?.name === orderStatusFilter);

  const totalPrice = filteredOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  // Count per status
  const statusCounts: Record<string, number> = {};
  filteredOrders.forEach(o => {
    const name = o.order_statuses?.name || 'بدون حالة';
    statusCounts[name] = (statusCounts[name] || 0) + 1;
  });

  // Closed orders (is_closed = true)
  const closedOrders = filteredOrders.filter(o => o.is_closed);
  const closedCount = closedOrders.length;
  const closedPrice = closedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  // Pending orders (بدون حالة + قيد التوصيل)
  const pendingOrders = filteredOrders.filter(o => {
    const name = o.order_statuses?.name;
    return name === 'بدون حالة' || name === 'قيد التوصيل';
  });
  const pendingCount = pendingOrders.length;
  const pendingPrice = pendingOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">تقرير المكاتب</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">المكتب</Label>
          <Select value={selectedOffice} onValueChange={setSelectedOffice}>
            <SelectTrigger className="w-52 bg-secondary border-border"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
            <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">من تاريخ</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">إلى تاريخ</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 bg-secondary border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">حالة الأوردر</Label>
          <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
            <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {statuses.map(s => (
                <SelectItem key={s.id} value={s.name}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color || '#6b7280' }} />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(dateFrom || dateTo) && (
          <button className="text-xs text-muted-foreground underline" onClick={() => { setDateFrom(''); setDateTo(''); }}>الكل</button>
        )}
      </div>

      {selectedOffice && (
        <>
          <div className="flex flex-wrap gap-2">
            <Card className="bg-card border-border"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">إجمالي</p><p className="text-lg font-bold">{filteredOrders.length}</p></CardContent></Card>
            {statuses.map(s => {
              const count = statusCounts[s.name] || 0;
              if (count === 0 && orderStatusFilter !== 'all') return null;
              return (
                <Card key={s.id} className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color || '#6b7280' }} />
                      {s.name}
                    </p>
                    <p className="text-lg font-bold" style={{ color: s.color || undefined }}>{count}</p>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="bg-card border-border"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">إجمالي الأسعار</p><p className="text-lg font-bold text-primary">{totalPrice.toLocaleString('en-US')} ج.م</p></CardContent></Card>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الكود</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">جاري التحميل...</TableCell></TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell></TableRow>
                    ) : filteredOrders.map((o, idx) => (
                      <TableRow key={o.id} className="border-border">
                        <TableCell className="text-sm">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{o.customer_name}</TableCell>
                        <TableCell className="font-mono text-xs">{o.customer_code || '-'}</TableCell>
                        <TableCell className="text-sm font-bold">{o.price} ج.م</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: o.order_statuses?.color }} className="text-xs text-white">
                            {o.order_statuses?.name || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('ar-EG')}</TableCell>
                        <TableCell>
                          <Input
                            className="h-7 text-xs min-w-[120px] bg-secondary border-border"
                            placeholder="اكتب ملاحظة..."
                            value={orderNotes[o.id] || ''}
                            onChange={e => setOrderNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                            onBlur={() => saveNote(o.id, orderNotes[o.id] || '')}
                          />
                          {savingNote === o.id && <span className="text-[10px] text-muted-foreground">حفظ...</span>}
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
