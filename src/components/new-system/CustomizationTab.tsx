import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2, Layout, FormInput, Zap, Globe, Smartphone } from 'lucide-react';

const planned = [
  { icon: Layout, title: 'داشبورد قابل للتخصيص', desc: 'كل مستخدم يرتب الويدجتس على ذوقه' },
  { icon: FormInput, title: 'حقول مخصصة للأوردر', desc: 'المالك يضيف حقول إضافية حسب حاجته' },
  { icon: Zap, title: 'قواعد أتمتة (Automation Rules)', desc: 'لو حالة اتغيرت لـ X اعمل Y أوتوماتيك' },
  { icon: Globe, title: 'واجهة API خارجية', desc: 'ربط السيستم بأنظمة تانية' },
  { icon: Smartphone, title: 'تطبيق موبايل للمندوب', desc: 'واجهة مخصصة للموبايل' },
];

export default function CustomizationTab() {
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" /> تخصيص</CardTitle></CardHeader>
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
