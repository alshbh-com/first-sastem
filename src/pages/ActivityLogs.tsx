import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) console.error('Activity logs error:', error);
      setLogs(data || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">سجل الحركات</h1>
      <p className="text-sm text-muted-foreground">يعرض آخر 200 حركة في النظام</p>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">لا توجد سجلات بعد - سيتم تسجيل الحركات تلقائياً</TableCell></TableRow>
                ) : logs.map((l) => (
                  <TableRow key={l.id} className="border-border">
                    <TableCell className="font-medium text-sm">{l.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {typeof l.details === 'object' ? JSON.stringify(l.details) : l.details}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(l.created_at).toLocaleString('ar-EG')}</TableCell>
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
