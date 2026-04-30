import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, ArrowRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';

export default function BranchDiaries() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [openDiary, setOpenDiary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [dRes, uRes] = await Promise.all([
      supabase
        .from('branch_simple_diaries' as any)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ]);
    setDiaries(dRes.data || []);
    const map: Record<string, string> = {};
    (uRes.data || []).forEach((u: any) => { map[u.id] = u.full_name || ''; });
    setUsers(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removeDiary = async (id: string) => {
    if (!confirm('هل تريد حذف هذه اليومية نهائياً؟')) return;
    const { error } = await supabase
      .from('branch_simple_diaries' as any)
      .delete()
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    await logActivity('حذف يومية فرع', { diary_id: id });
    toast.success('تم الحذف');
    load();
  };

  if (openDiary) {
    return <BranchDiaryReadOnly diary={openDiary} branchName={users[openDiary.branch_user_id]} onClose={() => setOpenDiary(null)} />;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          يوميات الفروع
        </h1>
        <p className="text-sm text-muted-foreground">عرض اليوميات اللي بتسجلها الفروع (للقراءة فقط)</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : diaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد يوميات من الفروع بعد</div>
          ) : (
            <div className="divide-y divide-border">
              {diaries.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 hover:bg-secondary/50 cursor-pointer gap-3"
                  onClick={() => setOpenDiary(d)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {d.title || `يومية ${format(new Date(d.diary_date), 'dd/MM/yyyy')}`}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {format(new Date(d.diary_date), 'dd/MM/yyyy')} • فرع: {users[d.branch_user_id] || '—'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">قراءة</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeDiary(d.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BranchDiaryReadOnly({ diary, branchName, onClose }: { diary: any; branchName?: string; onClose: () => void }) {
  const customerDue = (diary.previous_him || 0) - ((diary.previous_us || 0) + (diary.return_value || 0) + (diary.reject_shipping || 0));
  const netDiary = (customerDue + (diary.new_diary_value || 0)) - (diary.arrived || 0);
  const netWithDescent = netDiary + ((diary.descent_value || 0) + (diary.descent_discount || 0));

  const row = (label: string, value: any) => (
    <div className="flex justify-between text-sm py-1 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || 0}</span>
    </div>
  );

  const result = (label: string, signedValue: number) => {
    const isHim = signedValue >= 0;
    return (
      <div className="rounded-lg bg-primary/5 border-2 border-primary/30 p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{Math.abs(signedValue).toLocaleString('en-US')}</div>
        <div className={`text-sm font-bold mt-1 ${isHim ? 'text-green-600' : 'text-red-600'}`}>
          {isHim ? 'له' : 'لينا'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowRight className="h-5 w-5" /></Button>
        <div>
          <h2 className="font-bold">{diary.title || `يومية ${format(new Date(diary.diary_date), 'dd/MM/yyyy')}`}</h2>
          <p className="text-xs text-muted-foreground">
            {format(new Date(diary.diary_date), 'dd/MM/yyyy')} • فرع: {branchName || '—'}
          </p>
        </div>
      </div>

      <Card><CardContent className="p-3 space-y-2">
        <h3 className="font-bold text-sm mb-2">الرصيد السابق</h3>
        {row('له', diary.previous_him)}
        {row('لينا', diary.previous_us)}
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-2">
        <h3 className="font-bold text-sm mb-2">المرتجع والرفض</h3>
        {row('عدد المرتجع', diary.return_count)}
        {row('عدد القطع', diary.return_pieces_count)}
        {row('قيمة المرتجع', diary.return_value)}
        {row('رفض شحن', diary.reject_shipping)}
        <div className="pt-2">{result('المستحق', customerDue)}</div>
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-2">
        <h3 className="font-bold text-sm mb-2">اليومية الجديدة</h3>
        {row('قيمتها', diary.new_diary_value)}
        {row('الواصل', diary.arrived)}
        {row('عدد الأوردرات', diary.new_diary_orders_count)}
        {row('عدد القطع', diary.new_diary_pieces_count)}
        <div className="pt-2">{result('صافي اليومية', netDiary)}</div>
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-2">
        <h3 className="font-bold text-sm mb-2">النزول</h3>
        {row('قيمة النزول', diary.descent_value)}
        {row('خصم', diary.descent_discount)}
        {row('عدد الأوردرات', diary.descent_orders_count)}
        {row('عدد القطع', diary.descent_pieces_count)}
        <div className="pt-2">{result('الصافي بالنزول', netWithDescent)}</div>
      </CardContent></Card>

      {diary.notes && (
        <Card><CardContent className="p-3">
          <Label className="text-xs">ملاحظات</Label>
          <p className="text-sm mt-1">{diary.notes}</p>
        </CardContent></Card>
      )}
    </div>
  );
}

function Label({ children, className }: any) {
  return <span className={`text-muted-foreground ${className || ''}`}>{children}</span>;
}
