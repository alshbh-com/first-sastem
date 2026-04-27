import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BranchSimpleDiary from '@/components/BranchSimpleDiary';

export default function OrderApproval() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [ordersRes, officesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('is_pending_approval', true)
        .order('created_at', { ascending: false }),
      supabase.from('offices').select('id, name'),
    ]);
    setOrders(ordersRes.data || []);
    setOffices(officesRes.data || []);
    setLoading(false);
  };

  const getOfficeName = (id: string) => offices.find(o => o.id === id)?.name || '-';

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">تأكيد الأوردرات</h1>
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            <Clock className="h-3 w-3 ml-1" />
            {orders.length} في الانتظار
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          {orders.length > 0 && (
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
                  <TableHead className="text-right">الفرع</TableHead>
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
                  <TableRow><TableCell colSpan={11} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">لا توجد أوردرات في انتظار الموافقة</TableCell></TableRow>
                ) : orders.map(o => (
                  <TableRow key={o.id} className="border-border">
                    <TableCell>
                      <Badge className="text-xs bg-blue-600 text-white">{o.branch_label || 'فرع'}</Badge>
                    </TableCell>
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
