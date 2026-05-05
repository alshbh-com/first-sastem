import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user!.id)
      .order('is_done', { ascending: true })
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const add = async () => {
    if (!title.trim()) { toast.error('اكتب عنوان المهمة'); return; }
    const { error } = await supabase.from('tasks').insert({
      user_id: user!.id,
      title: title.trim(),
      notes: notes.trim(),
      due_date: dueDate || null,
    });
    if (error) { toast.error(error.message); return; }
    setTitle(''); setNotes(''); setDueDate('');
    toast.success('تمت الإضافة');
    load();
  };

  const toggle = async (t: any) => {
    await supabase.from('tasks').update({ is_done: !t.is_done }).eq('id', t.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('حذف المهمة؟')) return;
    await supabase.from('tasks').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <ListTodo className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">قائمة المهام</h1>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <Input
            placeholder="عنوان المهمة (مثلاً: مشوار للعميل أحمد بكره)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-secondary border-border"
          />
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-secondary border-border w-44"
            />
            <Textarea
              placeholder="تفاصيل (اختياري)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="bg-secondary border-border flex-1 min-w-[200px]"
              rows={2}
            />
            <Button onClick={add} className="self-start">
              <Plus className="h-4 w-4 ml-1" /> إضافة
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">لا توجد مهام</div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map(t => (
                <div key={t.id} className={`flex items-start gap-3 p-3 ${t.is_done ? 'opacity-60' : ''}`}>
                  <Checkbox checked={t.is_done} onCheckedChange={() => toggle(t)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${t.is_done ? 'line-through' : ''}`}>{t.title}</div>
                    {t.notes && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{t.notes}</div>}
                    {t.due_date && <div className="text-xs text-primary mt-1">📅 {new Date(t.due_date).toLocaleDateString('en-GB')}</div>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)}>
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
