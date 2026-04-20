import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function SimpleOffices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const { data: offices = [] } = useQuery({
    queryKey: ['simple-offices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: dateOffices = [] } = useQuery({
    queryKey: ['simple-date-offices', filterDate],
    queryFn: async () => {
      if (!filterDate) return [];
      const { data, error } = await supabase
        .from('office_simple_diaries')
        .select('office_id, offices(id, name)')
        .eq('diary_date', filterDate)
        .is('deleted_at', null);
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter((d: any) => {
        if (seen.has(d.office_id)) return false;
        seen.add(d.office_id);
        return true;
      });
    },
    enabled: !!filterDate,
  });

  const filtered = offices.filter((o: any) =>
    o.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-foreground">المكاتب - يوميات بسيطة</h1>
        <p className="text-sm text-muted-foreground">اختر مكتب لفتح يوميات يدوية</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">عرض المكاتب اللي ليها يومية في تاريخ محدد:</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-48"
            />
            {filterDate && (
              <Button size="sm" variant="ghost" onClick={() => setFilterDate('')}>
                مسح
              </Button>
            )}
          </div>
          {filterDate && (
            <div className="text-sm text-muted-foreground">
              عدد المكاتب في {filterDate}: <span className="font-bold text-foreground">{dateOffices.length}</span>
            </div>
          )}
          {filterDate && dateOffices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dateOffices.map((d: any) => (
                <Button
                  key={d.office_id}
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/accounting-system/simple-offices/${d.office_id}?date=${filterDate}`)}
                >
                  {d.offices?.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Input
        placeholder="بحث عن مكتب..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((office: any) => (
          <Card
            key={office.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/accounting-system/simple-offices/${office.id}`)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{office.name}</h3>
                {office.owner_name && (
                  <p className="text-xs text-muted-foreground">{office.owner_name}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-muted-foreground p-8">لا يوجد مكاتب</div>
      )}
    </div>
  );
}
