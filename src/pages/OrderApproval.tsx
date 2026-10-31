import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Clock, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BranchSimpleDiary from '@/components/BranchSimpleDiary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrderApproval() {
  const { user, roles } = useAuth();
  const isMod = (roles as string[])?.includes('moderator');
  const [orders, setOrders] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_code: '',
    product_name: '', quantity: '1', price: '0', delivery_price: '0',
    address: '', notes: '', office_id: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [ordersRes, officesRes, profilesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('is_pending_approval', true)
        .order('created_at', { ascending: false }),
      supabase.from('offices').select('id, name'),
      supabase.from('profiles').select('id, full_name'),
    ]);
    setOrders(ordersRes.data || []);
    setOffices(officesRes.data || []);
    const map: Record<string, string> = {};
    (profilesRes.data || []).forEach(p => { map[p.id] = p.full_name; });
    setCreatorMap(map);
    setLoading(false);
  };

  const getOfficeName = (id: string) => offices.find(o => o.id === id)?.name || '-';

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const submitPendingOrder = async () => {
    if (!form.customer_name.trim()) { toast.error('اسم العميل إجباري'); return; }
    if (!form.customer_phone.trim()) { toast.error('رقم الهاتف إجباري'); return; }
    if (!form.address.trim()) { toast.error('العنوان إجباري'); return; }
    if (!form.office_id) { toast.error('اختر مكتب'); return; }
    setAddLoading(true);
    try {
      const { error } = await supabase.from('orders').insert({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_code: form.customer_code || null,
        product_name: form.product_name || 'بدون منتج',
        quantity: parseInt(form.quantity) || 1,
        price: parseFloat(form.price) || 0,
        delivery_price: parseFloat(form.delivery_price) || 0,
        governorate: '',
        address: form.address,
        notes: form.notes,
        office_id: form.office_id,
        tracking_id: 'temp',
        is_pending_approval: true,
        branch_label: 'مودريتور',
        created_by: user?.id,
      });
      if (error) throw error;
      logActivity('إضافة أوردر معلق من المودريتور', { customer: form.customer_name });
      toast.success('تم إضافة الأوردر - في انتظار الموافقة');
      setForm({
        customer_name: '', customer_phone: '', customer_code: '',
        product_name: '', quantity: '1', price: '0', delivery_price: '0',
        address: '', notes: '', office_id: '',
      });
      setAddOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    } finally {
      setAddLoading(false);
    }
  };

  const handleApprove = async (order: any) => {
    setActionLoading(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          is_pending_approval: false,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      if (error) throw error;

      logActivity('موافقة على أوردر فرع', {
        order_id: order.id,
        branch: order.branch_label,
        customer: order.customer_name,
      });
      toast.success('تمت الموافقة على الأوردر');
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (order: any) => {
    if (!confirm('هل أنت متأكد من رفض هذا الأوردر؟ سيتم حذفه نهائياً.')) return;
    setActionLoading(order.id);
    try {
      const { error } = await supabase.from('orders').delete().eq('id', order.id);
      if (error) throw error;

      logActivity('رفض أوردر فرع', {
        order_id: order.id,
        branch: order.branch_label,
        customer: order.customer_name,
      });
      toast.success('تم رفض وحذف الأوردر');
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (!orders.length) return;
    if (!confirm(`هل تريد الموافقة على كل ${orders.length} أوردر؟`)) return;
    setActionLoading('all');
    try {
      const ids = orders.map(o => o.id);
      const { error } = await supabase
        .from('orders')
        .update({
          is_pending_approval: false,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw error;

      logActivity('موافقة جماعية على أوردرات فروع', { count: ids.length });
      toast.success(`تمت الموافقة على ${ids.length} أوردر`);
      setOrders([]);
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Tabs defaultValue="approval" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approval">تأكيد الأوردرات</TabsTrigger>
          <TabsTrigger value="diary">يومية بسيطة</TabsTrigger>
        </TabsList>
        <TabsContent value="diary">
          {user && <BranchSimpleDiary userId={user.id} />}
        </TabsContent>
        <TabsContent value="approval" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">تأكيد الأوردرات</h1>
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            <Clock className="h-3 w-3 ml-1" />
            {orders.length} في الانتظار
          </Badge>
        </div>
        <div className="flex gap-2">
          {isMod && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />إضافة أوردر
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          {orders.length > 0 && !isMod && (
            <Button size="sm" onClick={handleApproveAll} disabled={actionLoading === 'all'} className="bg-emerald-600 hover:bg-emerald-700">
              {actionLoading === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                <CheckCircle className="h-4 w-4 ml-1" />
                موافقة على الكل
              </>}
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">أضافه</TableHead>
                  <TableHead className="text-right">الباركود</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الشحن</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">لا توجد أوردرات في انتظار الموافقة</TableCell></TableRow>
                ) : orders.map(o => (
                  <TableRow key={o.id} className="border-border">
                    <TableCell>
                      <Badge className="text-xs bg-blue-600 text-white">{o.branch_label || 'فرع'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{o.created_by ? (creatorMap[o.created_by] || '-') : '-'}</TableCell>
                    <TableCell className="font-mono font-bold text-sm">{o.barcode || '-'}</TableCell>
                    <TableCell className="font-medium text-sm">{o.customer_name}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{o.customer_phone}</TableCell>
                    <TableCell className="text-sm">{o.product_name}</TableCell>
                    <TableCell className="text-sm font-bold">{o.price} ج.م</TableCell>
                    <TableCell className="text-sm">{o.delivery_price} ج.م</TableCell>
                    <TableCell className="text-sm">{getOfficeName(o.office_id)}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{o.address || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      {!isMod ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-100"
                            onClick={() => handleApprove(o)}
                            disabled={actionLoading === o.id}
                          >
                            {actionLoading === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleReject(o)}
                            disabled={actionLoading === o.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'في انتظار الموافقة'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader><DialogTitle>إضافة أوردر جديد - في انتظار الموافقة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">اسم العميل *</Label>
                <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">رقم الهاتف *</Label>
                <Input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} className="bg-secondary border-border" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الكود (اختياري)</Label>
                <Input value={form.customer_code} onChange={e => set('customer_code', e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">المكتب *</Label>
                <Select value={form.office_id} onValueChange={v => set('office_id', v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
                  <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">العنوان *</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">اسم المنتج</Label>
              <Input value={form.product_name} onChange={e => set('product_name', e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الكمية</Label>
                <Input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  onFocus={e => { if (e.target.value === '1') set('quantity', ''); }}
                  className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">السعر</Label>
                <Input type="number" min={0} value={form.price} onChange={e => set('price', e.target.value)}
                  onFocus={e => { if (e.target.value === '0') set('price', ''); }}
                  className="bg-secondary border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">سعر التوصيل</Label>
                <Input type="number" min={0} value={form.delivery_price} onChange={e => set('delivery_price', e.target.value)}
                  onFocus={e => { if (e.target.value === '0') set('delivery_price', ''); }}
                  className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات</Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} className="bg-secondary border-border" />
            </div>
            <Button className="w-full" onClick={submitPendingOrder} disabled={addLoading}>
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة الأوردر'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
