import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onOrderAdded: () => void;
}

export default function AddOrderDialog({ onOrderAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [companies, setCompanies] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    product_name: '',
    product_id: '',
    quantity: 1,
    price: 0,
    delivery_price: 0,
    company_id: '',
    office_id: '',
    status_id: '',
    governorate: '',
    color: '',
    size: '',
    barcode: '',
    customer_code: '',
  });

  useEffect(() => {
    if (open) loadDropdowns();
  }, [open]);

  const loadDropdowns = async () => {
    const [c, o, p, s] = await Promise.all([
      supabase.from('companies').select('id, name').order('name'),
      supabase.from('offices').select('id, name').order('name'),
      supabase.from('products').select('id, name, quantity').order('name'),
      supabase.from('order_statuses').select('id, name').order('sort_order'),
    ]);
    setCompanies(c.data || []);
    setOffices(o.data || []);
    setProducts(p.data || []);
    setStatuses(s.data || []);
  };

  const resetForm = () => setForm({
    customer_name: '', customer_phone: '', product_name: '', product_id: '',
    quantity: 1, price: 0, delivery_price: 0, company_id: '', office_id: '',
    status_id: '', governorate: '', color: '', size: '', barcode: '', customer_code: '',
  });

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setForm(f => ({
      ...f,
      product_id: productId,
      product_name: product?.name || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      toast({ title: 'خطأ', description: 'اسم العميل ورقم الهاتف مطلوبين', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const orderData: any = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        product_name: form.product_name || 'بدون منتج',
        quantity: form.quantity,
        price: form.price,
        delivery_price: form.delivery_price,
        governorate: form.governorate,
        color: form.color,
        size: form.size,
        barcode: form.barcode,
        customer_code: form.customer_code,
        tracking_id: 'temp', // trigger will replace
      };
      if (form.company_id) orderData.company_id = form.company_id;
      if (form.office_id) orderData.office_id = form.office_id;
      if (form.product_id) orderData.product_id = form.product_id;
      if (form.status_id) orderData.status_id = form.status_id;

      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      // Deduct product stock if product selected
      if (form.product_id && form.quantity > 0) {
        const product = products.find(p => p.id === form.product_id);
        if (product) {
          await supabase.from('products').update({
            quantity: Math.max(0, product.quantity - form.quantity),
          }).eq('id', form.product_id);
        }
      }

      toast({ title: 'تم', description: 'تم إضافة الأوردر بنجاح' });
      resetForm();
      setOpen(false);
      onOrderAdded();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message || 'حصل خطأ', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 ml-2" />إضافة أوردر</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>إضافة أوردر جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم العميل *</Label>
              <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                className="bg-secondary border-border" placeholder="اسم العميل" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف *</Label>
              <Input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)}
                className="bg-secondary border-border" placeholder="01xxxxxxxxx" dir="ltr" />
            </div>
          </div>

          {/* Product */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المنتج</Label>
              <Select value={form.product_id} onValueChange={handleProductSelect}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="اختر منتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity} متاح)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الكمية</Label>
              <Input type="number" min={1} value={form.quantity}
                onChange={e => set('quantity', parseInt(e.target.value) || 1)}
                className="bg-secondary border-border" />
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>السعر (ج.م)</Label>
              <Input type="number" min={0} value={form.price}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
                className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>سعر التوصيل (ج.م)</Label>
              <Input type="number" min={0} value={form.delivery_price}
                onChange={e => set('delivery_price', parseFloat(e.target.value) || 0)}
                className="bg-secondary border-border" />
            </div>
          </div>

          {/* Company & Office */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الشركة</Label>
              <Select value={form.company_id} onValueChange={v => set('company_id', v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="اختر شركة" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المكتب</Label>
              <Select value={form.office_id} onValueChange={v => set('office_id', v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="اختر مكتب" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status & Governorate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={form.status_id} onValueChange={v => set('status_id', v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="اختر حالة" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المحافظة</Label>
              <Input value={form.governorate} onChange={e => set('governorate', e.target.value)}
                className="bg-secondary border-border" placeholder="المحافظة" />
            </div>
          </div>

          {/* Extra details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>اللون</Label>
              <Input value={form.color} onChange={e => set('color', e.target.value)}
                className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>المقاس</Label>
              <Input value={form.size} onChange={e => set('size', e.target.value)}
                className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>الباركود</Label>
              <Input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                className="bg-secondary border-border" dir="ltr" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة الأوردر'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
