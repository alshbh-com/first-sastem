import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Package, CreditCard } from 'lucide-react';

export default function OfficePortal() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [officeName, setOfficeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [accountData, setAccountData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Get office info from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('office_id')
      .eq('id', user.id)
      .single();

    if (profile?.office_id) {
      const { data: office } = await supabase
        .from('offices')
        .select('name')
        .eq('id', profile.office_id)
        .single();
      setOfficeName(office?.name || '');
    }

    // Load statuses
    const { data: sts } = await supabase.from('order_statuses').select('*').order('sort_order');
    setStatuses(sts || []);

    // Load orders (RLS will filter to office's non-closed orders)
    const { data: ords } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(ords || []);

    // Load payments
    const { data: pays } = await supabase
      .from('office_payments')
      .select('*')
      .order('created_at', { ascending: false });
    setPayments(pays || []);

    // Calculate account summary
    if (ords && sts) {
      const deliveredStatus = (sts || []).find(s => s.name === 'تم التسليم');
      const returnStatuses = (sts || []).filter(s => s.name.includes('مرتجع') && s.name !== 'مرتجع دون شحن');
      const partialStatus = (sts || []).find(s => s.name === 'تسليم جزئي');

      const deliveredTotal = ords.filter(o => o.status_id === deliveredStatus?.id).reduce((s, o) => s + Number(o.price), 0);
      const returnedTotal = ords.filter(o => returnStatuses.some(rs => rs.id === o.status_id)).reduce((s, o) => s + Number(o.price), 0);
      const partialTotal = ords.filter(o => o.status_id === partialStatus?.id).reduce((s, o) => s + Number(o.partial_amount || 0), 0);
      const advancePaid = (pays || []).filter(p => p.type === 'advance').reduce((s, p) => s + Number(p.amount), 0);
      const commission = (pays || []).filter(p => p.type === 'commission').reduce((s, p) => s + Number(p.amount), 0);

      setAccountData({
        orderCount: ords.length,
        deliveredTotal,
        returnedTotal,
        partialTotal,
        advancePaid,
        commission,
        settlement: deliveredTotal + partialTotal - returnedTotal,
      });
    }

    setLoading(false);
  };

  const getStatusName = (statusId: string) => statuses.find(s => s.id === statusId)?.name || '-';
  const getStatusColor = (statusId: string) => statuses.find(s => s.id === statusId)?.color || '#6b7280';

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">بوابة المكتب</h1>
            {officeName && <p className="text-muted-foreground text-sm">{officeName}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 ml-1" />
            خروج
          </Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="bg-secondary">
            <TabsTrigger value="orders" className="gap-1">
              <Package className="h-4 w-4" />
              الأوردرات
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1">
              <CreditCard className="h-4 w-4" />
              الحساب
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-right">رقم التتبع</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">الهاتف</TableHead>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-right">السعر</TableHead>
                        <TableHead className="text-right">الشحن</TableHead>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">جارٍ التحميل...</TableCell></TableRow>
                      ) : orders.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell></TableRow>
                      ) : orders.map(o => (
                        <TableRow key={o.id} className="border-border">
                          <TableCell className="font-mono text-xs">{o.tracking_id}</TableCell>
                          <TableCell className="font-medium text-sm">{o.customer_name}</TableCell>
                          <TableCell dir="ltr" className="text-sm">{o.customer_phone}</TableCell>
                          <TableCell className="text-sm">{o.product_name}</TableCell>
                          <TableCell className="text-sm font-bold">{o.price} ج.م</TableCell>
                          <TableCell className="text-sm">{o.delivery_price} ج.م</TableCell>
                          <TableCell className="text-sm">{o.address || '-'}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: getStatusColor(o.status_id) }} className="text-xs text-white">
                              {getStatusName(o.status_id)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString('ar-EG')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-4 space-y-4">
            {accountData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-card border-border p-3">
                  <p className="text-xs text-muted-foreground">عدد الأوردرات</p>
                  <p className="text-lg font-bold">{accountData.orderCount}</p>
                </Card>
                <Card className="bg-card border-border p-3">
                  <p className="text-xs text-muted-foreground">التسليمات</p>
                  <p className="text-lg font-bold text-emerald-500">{accountData.deliveredTotal} ج.م</p>
                </Card>
                <Card className="bg-card border-border p-3">
                  <p className="text-xs text-muted-foreground">المرتجع</p>
                  <p className="text-lg font-bold text-destructive">{accountData.returnedTotal} ج.م</p>
                </Card>
                <Card className="bg-card border-border p-3">
                  <p className="text-xs text-muted-foreground">المستحق</p>
                  <p className="text-lg font-bold text-primary">{accountData.settlement} ج.م</p>
                </Card>
              </div>
            )}

            {/* Payments history */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">سجل الدفعات</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">ملاحظات</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">لا توجد دفعات</TableCell></TableRow>
                      ) : payments.map(p => (
                        <TableRow key={p.id} className="border-border">
                          <TableCell className="text-sm">{p.type === 'advance' ? 'دفعة مقدمة' : 'عمولة'}</TableCell>
                          <TableCell className="font-bold text-sm">{p.amount} ج.م</TableCell>
                          <TableCell className="text-sm">{p.notes || '-'}</TableCell>
                          <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString('ar-EG')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
