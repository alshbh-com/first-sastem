import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Pencil, Trash2, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function UsersPage() {
  const { isOwner } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newRole, setNewRole] = useState('courier');
  const [creating, setCreating] = useState(false);

  // Edit password
  const [pwDialog, setPwDialog] = useState<any>(null);
  const [newPw, setNewPw] = useState('');
  const [updatingPw, setUpdatingPw] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (roles && roles.length > 0) {
      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
      const merged = (profiles || []).map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.id)?.role || 'unknown',
      }));
      setUsers(merged);
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  const callEdgeFunction = async (action: string, userData: any) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/auth-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, userData }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const createUser = async () => {
    if (!newName || !newCode) return;
    setCreating(true);
    try {
      await callEdgeFunction('create-user', { full_name: newName, phone: newPhone, login_code: newCode, role: newRole });
      toast.success('تم إنشاء المستخدم بنجاح');
      setCreateOpen(false);
      setNewName(''); setNewPhone(''); setNewCode(''); setNewRole('courier');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'خطأ');
    }
    setCreating(false);
  };

  const updatePassword = async () => {
    if (!pwDialog || !newPw.trim()) return;
    setUpdatingPw(true);
    try {
      await callEdgeFunction('update-password', { user_id: pwDialog.id, new_password: newPw });
      toast.success('تم تحديث كلمة المرور');
      setPwDialog(null); setNewPw('');
    } catch (err: any) {
      toast.error(err.message || 'خطأ');
    }
    setUpdatingPw(false);
  };

  const deleteUser = async (u: any) => {
    if (!confirm(`هل تريد حذف المستخدم "${u.full_name}"؟`)) return;
    try {
      await callEdgeFunction('delete-user', { user_id: u.id });
      toast.success('تم حذف المستخدم');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'خطأ');
    }
  };

  const roleLabel = (role: string) => {
    if (role === 'owner') return 'مالك';
    if (role === 'admin') return 'مسؤول';
    if (role === 'courier') return 'مندوب';
    return role;
  };

  const roleColor = (role: string) => {
    if (role === 'owner') return 'hsl(var(--primary))';
    if (role === 'admin') return 'hsl(142, 76%, 36%)';
    if (role === 'courier') return 'hsl(38, 92%, 50%)';
    return undefined;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">المستخدمين</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 ml-1" />إضافة مستخدم</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>إضافة مستخدم جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>الاسم</Label><Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label>الهاتف</Label><Input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-secondary border-border" dir="ltr" /></div>
              <div><Label>كود الدخول (كلمة المرور)</Label><Input value={newCode} onChange={e => setNewCode(e.target.value)} className="bg-secondary border-border" dir="ltr" /></div>
              <div>
                <Label>الصلاحية</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مسؤول (Admin)</SelectItem>
                    <SelectItem value="courier">مندوب (Courier)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createUser} className="w-full" disabled={creating}>
                {creating ? 'جارٍ الإنشاء...' : 'إنشاء المستخدم'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">الصلاحية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">جارٍ التحميل...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">لا يوجد مستخدمين</TableCell></TableRow>
                ) : users.map(u => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell dir="ltr">{u.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: roleColor(u.role) }} className="text-xs">{roleLabel(u.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>{u.is_active ? 'نشط' : 'غير نشط'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="تغيير كلمة المرور" onClick={() => { setPwDialog(u); setNewPw(''); }}>
                          <Key className="h-4 w-4" />
                        </Button>
                        {u.role !== 'owner' && (
                          <Button size="icon" variant="ghost" className="text-destructive" title="حذف" onClick={() => deleteUser(u)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Password dialog */}
      <Dialog open={!!pwDialog} onOpenChange={v => { if (!v) setPwDialog(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>تغيير كلمة المرور - {pwDialog?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>كلمة المرور الجديدة</Label><Input value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-secondary border-border" dir="ltr" /></div>
            <Button onClick={updatePassword} className="w-full" disabled={updatingPw || !newPw.trim()}>
              {updatingPw ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
