import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';

export default function SimpleOfficeDiaries() {
  const { officeId } = useParams<{ officeId: string }>();
  const [searchParams] = useSearchParams();
  const filterDate = searchParams.get('date');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: office } = useQuery({
    queryKey: ['simple-office', officeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('*').eq('id', officeId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!officeId,
  });

  const { data: diaries = [] } = useQuery({
    queryKey: ['simple-diaries', officeId, filterDate],
    queryFn: async () => {
      let q = supabase
        .from('office_simple_diaries')
        .select('*')
        .eq('office_id', officeId!)
        .is('deleted_at', null)
        .order('diary_date', { ascending: false });
      if (filterDate) q = q.eq('diary_date', filterDate);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!officeId,
  });

  const createDiary = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('office_simple_diaries')
        .insert({ office_id: officeId!, diary_date: today })
        .select()
        .single();
      if (error) throw error;
      await logActivity('فتح يومية بسيطة', { office_id: officeId, diary_id: data.id });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['simple-diaries', officeId] });
      navigate(`/accounting-system/simple-offices/${officeId}/diary/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('office_simple_diaries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await logActivity('حذف يومية بسيطة', { diary_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simple-diaries', officeId] });
      toast.success('تم نقل اليومية لسلة المحذوفات');
    },
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/accounting-system/simple-offices')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{office?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {filterDate ? `يوميات تاريخ ${filterDate}` : `${diaries.length} يومية`}
            </p>
          </div>
        </div>
        <Button onClick={() => createDiary.mutate()} disabled={createDiary.isPending}>
          <Plus className="h-4 w-4 ml-1" />
          فتح يومية جديدة
        </Button>
      </div>

      {diaries.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
          مفيش يوميات. اضغط "فتح يومية جديدة" للبدء.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {diaries.map((d: any) => (
            <Card key={d.id} className="hover:bg-accent transition-colors">
              <CardContent className="p-4 space-y-2">
                <div
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() => navigate(`/accounting-system/simple-offices/${officeId}/diary/${d.id}`)}
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">يومية {format(new Date(d.diary_date), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('هل تريد نقل اليومية لسلة المحذوفات؟')) softDelete.mutate(d.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
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
