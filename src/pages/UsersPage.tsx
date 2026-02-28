import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2, Key, Shield, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_SECTIONS, PermissionLevel } from '@/hooks/usePermissions';

export default function UsersPage() {
  const { isOwner } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<any[]>([]);

  // Create user
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newOfficeId, setNewOfficeId] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit password
  const [pwDialog, setPwDialog] = useState<any>(null);
  const [newPw, setNewPw] = useState('');
  const [updatingPw, setUpdatingPw] = useState(false);

  // Permissions dialog
  const [permUser, setPermUser] = useState<any>(null);
  const [permData, setPermData] = useState<Record<string, PermissionLevel>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  // Show/hide passwords
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => { 
    loadUsers(); 
    supabase.from('offices').select('id, name').order('name').then(({ data }) => setOffices(data || []));
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (roles && roles.length > 0) {
      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
      const merged = (profiles || []).map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.id)?.role || 'unknown',
        officeName: p.office_id ? undefined : undefined, // will be filled below
      }));
      // Fill office names
      const officeIds = [...new Set(merged.filter(m => m.office_id).map(m => m.office_id))];
      if (officeIds.length > 0) {
        const { data: officeData } = await supabase.from('offices').select('id, name').in('id', officeIds);
        merged.forEach(m => {
          if (m.office_id) {
            m.officeName = officeData?.find(o => o.id === m.office_id)?.name || '';
          }
        });
      }
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
    if (!res.ok) throw new Error(data.error || 'حدث خطأ');
    return data;
  };

  const createUser = async () => {
    if (!newName || !newCode) { toast.error('أدخل الاسم وكود الدخول'); return; }
    if (!newRole) { toast.error('اختر الصلاحية'); return; }
    if (newRole === 'office' && !newOfficeId) { toast.error('اختر المكتب'); return; }
    setCreating(true);
    try {
      await callEdgeFunction('create-user', { 
        full_name: newName, phone: newPhone, login_code: newCode, role: newRole,
        office_id: newRole === 'office' ? newOfficeId : undefined,
      });
      toast.success('تم إنشاء المستخدم بنجاح');
      setCreateOpen(false);
      setNewName(''); setNewPhone(''); setNewCode(''); setNewRole(''); setNewOfficeId('');
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
      toast.success('تم تحديث كلمة المرور بنجاح');
      setPwDialog(null); setNewPw('');
      loadUsers();
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

  // Permissions management
  const openPermissions = async (u: any) => {
    setPermUser(u);
    const { data } = await supabase
      .from('user_permissions')
      .select('section, permission')
      .eq('user_id', u.id);
    const perms: Record<string, PermissionLevel> = {};
    ALL_SECTIONS.forEach(s => { perms[s.key] = 'edit'; }); // default edit
    (data || []).forEach((p: any) => { perms[p.section] = p.permission; });
    setPermData(perms);
  };

  const savePermissions = async () => {
    if (!permUser) return;
    setSavingPerms(true);
    try {
      // Delete existing permissions
      await supabase.from('user_permissions').delete().eq('user_id', permUser.id);
      
      // Insert only non-default (non-edit) permissions
      const toInsert = Object.entries(permData)
        .filter(([_, perm]) => perm !== 'edit')
        .map(([section, permission]) => ({
          user_id: permUser.id,
          section,
          permission,
        }));
      
      if (toInsert.length > 0) {
        await supabase.from('user_permissions').insert(toInsert);
      }
      
      toast.success('تم حفظ الصلاحيات');
      setPermUser(null);
    } catch (err: any) {
      toast.error('خطأ في حفظ الصلاحيات');
    }
    setSavingPerms(false);
  };

  const roleLabel = (role: string) => {
    if (role === 'owner') return 'مالك';
    if (role === 'admin') return 'مسؤول';
    if (role === 'courier') return 'مندوب';
    if (role === 'office') return 'مكتب';
    return role;
  };

  const roleColor = (role: string) => {
    if (role === 'owner') return 'hsl(var(--primary))';
    if (role === 'admin') return 'hsl(142, 76%, 36%)';
    if (role === 'courier') return 'hsl(38, 92%, 50%)';
    if (role === 'office') return 'hsl(200, 80%, 50%)';
    return undefined;
  };

  const permLabel = (p: PermissionLevel) => {
    if (p === 'edit') return 'تعديل';
    if (p === 'view') return 'مشاهدة فقط';
    return 'مخفي';
  };

  const permColor = (p: PermissionLevel) => {
    if (p === 'edit') return 'hsl(142, 76%, 36%)';
    if (p === 'view') return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 72%, 51%)';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">المستخدمين</h1>
        <div className="flex gap-2">
          {isOwner && (
            <Button size="sm" variant="outline" onClick={() => setShowPasswords(!showPasswords)}>
              {showPasswords ? <EyeOff className="h-4 w-4 ml-1" /> : <Eye className="h-4 w-4 ml-1" />}
              {showPasswords ? 'إخفاء كلمات المرور' : 'عرض كلمات المرور'}
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 ml-1" />إضافة مستخدم</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>إضافة مستخدم جديد</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>الاسم *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-secondary border-border" /></div>
                <div><Label>الهاتف</Label><Input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-secondary border-border" dir="ltr" /></div>
                <div><Label>كود الدخول (كلمة المرور) *</Label><Input value={newCode} onChange={e => setNewCode(e.target.value)} className="bg-secondary border-border" dir="ltr" /></div>
                <div>
                  <Label>الصلاحية *</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر الصلاحية" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مسؤول (Admin)</SelectItem>
                      <SelectItem value="courier">مندوب (Courier)</SelectItem>
                      <SelectItem value="office">مكتب (Office)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRole === 'office' && (
                  <div>
                    <Label>المكتب *</Label>
                    <Select value={newOfficeId} onValueChange={setNewOfficeId}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="اختر المكتب" /></SelectTrigger>
                      <SelectContent>
                        {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={createUser} className="w-full" disabled={creating}>
                  {creating ? 'جارٍ الإنشاء...' : 'إنشاء المستخدم'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  {isOwner && showPasswords && <TableHead className="text-right">كلمة المرور</TableHead>}
                  <TableHead className="text-right">الصلاحية</TableHead>
                  <TableHead className="text-right">المكتب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={isOwner && showPasswords ? 8 : 7} className="text-center text-muted-foreground py-8">جارٍ التحميل...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={isOwner && showPasswords ? 8 : 7} className="text-center text-muted-foreground py-8">لا يوجد مستخدمين</TableCell></TableRow>
                ) : users.map(u => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell dir="ltr">{u.phone || '-'}</TableCell>
                    {isOwner && showPasswords && (
                      <TableCell dir="ltr" className="font-mono text-xs">
                        {u.login_code || '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge style={{ backgroundColor: roleColor(u.role) }} className="text-xs">{roleLabel(u.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{u.officeName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>{u.is_active ? 'نشط' : 'غير نشط'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isOwner && u.role !== 'owner' && (
                          <Button size="icon" variant="ghost" title="الصلاحيات" onClick={() => openPermissions(u)}>
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
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
            <p className="text-xs text-muted-foreground">ملاحظة: بعد تغيير كلمة المرور، لن يعمل الكود القديم وسيجب استخدام الكود الجديد فقط.</p>
            <Button onClick={updatePassword} className="w-full" disabled={updatingPw || !newPw.trim()}>
              {updatingPw ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions dialog */}
      <Dialog open={!!permUser} onOpenChange={v => { if (!v) setPermUser(null); }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>صلاحيات - {permUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {ALL_SECTIONS.map(section => (
              <div key={section.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm font-medium">{section.label}</span>
                <Select
                  value={permData[section.key] || 'edit'}
                  onValueChange={(v) => setPermData(prev => ({ ...prev, [section.key]: v as PermissionLevel }))}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edit">
                      <span className="flex items-center gap-1">✏️ تعديل</span>
                    </SelectItem>
                    <SelectItem value="view">
                      <span className="flex items-center gap-1">👁️ مشاهدة فقط</span>
                    </SelectItem>
                    <SelectItem value="hidden">
                      <span className="flex items-center gap-1">🚫 مخفي</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button onClick={savePermissions} className="w-full mt-4" disabled={savingPerms}>
              {savingPerms ? 'جارٍ الحفظ...' : 'حفظ الصلاحيات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
