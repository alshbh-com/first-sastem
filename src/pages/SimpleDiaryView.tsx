import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Diary = {
  id: string;
  office_id: string;
  diary_date: string;
  previous_him: number;
  previous_us: number;
  return_count: number;
  return_value: number;
  reject_shipping: number;
  customer_due_direction: 'him' | 'us';
  new_diary_value: number;
  arrived: number;
  net_diary_direction: 'him' | 'us';
  descent_value: number;
  net_with_descent_direction: 'him' | 'us';
  notes: string;
};

export default function SimpleDiaryView() {
  const { officeId, diaryId } = useParams<{ officeId: string; diaryId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Diary | null>(null);

  const { data: office } = useQuery({
    queryKey: ['simple-office', officeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('*').eq('id', officeId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!officeId,
  });

  const { data: diary } = useQuery({
    queryKey: ['simple-diary', diaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('office_simple_diaries')
        .select('*')
        .eq('id', diaryId!)
        .single();
      if (error) throw error;
      return data as Diary;
    },
    enabled: !!diaryId,
  });

  useEffect(() => {
    if (diary) setForm(diary);
  }, [diary]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase
        .from('office_simple_diaries')
        .update({
          diary_date: form.diary_date,
          previous_him: form.previous_him,
          previous_us: form.previous_us,
          return_count: form.return_count,
          return_value: form.return_value,
          reject_shipping: form.reject_shipping,
          customer_due_direction: form.customer_due_direction,
          new_diary_value: form.new_diary_value,
          arrived: form.arrived,
          net_diary_direction: form.net_diary_direction,
          descent_value: form.descent_value,
          net_with_descent_direction: form.net_with_descent_direction,
          notes: form.notes,
        })
        .eq('id', diaryId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simple-diary', diaryId] });
      toast.success('تم الحفظ');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return <div className="p-8 text-center">جاري التحميل...</div>;

  // Calculations
  const customerDue = form.previous_him - (form.previous_us + form.return_value + form.reject_shipping);
  const customerDueAbs = Math.abs(customerDue);

  // مستحق العميل بالاتجاه المختار: لو him فموجب يعني له، لو us فموجب يعني لينا
  const customerDueSigned = form.customer_due_direction === 'him' ? customerDueAbs : -customerDueAbs;

  const netDiary = (customerDueSigned + form.new_diary_value) - form.arrived;
  const netDiaryAbs = Math.abs(netDiary);
  const netDiarySigned = form.net_diary_direction === 'him' ? netDiaryAbs : -netDiaryAbs;

  const netWithDescent = netDiarySigned + form.descent_value;
  const netWithDescentAbs = Math.abs(netWithDescent);

  const set = (k: keyof Diary, v: any) => setForm((p) => (p ? { ...p, [k]: v } : p));

  const numberInput = (label: string, key: keyof Diary) => (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        value={(form as any)[key] || 0}
        onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
      />
    </div>
  );

  const directionRadio = (key: keyof Diary) => (
    <RadioGroup
      value={(form as any)[key]}
      onValueChange={(v) => set(key, v)}
      className="flex flex-col gap-1 mt-2"
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value="him" id={`${key}-him`} />
        <Label htmlFor={`${key}-him`} className="text-sm cursor-pointer">له</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="us" id={`${key}-us`} />
        <Label htmlFor={`${key}-us`} className="text-sm cursor-pointer">لينا</Label>
      </div>
    </RadioGroup>
  );

  const result = (label: string, value: number, dir: 'him' | 'us') => (
    <div className="rounded-lg bg-primary/5 border-2 border-primary/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-foreground">
        {value.toLocaleString('en-US')}
      </div>
      <div className="text-sm font-medium text-primary mt-1">
        {dir === 'him' ? 'له' : 'لينا'}
      </div>
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/accounting-system/simple-offices/${officeId}`)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{office?.name}</h1>
            <p className="text-sm text-muted-foreground">
              يومية {format(new Date(form.diary_date), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="h-4 w-4 ml-1" /> حفظ
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="text-sm">تاريخ اليومية</Label>
            <Input
              type="date"
              value={form.diary_date}
              onChange={(e) => set('diary_date', e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* الرصيد السابق */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-bold text-foreground">الرصيد السابق</h2>
          <div className="grid grid-cols-2 gap-3">
            {numberInput('له', 'previous_him')}
            {numberInput('لينا', 'previous_us')}
          </div>
        </CardContent>
      </Card>

      {/* المرتجع والرفض */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-bold text-foreground">المرتجع والرفض</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {numberInput('عدد المرتجع', 'return_count')}
            {numberInput('قيمة المرتجع', 'return_value')}
            {numberInput('رفض شحن', 'reject_shipping')}
          </div>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              {result('مستحق للعميل', customerDueAbs, form.customer_due_direction)}
            </div>
            <div>
              <Label className="text-sm font-medium">اختر الاتجاه:</Label>
              {directionRadio('customer_due_direction')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* اليومية الجديدة */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-bold text-foreground">اليومية الجديدة</h2>
          <div className="grid grid-cols-2 gap-3">
            {numberInput('قيمتها', 'new_diary_value')}
            {numberInput('الواصل', 'arrived')}
          </div>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              {result('صافي اليومية', netDiaryAbs, form.net_diary_direction)}
            </div>
            <div>
              <Label className="text-sm font-medium">اختر الاتجاه:</Label>
              {directionRadio('net_diary_direction')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* النزول */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-bold text-foreground">النزول</h2>
          <div>{numberInput('قيمة النزول', 'descent_value')}</div>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              {result('الصافي بالنزول', netWithDescentAbs, form.net_with_descent_direction)}
            </div>
            <div>
              <Label className="text-sm font-medium">اختر الاتجاه:</Label>
              {directionRadio('net_with_descent_direction')}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label>ملاحظات</Label>
          <Input
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="ملاحظات اختيارية..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
