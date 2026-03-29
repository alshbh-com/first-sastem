import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Receipt, CreditCard, PiggyBank, Wallet, TrendingUp } from 'lucide-react';

const planned = [
  { icon: PiggyBank, title: 'ميزانية شهرية', desc: 'تحدد ميزانية وتتابع المصروفات مقابلها' },
  { icon: Receipt, title: 'فواتير إلكترونية', desc: 'إنشاء فاتورة PDF للمكتب أو الشركة' },
  { icon: CreditCard, title: 'نظام الأقساط', desc: 'لو عميل عايز يدفع على أقساط' },
  { icon: DollarSign, title: 'تقرير الضرائب', desc: 'حساب تلقائي للضرائب المستحقة' },
  { icon: Wallet, title: 'محفظة إلكترونية للمندوب', desc: 'رصيد المندوب يزيد وينقص مع كل عملية' },
  { icon: TrendingUp, title: 'تسوية تلقائية آخر الشهر', desc: 'تقفيل كل الحسابات أوتوماتيك' },
  { icon: DollarSign, title: 'نظام عمولات متدرج', desc: 'كل ما يوصل أكثر العمولة تزيد' },
  { icon: PiggyBank, title: 'حساب تكلفة التشغيل', desc: 'تكلفة التشغيل الفعلية' },
  { icon: TrendingUp, title: 'تقرير أرباح وخسائر شهري', desc: 'مفصل بالأرقام' },
  { icon: Wallet, title: 'نظام دفعات مقدمة', desc: 'من العملاء' },
  { icon: Receipt, title: 'تقرير التدفق النقدي اليومي', desc: 'الفلوس الداخلة والخارجة' },
  { icon: TrendingUp, title: 'مقارنة الإيرادات بالمصروفات', desc: 'رسم بياني مقارن' },
];

export default function FinanceTab() {
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> مالي متقدم</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">الميزات المخطط تنفيذها في المرحلة القادمة:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {planned.map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                <item.icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
