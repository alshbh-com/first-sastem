import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, UserCheck, KeyRound, Clock } from 'lucide-react';

const planned = [
  { icon: Lock, title: 'سجل دخول تفصيلي', desc: 'مين دخل إمتى ومن أي جهاز' },
  { icon: Clock, title: 'قفل تلقائي بعد عدم نشاط', desc: 'لو المستخدم سكت 30 دقيقة يتقفل' },
  { icon: Eye, title: 'صلاحيات على مستوى المكتب', desc: 'مسؤول يشوف مكتب معين بس' },
  { icon: UserCheck, title: 'نظام الموافقات', desc: 'عمليات معينة تحتاج موافقة المالك' },
  { icon: KeyRound, title: 'تشفير البيانات الحساسة', desc: 'أرقام تليفونات العملاء تتشفر' },
  { icon: Shield, title: 'صلاحيات على مستوى الحقل', desc: 'إخفاء أعمدة معينة لمستخدمين معينين' },
  { icon: Lock, title: 'وضع القراءة فقط', desc: 'مستخدمين معينين يشوفوا بس' },
  { icon: Clock, title: 'قفل تعديل الأوردر بعد فترة', desc: 'منع التعديل بعد وقت معين' },
  { icon: KeyRound, title: 'نظام OTP للعمليات الحساسة', desc: 'كود تأكيد للعمليات المهمة' },
  { icon: Shield, title: 'تقرير أمني شهري', desc: 'محاولات دخول وتغييرات حساسة' },
  { icon: Lock, title: 'تحديد ساعات عمل لكل مستخدم', desc: 'يدخل في أوقات معينة بس' },
  { icon: Eye, title: 'تسجيل كل عملية تصدير', desc: 'مين صدّر إيه' },
  { icon: UserCheck, title: 'موافقة المالك على الحذف النهائي', desc: 'لازم موافقة قبل الحذف' },
  { icon: KeyRound, title: 'نسخ احتياطي يدوي', desc: 'تصدير كامل للبيانات' },
];

export default function SecurityTab() {
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> أمان وصلاحيات متقدمة</CardTitle></CardHeader>
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
