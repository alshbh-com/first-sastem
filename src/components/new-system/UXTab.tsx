import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Moon, Keyboard, Home, Bookmark, Clock, Maximize, GripVertical, Save, HelpCircle, Bell } from 'lucide-react';

const planned = [
  { icon: Moon, title: 'وضع مظلم/فاتح لكل مستخدم', desc: 'كل مستخدم يختار الوضع المناسب' },
  { icon: Keyboard, title: 'اختصارات لوحة مفاتيح', desc: 'Ctrl+N أوردر جديد وغيرها' },
  { icon: Home, title: 'صفحة بداية مخصصة', desc: 'كل مستخدم يختار صفحته الرئيسية' },
  { icon: Bookmark, title: 'إشارات مرجعية للأوردرات', desc: 'الأوردرات المهمة' },
  { icon: Clock, title: 'آخر 10 حركات على الداشبورد', desc: 'عرض سريع لآخر النشاطات' },
  { icon: Maximize, title: 'وضع ملء الشاشة للجداول', desc: 'عرض موسع للبيانات' },
  { icon: GripVertical, title: 'سحب وإفلات لترتيب الأعمدة', desc: 'ترتيب حسب الرغبة' },
  { icon: Save, title: 'حفظ إعدادات الفلاتر المفضلة', desc: 'فلاتر جاهزة بضغطة' },
  { icon: HelpCircle, title: 'نظام مساعدة داخلي', desc: 'شرح كل قسم' },
  { icon: Bell, title: 'صفحة ما الجديد', desc: 'آخر التحديثات والتغييرات' },
];

export default function UXTab() {
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> تجربة المستخدم</CardTitle></CardHeader>
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
