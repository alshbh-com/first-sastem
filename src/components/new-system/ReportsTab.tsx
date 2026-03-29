import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileBarChart, Receipt, Calendar, Filter, Users, DollarSign, Clock, BarChart3 } from 'lucide-react';

const planned = [
  { icon: FileText, title: 'تقرير PDF شامل قابل للتخصيص', desc: 'تختار الأعمدة والفلاتر' },
  { icon: Receipt, title: 'إنشاء عقود تعاون مع المكاتب', desc: 'PDF جاهز للطباعة' },
  { icon: FileBarChart, title: 'كشف حساب مفصل لكل مكتب', desc: 'PDF بكل التفاصيل' },
  { icon: Calendar, title: 'تقرير مقارنة فترات', desc: 'هذا الشهر مقابل اللي فات' },
  { icon: Filter, title: 'تقرير مخصص', desc: 'المستخدم يختار الأعمدة والفلاتر' },
  { icon: Users, title: 'جدول رواتب المندوبين الشهري', desc: 'كشف رواتب جاهز' },
  { icon: DollarSign, title: 'إيصال استلام فلوس من المندوب', desc: 'PDF للطباعة' },
  { icon: Clock, title: 'ملخص يومي تلقائي للمالك', desc: 'يتبعت كل يوم' },
  { icon: BarChart3, title: 'تقرير أوردرات بدون حركة', desc: 'أوردرات راكدة' },
  { icon: FileText, title: 'تقرير أداء النظام', desc: 'سرعة واستخدام' },
];

export default function ReportsTab() {
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> تقارير ومستندات</CardTitle></CardHeader>
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
