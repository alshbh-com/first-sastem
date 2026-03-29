import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, MessageSquare, Mail, AlertTriangle, Clock, UserPlus, ShieldAlert, Package, Wallet, BarChart3 } from 'lucide-react';

const planned = [
  { icon: Bell, title: 'إشعار فوري عند تغيير حالة أوردر', desc: 'إشعار داخلي فوري' },
  { icon: BarChart3, title: 'إشعار يومي بملخص الأداء', desc: 'للمالك' },
  { icon: AlertTriangle, title: 'تنبيه تجاوز مبلغ تحصيل', desc: 'بدون تسليم' },
  { icon: Clock, title: 'تنبيه أوردرات معلقة 48+ ساعة', desc: 'أوردرات متأخرة' },
  { icon: UserPlus, title: 'إشعار عند إضافة مستخدم جديد', desc: 'للمالك والمسؤول' },
  { icon: ShieldAlert, title: 'تنبيه محاولة دخول فاشلة', desc: 'أمان إضافي' },
  { icon: Package, title: 'إشعار أسبوعي بالمرتجعات', desc: 'ملخص أسبوعي' },
  { icon: Package, title: 'تنبيه نفاد مخزون منتج', desc: 'عند الوصول للحد الأدنى' },
  { icon: Wallet, title: 'إشعار تقفيل حساب مندوب', desc: 'عند المسح' },
  { icon: Mail, title: 'ملخص مالي أسبوعي تلقائي', desc: 'تقرير مالي أسبوعي' },
];

export default function NotificationsTab() {
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> إشعارات وتواصل</CardTitle></CardHeader>
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
