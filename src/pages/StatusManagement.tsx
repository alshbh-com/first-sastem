import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Lock, Palette } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#707e99', '#3b82f6', '#22c55e', '#e11414', '#3c9f3e', '#df3416',
  '#496950', '#d91717', '#9333ea', '#b51c1c', '#a61111', '#8B5CF6',
  '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

export default function StatusManagement() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [statusRes, ordersRes] = await Promise.all([
      supabase.from('order_statuses').select('*').order('sort_order'),
      supabase.from('orders').select('status_id'),
    ]);
    setStatuses(statusRes.data || []);
    const counts: Record<string, number> = {};
    (ordersRes.data || []).forEach(o => { if (o.status_id) counts[o.status_id] = (counts[o.status_id] || 0) + 1; });
    setOrderCounts(counts);
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const current = statuses[index];
    const prev = statuses[index - 1];
    await Promise.all([
      supabase.from('order_statuses').update({ sort_order: prev.sort_order }).eq('id', current.id),
      supabase.from('order_statuses').update({ sort_order: current.sort_order }).eq('id', prev.id),
    ]);
    loadData();
  };

  const moveDown = async (index: number) => {
    if (index === statuses.length - 1) return;
    const current = statuses[index];
    const next = statuses[index + 1];
    await Promise.all([
      supabase.from('order_statuses').update({ sort_order: next.sort_order }).eq('id', current.id),
      supabase.from('order_statuses').update({ sort_order: current.sort_order }).eq('id', next.id),
    ]);
    loadData();
  };

  const updateColor = async (id: string, color: string) => {
    const { error } = await supabase.from('order_statuses').update({ color }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('تم تغيير اللون');
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">إدارة الحالات</h1>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-16 text-center">ترتيب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">اللون</TableHead>
                  <TableHead className="text-center">عدد الأوردرات</TableHead>
                  <TableHead className="text-center">نوع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((s, i) => (
                  <TableRow key={s.id} className="border-border">
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveUp(i)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveDown(i)} disabled={i === statuses.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: (s.color || '#6b7280') + '30', color: s.color || '#6b7280' }}>{s.name}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="w-7 h-7 rounded-full mx-auto border-2 border-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: s.color || '#6b7280' }}
                            title="اضغط لتغيير اللون"
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" dir="rtl">
                          <div className="space-y-2">
                            <div className="text-sm font-medium flex items-center gap-1">
                              <Palette className="h-3 w-3" /> اختر لون
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                              {PRESET_COLORS.map(c => (
                                <button
                                  key={c}
                                  className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
                                  style={{ backgroundColor: c }}
                                  onClick={() => updateColor(s.id, c)}
                                />
                              ))}
                            </div>
                            <div className="pt-2 border-t border-border">
                              <input
                                type="color"
                                defaultValue={s.color || '#6b7280'}
                                onChange={(e) => updateColor(s.id, e.target.value)}
                                className="w-full h-8 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-center font-bold">{orderCounts[s.id] || 0}</TableCell>
                    <TableCell className="text-center">
                      {s.is_fixed ? (
                        <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" />ثابتة</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">مخصصة</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
