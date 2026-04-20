import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SimpleDiariesTrash() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['simple-diaries-trash'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('office_simple_diaries')
        .select('*, offices(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('office_simple_diaries')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simple-diaries-trash'] });
      toast.success('تم الاستعادة');
    },
  });

  const purge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('office_simple_diaries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simple-diaries-trash'] });
      toast.success('تم الحذف نهائياً');
    },
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-foreground">سلة المحذوفات - يوميات بسيطة</h1>
        <p className="text-sm text-muted-foreground">{items.length} يومية محذوفة</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
          السلة فاضية
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="font-bold text-foreground">{d.offices?.name}</div>
                <div className="text-sm text-muted-foreground">
                  يومية {format(new Date(d.diary_date), 'dd/MM/yyyy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  حُذفت: {format(new Date(d.deleted_at), 'dd/MM/yyyy HH:mm')}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => restore.mutate(d.id)}>
                    <RotateCcw className="h-4 w-4 ml-1" /> استعادة
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('حذف نهائي؟ لا يمكن التراجع.')) purge.mutate(d.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 ml-1" /> حذف نهائي
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
