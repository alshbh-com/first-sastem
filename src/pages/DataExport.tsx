import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, Package, Building2, Truck, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

function downloadCSV(data: any[], filename: string) {
  if (!data.length) { toast.error('لا توجد بيانات للتصدير'); return; }
  const headers = Object.keys(data[0]);
  const csv = [
    '\uFEFF' + headers.join(','),
    ...data.map(row => headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  toast.success('تم التصدير بنجاح');
}

const exportOptions = [
  {
    id: 'orders', title: 'الأوردرات', icon: Package, color: 'hsl(217,91%,60%)',
    desc: 'تصدير جميع الأوردرات مع البيانات الكاملة',
  },
  {
    id: 'orders-open', title: 'الأوردرات المفتوحة', icon: Package, color: 'hsl(142,76%,36%)',
    desc: 'تصدير الأوردرات المفتوحة فقط',
  },
  {
    id: 'orders-closed', title: 'الأوردرات المغلقة', icon: Package, color: 'hsl(215,20%,60%)',
    desc: 'تصدير الأوردرات المغلقة فقط',
  },
  {
    id: 'offices', title: 'المكاتب', icon: Building2, color: 'hsl(142,76%,36%)',
    desc: 'تصدير بيانات المكاتب',
  },
  {
    id: 'couriers', title: 'المناديب', icon: Truck, color: 'hsl(38,92%,50%)',
    desc: 'تصدير بيانات المناديب',
  },
  {
    id: 'customers', title: 'العملاء', icon: Users, color: 'hsl(270,60%,60%)',
    desc: 'تصدير بيانات العملاء',
  },
  {
    id: 'payments', title: 'المدفوعات', icon: DollarSign, color: 'hsl(0,72%,51%)',
    desc: 'تصدير سجل المدفوعات',
  },
];

export default function DataExport() {
  const [loading, setLoading] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const doExport = async (type: string) => {
    setLoading(type);
    try {
      switch (type) {
        case 'orders':
        case 'orders-open':
        case 'orders-closed': {
          let query = supabase.from('orders').select('tracking_id, barcode, customer_code, customer_name, customer_phone, product_name, quantity, price, delivery_price, governorate, address, is_closed, created_at');
          if (type === 'orders-open') query = query.eq('is_closed', false);
          if (type === 'orders-closed') query = query.eq('is_closed', true);
          if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
          if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);
          const { data } = await query.order('created_at', { ascending: false });
          downloadCSV((data || []).map(o => ({
            'رقم التتبع': o.tracking_id, 'الباركود': o.barcode, 'الكود': o.customer_code,
            'العميل': o.customer_name, 'الهاتف': o.customer_phone, 'المنتج': o.product_name,
            'الكمية': o.quantity, 'السعر': o.price, 'الشحن': o.delivery_price,
            'الإجمالي': Number(o.price) + Number(o.delivery_price),
            'المحافظة': o.governorate, 'العنوان': o.address,
            'مغلق': o.is_closed ? 'نعم' : 'لا', 'التاريخ': new Date(o.created_at).toLocaleDateString('ar-EG'),
          })), 'orders');
          break;
        }
        case 'offices': {
          const { data } = await supabase.from('offices').select('*');
          downloadCSV((data || []).map(o => ({
            'المكتب': o.name, 'المالك': o.owner_name, 'الهاتف': o.owner_phone,
            'العنوان': o.address, 'التخصص': o.specialty, 'ملاحظات': o.notes,
          })), 'offices');
          break;
        }
        case 'couriers': {
          const { data } = await supabase.from('profiles').select('*, user_roles(role)');
          const couriers = (data || []).filter((p: any) => p.user_roles?.some((r: any) => r.role === 'courier'));
          downloadCSV(couriers.map(c => ({
            'الاسم': c.full_name, 'الهاتف': c.phone, 'العنوان': c.address,
            'الراتب': c.salary, 'نشط': c.is_active ? 'نعم' : 'لا',
          })), 'couriers');
          break;
        }
        case 'customers': {
          const { data } = await supabase.from('customers').select('*');
          downloadCSV((data || []).map(c => ({
            'الاسم': c.name, 'الهاتف': c.phone, 'تاريخ الإضافة': new Date(c.created_at).toLocaleDateString('ar-EG'),
          })), 'customers');
          break;
        }
        case 'payments': {
          const { data } = await supabase.from('office_payments').select('*, offices:office_id(name)');
          downloadCSV((data || []).map((p: any) => ({
            'المكتب': p.offices?.name || '-', 'المبلغ': p.amount, 'النوع': p.type,
            'ملاحظات': p.notes, 'التاريخ': new Date(p.created_at).toLocaleDateString('ar-EG'),
          })), 'payments');
          break;
        }
      }
    } catch (err) {
      toast.error('خطأ في التصدير');
    }
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <FileSpreadsheet className="h-6 w-6 text-primary" />تصدير البيانات
      </h1>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">من تاريخ</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-secondary border-border w-[150px]" /></div>
            <div><Label className="text-xs">إلى تاريخ</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-secondary border-border w-[150px]" /></div>
            <p className="text-xs text-muted-foreground">* الفلتر بالتاريخ يعمل على الأوردرات فقط</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {exportOptions.map(opt => (
          <Card key={opt.id} className="bg-card border-border hover:bg-secondary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg p-2 shrink-0" style={{ backgroundColor: opt.color + '20' }}>
                  <opt.icon className="h-5 w-5" style={{ color: opt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => doExport(opt.id)} disabled={loading === opt.id}>
                <Download className="h-4 w-4 ml-1" />{loading === opt.id ? 'جاري...' : 'تصدير CSV'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
