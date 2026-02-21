import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function Couriers() {
  const [couriers, setCouriers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      // Get users with courier role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'courier');

      if (roles && roles.length > 0) {
        const ids = roles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ids);
        setCouriers(profiles || []);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المندوبين</h1>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couriers.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">لا يوجد مندوبين</TableCell></TableRow>
              ) : couriers.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell dir="ltr">{c.phone}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>
                      {c.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
