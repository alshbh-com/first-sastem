import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarCheck, Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function buildTitle(officeName: string, dateStr: string) {
  const d = new Date(dateStr);
  const day = WEEKDAYS[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${officeName} - ${day} ${dd}/${mm}/${d.getFullYear()}`;
}

export default function DailyClosing() {
  const { canEdit } = useOutletContext<{ canEdit: boolean }>() || { canEdit: true };
  const [offices, setOffices] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [officeId, setOfficeId] = useState<string>('');
  const [diaries, setDiaries] = useState<any[]>([]);
  const [diaryId, setDiaryId] = useState<string>('');
  const [diary, setDiary] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copyOrderId, setCopyOrderId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: offs }, { data: sts }] = await Promise.all([
        supabase.from('offices').select('id,name').order('name'),
        supabase.from('order_statuses').select('id,name,color').order('sort_order'),
      ]);
      setOffices(offs || []);
      setStatuses(sts || []);
    })();
  }, []);

  const loadDiaries = async (oid: string) => {
    const { data } = await supabase
      .from('daily_closing_diaries' as any)
      .select('*')
      .eq('office_id', oid)
      .order('diary_date', { ascending: false });
    setDiaries((data as any) || []);
    if (data && data.length > 0) setDiaryId((data[0] as any).id);
    else { setDiaryId(''); setDiary(null); setEntries([]); }
  };

  useEffect(() => { if (officeId) loadDiaries(officeId); }, [officeId]);

  const loadDiary = async (id: string) => {
    setLoading(true);
    const { data: d } = await supabase.from('daily_closing_diaries' as any).select('*').eq('id', id).maybeSingle();
    setDiary(d);
    const { data: ents } = await supabase
      .from('daily_closing_entries' as any)
      .select('id, note, order_id, created_at')
      .eq('diary_id', id)
      .order('created_at', { ascending: true });
    const list = (ents as any[]) || [];
    const orderIds = list.map(e => e.order_id).filter(Boolean);
    let ordersMap: Record<string, any> = {};
    if (orderIds.length) {
      const { data: ords } = await supabase
        .from('orders')
        .select('id, customer_code, customer_name, product_name, price, status_id, is_closed')
        .in('id', orderIds);
      (ords || []).forEach((o: any) => { ordersMap[o.id] = o; });
    }
    setEntries(list.map(e => ({ ...e, orders: ordersMap[e.order_id] || null })));
    setLoading(false);
  };

  useEffect(() => { if (diaryId) loadDiary(diaryId); }, [diaryId]);

  // Realtime: refresh entries when any order's status changes or new entry added
  useEffect(() => {
    if (!diaryId) return;
    const channel = supabase
      .channel(`dcd-${diaryId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_closing_entries', filter: `diary_id=eq.${diaryId}` }, () => loadDiary(diaryId))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => loadDiary(diaryId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [diaryId]);

  const updateNote = async (entryId: string, value: string) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, note: value } : e));
  };

  const saveNote = async (entryId: string, value: string) => {
    const { error } = await supabase.from('daily_closing_entries' as any).update({ note: value }).eq('id', entryId);
    if (error) toast.error('فشل حفظ الملاحظة');
  };

  const saveDiaryNotes = async (value: string) => {
    setDiary((p: any) => ({ ...p, notes: value }));
  };
  const persistDiaryNotes = async (value: string) => {
    const { error } = await supabase.from('daily_closing_diaries' as any).update({ notes: value }).eq('id', diaryId);
    if (error) toast.error('فشل حفظ ملاحظات اليومية');
  };

  const createTodayDiary = async () => {
    if (!officeId) return;
    const off = offices.find(o => o.id === officeId);
    const today = new Date().toISOString().split('T')[0];
    const title = buildTitle(off?.name || '', today);
    const { data, error } = await supabase
      .from('daily_closing_diaries' as any)
      .upsert({ office_id: officeId, diary_date: today, title }, { onConflict: 'office_id,diary_date' })
      .select()
      .maybeSingle();
    if (error) { toast.error('فشل إنشاء يومية اليوم'); return; }
    toast.success('تم');
    await loadDiaries(officeId);
    if (data) setDiaryId((data as any).id);
  };

  // Stats: count + sum per status
  const stats = useMemo(() => {
    const m = new Map<string, { name: string; color: string; count: number; sum: number }>();
    entries.forEach(e => {
      const ord = e.orders;
      if (!ord) return;
      const st = statuses.find(s => s.id === ord.status_id);
      const key = st?.id || 'none';
      const name = st?.name || 'بدون حالة';
      const color = st?.color || '#6b7280';
      const cur = m.get(key) || { name, color, count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += Number(ord.price || 0);
      m.set(key, cur);
    });
    return Array.from(m.values());
  }, [entries, statuses]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">تقفيلة يومية</h1>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-3 sm:p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">المكتب</label>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="اختر مكتب" /></SelectTrigger>
              <SelectContent>
                {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">اليومية</label>
            <Select value={diaryId} onValueChange={setDiaryId} disabled={!officeId || diaries.length === 0}>
              <SelectTrigger className="h-9"><SelectValue placeholder={diaries.length ? 'اختر يومية' : 'لا توجد يوميات'} /></SelectTrigger>
              <SelectContent>
                {diaries.map(d => <SelectItem key={d.id} value={d.id}>{d.title || d.diary_date}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {canEdit && officeId && (
            <Button onClick={createTodayDiary} variant="outline" className="h-9">
              <Plus className="h-4 w-4 ml-1" /> فتح يومية اليوم
            </Button>
          )}
        </CardContent>
      </Card>

      {diary && (
        <>
          {/* Stats */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap gap-2">
                {stats.length === 0 ? (
                  <span className="text-sm text-muted-foreground">لا يوجد أوردرات</span>
                ) : stats.map(s => (
                  <Badge key={s.name} style={{ backgroundColor: s.color }} className="text-xs px-2 py-1">
                    {s.name}: {s.count} | {s.sum} ج
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Entries table */}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-right">الكود</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right min-w-[220px]">ملاحظة الأوردر</TableHead>
                      {canEdit && <TableHead className="text-right">إجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد أوردرات في هذه اليومية</TableCell></TableRow>
                    ) : entries.map(e => {
                      const ord = e.orders || {};
                      const st = statuses.find(s => s.id === ord.status_id);
                      return (
                        <TableRow key={e.id} className="border-border">
                          <TableCell className="font-mono text-xs">{ord.customer_code || '-'}</TableCell>
                          <TableCell className="text-sm">{ord.customer_name}</TableCell>
                          <TableCell className="font-bold text-sm">{Number(ord.price || 0)}</TableCell>
                          <TableCell>
                            {st ? <Badge style={{ backgroundColor: st.color }} className="text-xs">{st.name}</Badge> : <span className="text-xs text-muted-foreground">بدون</span>}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={e.note || ''}
                              onChange={ev => updateNote(e.id, ev.target.value)}
                              onBlur={ev => saveNote(e.id, ev.target.value)}
                              placeholder="ملاحظة..."
                              className="bg-secondary border-border h-8 text-xs"
                              disabled={!canEdit}
                            />
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => setCopyOrderId(ord.id)} className="h-7">
                                <Copy className="h-3 w-3 ml-1" /> نسخ
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Bottom diary notes */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <label className="text-sm font-bold">ملاحظات اليومية</label>
              <Textarea
                value={diary.notes || ''}
                onChange={e => saveDiaryNotes(e.target.value)}
                onBlur={e => persistDiaryNotes(e.target.value)}
                placeholder="اكتب ملاحظات عامة عن اليومية..."
                rows={4}
                className="bg-secondary border-border"
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </>
      )}

      <CopyEntryDialog
        orderId={copyOrderId}
        currentDiaryId={diaryId}
        officeId={officeId}
        open={!!copyOrderId}
        onOpenChange={(o) => !o && setCopyOrderId(null)}
        offices={offices}
        onCopied={() => loadDiaries(officeId)}
      />
    </div>
  );
}

function CopyEntryDialog({ orderId, currentDiaryId, officeId, open, onOpenChange, offices, onCopied }: any) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    if (!open || !officeId) return;
    (async () => {
      const { data } = await supabase
        .from('daily_closing_diaries' as any)
        .select('*')
        .eq('office_id', officeId)
        .neq('id', currentDiaryId)
        .order('diary_date', { ascending: false });
      setList((data as any) || []);
    })();
  }, [open, officeId, currentDiaryId]);

  const copyTo = async (diaryId: string) => {
    const { error } = await supabase
      .from('daily_closing_entries' as any)
      .insert({ diary_id: diaryId, order_id: orderId, copied_from_diary_id: currentDiaryId });
    if (error) { toast.error('الأوردر موجود بالفعل أو فشل النسخ'); return; }
    toast.success('تم النسخ');
    onOpenChange(false);
  };

  const copyToNew = async () => {
    const off = offices.find((o: any) => o.id === officeId);
    const today = new Date().toISOString().split('T')[0];
    const title = buildTitle(off?.name || '', today);
    let { data: existing } = await supabase
      .from('daily_closing_diaries' as any)
      .select('id')
      .eq('office_id', officeId)
      .eq('diary_date', today)
      .maybeSingle();
    let targetId = (existing as any)?.id;
    if (!targetId) {
      const { data: created, error } = await supabase
        .from('daily_closing_diaries' as any)
        .insert({ office_id: officeId, diary_date: today, title })
        .select()
        .maybeSingle();
      if (error) { toast.error('فشل إنشاء يومية'); return; }
      targetId = (created as any).id;
    }
    if (targetId === currentDiaryId) { toast.error('الأوردر موجود في يومية اليوم'); return; }
    await copyTo(targetId);
    onCopied?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>نسخ إلى يومية أخرى</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Button onClick={copyToNew} className="w-full"><Plus className="h-4 w-4 ml-1" /> يومية جديدة (اليوم)</Button>
          {list.length > 0 && (
            <>
              <div className="text-xs text-muted-foreground text-center">أو اختر يومية موجودة</div>
              <div className="space-y-2 max-h-60 overflow-auto">
                {list.map(d => (
                  <Button key={d.id} variant="outline" className="w-full justify-between" onClick={() => copyTo(d.id)}>
                    <span className="text-sm">{d.title || d.diary_date}</span>
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
