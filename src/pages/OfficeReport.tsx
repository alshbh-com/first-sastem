import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function OfficeReport() {
  const { user } = useAuth();
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [hiddenOrderIds, setHiddenOrderIds] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

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
    setSelectedOrders(new Set());
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

    // Load hidden order IDs
    if (ordersData.length > 0) {
      const orderIds = ordersData.map(o => o.id);
      const [notesRes, hiddenRes] = await Promise.all([
        supabase.from('office_report_notes').select('order_id, note').in('order_id', orderIds),
        supabase.from('office_report_hidden_orders').select('order_id').in('order_id', orderIds),
      ]);
      
      const notesMap: Record<string, string> = {};
      notesRes.data?.forEach((n: any) => { notesMap[n.order_id] = n.note; });
      setReportNotes(notesMap);

      const hidden = new Set<string>(hiddenRes.data?.map((h: any) => h.order_id) || []);
      setHiddenOrderIds(hidden);
    } else {
      setReportNotes({});
      setHiddenOrderIds(new Set());
    }

    setOrders(ordersData);
    setLoading(false);
  };

  const saveReportNote = async (orderId: string, note: string) => {
    setSavingNote(orderId);
    const { error } = await supabase
      .from('office_report_notes')
      .upsert({ order_id: orderId, note, updated_at: new Date().toISOString() }, { onConflict: 'order_id' });
    if (error) console.error('Error saving note:', error);
    setSavingNote(null);
  };

  const hideSelectedOrders = async () => {
    if (selectedOrders.size === 0) return;
    const rows = Array.from(selectedOrders).map(order_id => ({
      order_id,
      hidden_by: user?.id || null,
    }));
    const { error } = await supabase.from('office_report_hidden_orders').upsert(rows, { onConflict: 'order_id' });
    if (error) {
      toast.error('حدث خطأ أثناء إخفاء الأوردرات');
      return;
    }
    setHiddenOrderIds(prev => {
      const next = new Set(prev);
      selectedOrders.forEach(id => next.add(id));
      return next;
    });
    setSelectedOrders(new Set());
    toast.success(`تم إخفاء ${rows.length} أوردر من التقرير`);
  };

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Filter out hidden orders, then apply status filter
  const visibleOrders = orders.filter(o => !hiddenOrderIds.has(o.id));
  const filteredOrders = orderStatusFilter === 'all'
    ? visibleOrders
    : visibleOrders.filter(o => o.order_statuses?.name === orderStatusFilter);

  const selectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const totalPrice = filteredOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const selectedTotal = filteredOrders
    .filter(o => selectedOrders.has(o.id))
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  const statusCounts: Record<string, number> = {};
  filteredOrders.forEach(o => {
    const name = o.order_statuses?.name || 'بدون حالة';
    statusCounts[name] = (statusCounts[name] || 0) + 1;
  });

  const closedOrders = filteredOrders.filter(o => o.is_closed);
  const closedCount = closedOrders.length;
  const closedPrice = closedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

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
            <Card className="bg-card border-border"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">إجمالي الأسعار</p><p className="text-lg font-bold text-primary">{totalPrice.toLocaleString('en-US')} ج.م</p></CardContent></Card>
            <Card className="bg-card border-border border-green-500/50"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">المقفل ✅</p><p className="text-lg font-bold text-green-500">{closedCount}</p><p className="text-[10px] text-muted-foreground">{closedPrice.toLocaleString('en-US')} ج.م</p></CardContent></Card>
            <Card className="bg-card border-border border-yellow-500/50"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">المعلق ⏳</p><p className="text-lg font-bold text-yellow-500">{pendingCount}</p><p className="text-[10px] text-muted-foreground">{pendingPrice.toLocaleString('en-US')} ج.م</p></CardContent></Card>
          </div>

          {selectedOrders.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
              <span className="text-sm font-medium">تم تحديد {selectedOrders.size} أوردر</span>
              <span className="text-sm">
                مجموع المحدد: <span className="font-bold text-primary text-base">{selectedTotal.toLocaleString('en-US')} ج.م</span>
              </span>
              <Button size="sm" variant="destructive" onClick={hideSelectedOrders} className="gap-1 mr-auto">
                <Trash2 className="h-3.5 w-3.5" />
                إخفاء من التقرير
              </Button>
            </div>
          )}

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-center w-10">
                        <Checkbox
                          checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                          onCheckedChange={selectAll}
                        />
                      </TableHead>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الكود</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">ملاحظات التقرير</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">جاري التحميل...</TableCell></TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell></TableRow>
                    ) : filteredOrders.map((o, idx) => (
                      <TableRow key={o.id} className={`border-border ${selectedOrders.has(o.id) ? 'bg-destructive/5' : ''}`}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedOrders.has(o.id)}
                            onCheckedChange={() => toggleSelect(o.id)}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {o.customer_name}
                          {o.is_closed && <Badge variant="outline" className="mr-1 text-[10px] border-green-500 text-green-500">مقفل ✅</Badge>}
                        </TableCell>
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
                            value={reportNotes[o.id] || ''}
                            onChange={e => setReportNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                            onBlur={() => saveReportNote(o.id, reportNotes[o.id] || '')}
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
