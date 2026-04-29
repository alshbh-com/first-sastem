import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowRight, Save, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';

type Diary = {
  id: string;
  branch_user_id: string;
  title: string;
  diary_date: string;
  previous_him: number;
  previous_us: number;
  return_count: number;
  return_pieces_count: number;
  return_value: number;
  reject_shipping: number;
  new_diary_value: number;
  new_diary_orders_count: number;
  new_diary_pieces_count: number;
  arrived: number;
  descent_value: number;
  descent_discount: number;
  descent_orders_count: number;
  descent_pieces_count: number;
  notes: string;
};

interface Props {
  userId: string;
}

export default function BranchSimpleDiary({ userId }: Props) {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [openDiary, setOpenDiary] = useState<Diary | null>(null);
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTitle, setNewTitle] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('branch_simple_diaries' as any)
      .select('*')
      .eq('branch_user_id', userId)
      .is('deleted_at', null)
      .order('diary_date', { ascending: false });
    setDiaries(data || []);
    setLoading(false);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const createDiary = async () => {
    const { data, error } = await supabase
      .from('branch_simple_diaries' as any)
      .insert({ branch_user_id: userId, diary_date: newDate })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    toast.success('تم إنشاء يومية جديدة');
    setCreateOpen(false);
    setOpenDiary(data as any);
    load();
  };

  const removeDiary = async (id: string) => {
    if (!confirm('نقل اليومية إلى سلة المحذوفات؟')) return;
    const { error } = await supabase
      .from('branch_simple_diaries' as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('تم الحذف');
    load();
  };

  if (openDiary) {
    return (
      <BranchDiaryEditor
        diary={openDiary}
        onClose={() => { setOpenDiary(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            اليوميات البسيطة
          </h2>
          <p className="text-xs text-muted-foreground">إدارة يوميات الفرع المالية</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 ml-1" />يومية جديدة</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>إنشاء يومية جديدة</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>تاريخ اليومية</Label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
              <Button onClick={createDiary}><Save className="h-4 w-4 ml-1" />فتح وحفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : diaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد يوميات بعد</div>
          ) : (
            <div className="divide-y divide-border">
              {diaries.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 hover:bg-secondary/50 cursor-pointer"
                     onClick={() => setOpenDiary(d)}>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">يومية {format(new Date(d.diary_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
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

function BranchDiaryEditor({ diary, onClose }: { diary: Diary; onClose: () => void }) {
  const [form, setForm] = useState<Diary>(diary);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Diary, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('branch_simple_diaries' as any)
      .update({
        diary_date: form.diary_date,
        previous_him: form.previous_him,
        previous_us: form.previous_us,
        return_count: form.return_count,
        return_pieces_count: form.return_pieces_count,
        return_value: form.return_value,
        reject_shipping: form.reject_shipping,
        new_diary_value: form.new_diary_value,
        new_diary_orders_count: form.new_diary_orders_count,
        new_diary_pieces_count: form.new_diary_pieces_count,
        arrived: form.arrived,
        descent_value: form.descent_value,
        descent_discount: form.descent_discount,
        descent_orders_count: form.descent_orders_count,
        descent_pieces_count: form.descent_pieces_count,
        notes: form.notes,
      })
      .eq('id', diary.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('تم الحفظ');
  };

  // Same calculations as office simple diary
  const customerDue = form.previous_him - (form.previous_us + form.return_value + form.reject_shipping);
  const netDiary = (customerDue + form.new_diary_value) - form.arrived;
  const netWithDescent = netDiary + (form.descent_value + form.descent_discount);

  const numberInput = (label: string, key: keyof Diary) => {
    const value = (form as any)[key];
    const isZero = !value || value === 0;
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          value={isZero ? '' : value}
          placeholder="0"
          onChange={(e) => set(key, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
          className={isZero ? 'placeholder:text-muted-foreground/40' : ''}
        />
      </div>
    );
  };

  const result = (label: string, signedValue: number) => {
    const isHim = signedValue >= 0;
    const abs = Math.abs(signedValue);
    return (
      <div className="rounded-lg bg-primary/5 border-2 border-primary/30 p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold text-foreground">{abs.toLocaleString('en-US')}</div>
        <div className={`text-sm font-bold mt-1 ${isHim ? 'text-green-600' : 'text-red-600'}`}>
          {isHim ? 'له' : 'لينا'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="font-bold">يومية {format(new Date(form.diary_date), 'dd/MM/yyyy')}</h2>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          <Save className="h-4 w-4 ml-1" />حفظ
        </Button>
      </div>

      <Card><CardContent className="p-3">
        <Label className="text-xs">تاريخ اليومية</Label>
        <Input type="date" value={form.diary_date} onChange={(e) => set('diary_date', e.target.value)} className="w-48 mt-1" />
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-3">
        <h3 className="font-bold text-sm">الرصيد السابق</h3>
        <div className="grid grid-cols-2 gap-3">
          {numberInput('له', 'previous_him')}
          {numberInput('لينا', 'previous_us')}
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-3">
        <h3 className="font-bold text-sm">المرتجع والرفض</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid grid-cols-2 gap-3">
            {numberInput('عدد المرتجع', 'return_count')}
            {numberInput('عدد القطع', 'return_pieces_count')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {numberInput('قيمة المرتجع', 'return_value')}
            {numberInput('رفض شحن', 'reject_shipping')}
          </div>
        </div>
        <div>{result('المستحق', customerDue)}</div>
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-3">
        <h3 className="font-bold text-sm">اليومية الجديدة</h3>
        <div className="grid grid-cols-2 gap-3">
          {numberInput('قيمتها', 'new_diary_value')}
          {numberInput('الواصل', 'arrived')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {numberInput('عدد الأوردرات', 'new_diary_orders_count')}
          {numberInput('عدد القطع', 'new_diary_pieces_count')}
        </div>
        <div>{result('صافي اليومية', netDiary)}</div>
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-3">
        <h3 className="font-bold text-sm">النزول</h3>
        <div className="grid grid-cols-2 gap-3">
          {numberInput('قيمة النزول', 'descent_value')}
          {numberInput('خصم', 'descent_discount')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {numberInput('عدد الأوردرات', 'descent_orders_count')}
          {numberInput('عدد القطع', 'descent_pieces_count')}
        </div>
        <div>{result('الصافي بالنزول', netWithDescent)}</div>
      </CardContent></Card>

      <Card><CardContent className="p-3 space-y-2">
        <Label className="text-xs">ملاحظات</Label>
        <Input value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظات اختيارية..." />
      </CardContent></Card>
    </div>
  );
}
