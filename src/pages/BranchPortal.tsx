import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, Plus, Loader2, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function BranchPortal() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    setBranchName(data?.full_name || 'فرع');
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الأوردر؟')) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      toast.success('تم حذف الأوردر');
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">بوابة الفرع</h1>
            <p className="text-muted-foreground text-sm">{branchName}</p>
          </div>
          <div className="flex gap-2">
            <AddBranchOrderDialog branchName={branchName} userId={user?.id} onOrderAdded={loadData} />
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 ml-1" />
              خروج
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-right">الباركود</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">المكتب</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد أوردرات</TableCell></TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id} className="border-border relative">
                      <TableCell className="font-mono font-bold text-sm">{o.barcode || '-'}</TableCell>
                      <TableCell className="font-medium text-sm">{o.customer_name}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{o.customer_phone}</TableCell>
                      <TableCell className="text-sm">{o.product_name}</TableCell>
                      <TableCell className="text-sm font-bold">{o.price} ج.م</TableCell>
                      <TableCell className="text-sm">{o.governorate || '-'}</TableCell>
                      <TableCell>
                        {o.is_pending_approval ? (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                            <Clock className="h-3 w-3 ml-1" />
                            في انتظار الموافقة
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-emerald-600 text-white">
                            <CheckCircle className="h-3 w-3 ml-1" />
                            تمت الموافقة
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(o.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AddBranchOrderDialog({ branchName, userId, onOrderAdded }: { branchName: string; userId?: string; onOrderAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_code: '',
    product_name: '', quantity: '1', price: '0', delivery_price: '0',
    color: '', size: '', address: '', notes: '',
    office_id: '',
  });

  useEffect(() => {
    if (open) {
      supabase.from('offices').select('id, name').order('name').then(({ data }) => setOffices(data || []));
    }
  }, [open]);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const totalCollection = (parseFloat(form.price) || 0) + (parseFloat(form.delivery_price) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      toast.error('اسم العميل ورقم الهاتف مطلوبين');
      return;
    }
    if (!form.office_id) {
      toast.error('اختيار المكتب إجباري');
      return;
    }
    if (!form.address.trim()) {
      toast.error('العنوان إجباري');
      return;
    }
    if (!(parseFloat(form.price) > 0)) {
      toast.error('السعر إجباري');
      return;
    }

    setLoading(true);
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
        color: form.color,
        size: form.size,
        address: form.address,
        notes: form.notes,
        office_id: form.office_id,
        tracking_id: 'temp',
        is_pending_approval: true,
        branch_label: branchName,
        created_by: userId,
      });
      if (error) throw error;

      toast.success('تم إضافة الأوردر - في انتظار الموافقة');
      setForm({
        customer_name: '', customer_phone: '', customer_code: '',
        product_name: '', quantity: '1', price: '0', delivery_price: '0',
        color: '', size: '', address: '', notes: '',
        office_id: '',
      });
      setOpen(false);
      onOrderAdded();
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 ml-1" />إضافة أوردر</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader><DialogTitle>إضافة أوردر جديد</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
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
            <Label className="text-xs">المحافظة</Label>
            <Input value={form.governorate} onChange={e => set('governorate', e.target.value)} className="bg-secondary border-border" />
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

          <div className="p-2 bg-secondary rounded border border-border text-center">
            <span className="text-xs text-muted-foreground">إجمالي التحصيل: </span>
            <span className="font-bold">{totalCollection} ج.م</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">اللون</Label>
              <Input value={form.color} onChange={e => set('color', e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المقاس</Label>
              <Input value={form.size} onChange={e => set('size', e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="bg-secondary border-border" rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة الأوردر'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
