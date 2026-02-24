import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onOrderAdded: () => void;
}

export default function AddOrderDialog({ onOrderAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);

  const emptyForm = {
    customer_name: '', customer_phone: '', customer_code: '',
    product_name: '', product_id: '',
    quantity: '', price: '', delivery_price: '',
    company_id: '', office_id: '', status_id: '',
    governorate: '', color: '', size: '',
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => { if (open) loadDropdowns(); }, [open]);

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

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setForm(f => ({ ...f, product_id: productId, product_name: product?.name || '' }));
  };

  const totalCollection = (parseFloat(form.price) || 0) + (parseFloat(form.delivery_price) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      toast.error('اسم العميل ورقم الهاتف مطلوبين');
      return;
    }

    setLoading(true);
    try {
      const qty = parseInt(form.quantity) || 1;
      const price = parseFloat(form.price) || 0;
      const deliveryPrice = parseFloat(form.delivery_price) || 0;

      // Generate numeric-only barcode from sequence
      const { data: seqData } = await supabase.rpc('nextval_barcode' as any);
      const barcode = seqData ? String(seqData) : String(Date.now());

      const orderData: any = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_code: form.customer_code || null,
        product_name: form.product_name || 'بدون منتج',
        quantity: qty, price, delivery_price: deliveryPrice,
        governorate: form.governorate, color: form.color, size: form.size,
        barcode,
        tracking_id: 'temp',
      };
      if (form.company_id) orderData.company_id = form.company_id;
      if (form.office_id) orderData.office_id = form.office_id;
      if (form.product_id) orderData.product_id = form.product_id;
      if (form.status_id) orderData.status_id = form.status_id;

      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      // Deduct stock
      if (form.product_id && qty > 0) {
        const product = products.find(p => p.id === form.product_id);
        if (product) {
          await supabase.from('products').update({ quantity: Math.max(0, product.quantity - qty) }).eq('id', form.product_id);
        }
      }

      toast.success('تم إضافة الأوردر بنجاح');
      setForm(emptyForm);
      setOpen(false);
      onOrderAdded();
    } catch (err: any) {
      toast.error(err.message || 'حصل خطأ');
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
        <DialogHeader><DialogTitle>إضافة أوردر جديد</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم العميل *</Label>
              <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} className="bg-secondary border-border" placeholder="اسم العميل" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف *</Label>
              <Input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} className="bg-secondary border-border" placeholder="01xxxxxxxxx" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الكود (يدوي - اختياري)</Label>
              <Input value={form.customer_code} onChange={e => set('customer_code', e.target.value)} className="bg-secondary border-border" placeholder="كود المكتب" />
            </div>
            <div className="space-y-2">
              <Label>المحافظة</Label>
              <Input value={form.governorate} onChange={e => set('governorate', e.target.value)} className="bg-secondary border-border" placeholder="المحافظة" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المنتج (اختيار من القائمة)</Label>
              <Select value={form.product_id} onValueChange={handleProductSelect}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر منتج" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity} متاح)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>أو اكتب اسم المنتج</Label>
              <Input value={form.product_name} onChange={e => set('product_name', e.target.value)} className="bg-secondary border-border" placeholder="اسم المنتج يدوي" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>الكمية</Label>
              <Input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)}
                onFocus={e => { if (e.target.value === '1' || e.target.value === '0') set('quantity', ''); }}
                className="bg-secondary border-border" placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>السعر (ج.م)</Label>
              <Input type="number" min={0} value={form.price} onChange={e => set('price', e.target.value)}
                onFocus={e => { if (e.target.value === '0') set('price', ''); }}
                className="bg-secondary border-border" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>سعر التوصيل (ج.م)</Label>
              <Input type="number" min={0} value={form.delivery_price} onChange={e => set('delivery_price', e.target.value)}
                onFocus={e => { if (e.target.value === '0') set('delivery_price', ''); }}
                className="bg-secondary border-border" placeholder="0" />
            </div>
          </div>

          {/* Auto-calculated total */}
          <div className="p-3 bg-secondary rounded-lg border border-border text-center">
            <span className="text-sm text-muted-foreground">إجمالي التحصيل: </span>
            <span className="text-lg font-bold">{totalCollection} ج.م</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الشركة</Label>
              <Select value={form.company_id} onValueChange={v => set('company_id', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر شركة" /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المكتب</Label>
              <Select value={form.office_id} onValueChange={v => set('office_id', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
                <SelectContent>{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={form.status_id} onValueChange={v => set('status_id', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر حالة" /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اللون</Label>
              <Input value={form.color} onChange={e => set('color', e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>المقاس</Label>
            <Input value={form.size} onChange={e => set('size', e.target.value)} className="bg-secondary border-border" />
          </div>

          <p className="text-xs text-muted-foreground">* الباركود يتم توليده تلقائياً (رقمي فقط)</p>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة الأوردر'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
