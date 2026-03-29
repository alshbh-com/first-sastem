import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, UserCheck, Clock, Activity, FileText, Users, Building2, Download, LogIn, Trash2, Save } from 'lucide-react';

// Helper to upsert app_settings without TS issues
async function saveSetting(key: string, value: string) {
  const { supabase } = await import('@/integrations/supabase/client');
  // Try update first, if no rows affected, insert
  const { data } = await supabase.from('app_settings').select('key').eq('key', key).single();
  if (data) {
    await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  } else {
    await supabase.from('app_settings').insert({ key, value } as any);
  }
}
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ========== 1. Login History ==========
function LoginHistory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .or('action.ilike.%دخول%,action.ilike.%login%,action.ilike.%تسجيل%,action.ilike.%خروج%,action.ilike.%logout%')
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Also load all activity for security overview
  const [allLogs, setAllLogs] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setAllLogs(data || []);
    };
    load();
  }, []);

  const [profiles, setProfiles] = useState<Record<string, string>>({});
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.full_name; });
      setProfiles(map);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <LogIn className="h-4 w-4" /> سجل الدخول التفصيلي
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد سجلات دخول حتى الآن</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{profiles[log.user_id] || 'غير معروف'}</TableCell>
                    <TableCell className="text-xs">{log.action}</TableCell>
                    <TableCell className="text-xs">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details).substring(0, 80) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 2. Activity Audit Trail ==========
function ActivityAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.full_name; });
      setProfiles(map);
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter === 'delete') query = query.or('action.ilike.%حذف%,action.ilike.%مسح%,action.ilike.%delete%');
      if (filter === 'add') query = query.or('action.ilike.%إضافة%,action.ilike.%أضاف%,action.ilike.%insert%,action.ilike.%add%');
      if (filter === 'edit') query = query.or('action.ilike.%تعديل%,action.ilike.%تحديث%,action.ilike.%update%,action.ilike.%edit%');
      if (filter === 'export') query = query.or('action.ilike.%تصدير%,action.ilike.%export%,action.ilike.%طباعة%');

      const { data } = await query;
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, [filter]);

  const getActionColor = (action: string) => {
    if (action.includes('حذف') || action.includes('مسح')) return 'destructive';
    if (action.includes('إضافة') || action.includes('أضاف')) return 'default';
    if (action.includes('تعديل') || action.includes('تحديث')) return 'secondary';
    if (action.includes('تصدير') || action.includes('طباعة')) return 'outline';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" /> سجل الحركات الأمني
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'add', label: 'إضافة' },
            { key: 'edit', label: 'تعديل' },
            { key: 'delete', label: 'حذف' },
            { key: 'export', label: 'تصدير' },
          ].map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              onClick={() => setFilter(f.key)}
              className="text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium">{profiles[log.user_id] || 'النظام'}</TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)} className="text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(log.created_at), 'dd/MM HH:mm')}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {log.details && typeof log.details === 'object'
                        ? Object.entries(log.details as Record<string, any>).map(([k, v]) => `${k}: ${v}`).join(' | ').substring(0, 100)
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 3. Auto-Lock Settings ==========
function AutoLockSettings() {
  const [enabled, setEnabled] = useState(false);
  const [minutes, setMinutes] = useState('30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('*').in('key', ['auto_lock_enabled', 'auto_lock_minutes']);
      data?.forEach(s => {
        if (s.key === 'auto_lock_enabled') setEnabled(s.value === 'true');
        if (s.key === 'auto_lock_minutes') setMinutes(s.value);
      });
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await saveSetting('auto_lock_enabled', String(enabled));
    await saveSetting('auto_lock_minutes', minutes);
    toast.success('تم حفظ إعدادات القفل التلقائي');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> القفل التلقائي بعد عدم نشاط
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>تفعيل القفل التلقائي</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        {enabled && (
          <div className="flex items-center gap-2">
            <Label>مدة عدم النشاط (دقيقة):</Label>
            <Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} className="w-20" min="5" />
          </div>
        )}
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 ml-1" />
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== 4. Order Edit Lock After Period ==========
function OrderEditLock() {
  const [enabled, setEnabled] = useState(false);
  const [hours, setHours] = useState('24');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('*').in('key', ['order_edit_lock_enabled', 'order_edit_lock_hours']);
      data?.forEach(s => {
        if (s.key === 'order_edit_lock_enabled') setEnabled(s.value === 'true');
        if (s.key === 'order_edit_lock_hours') setHours(s.value);
      });
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await saveSetting('order_edit_lock_enabled', String(enabled));
    await saveSetting('order_edit_lock_hours', hours);
    toast.success('تم حفظ إعدادات قفل التعديل');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4" /> قفل تعديل الأوردر بعد فترة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>تفعيل القفل بعد فترة</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        {enabled && (
          <div className="flex items-center gap-2">
            <Label>منع التعديل بعد (ساعة):</Label>
            <Input type="number" value={hours} onChange={e => setHours(e.target.value)} className="w-20" min="1" />
          </div>
        )}
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 ml-1" />
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== 5. User Work Hours ==========
function UserWorkHours() {
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, { start: string; end: string; enabled: boolean }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const adminIds = roles?.filter(r => r.role === 'admin').map(r => r.user_id) || [];
      setProfiles(profs?.filter(p => adminIds.includes(p.id)) || []);

      const { data: settingsData } = await supabase.from('app_settings').select('*').like('key', 'work_hours_%');
      const parsed: Record<string, any> = {};
      settingsData?.forEach(s => {
        const userId = s.key.replace('work_hours_', '');
        try { parsed[userId] = JSON.parse(s.value); } catch { }
      });
      setSettings(parsed);
    };
    load();
  }, []);

  const updateSetting = (userId: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] || { start: '08:00', end: '18:00', enabled: false }), [field]: value }
    }));
  };

  const save = async () => {
    setSaving(true);
    for (const [userId, setting] of Object.entries(settings)) {
      await saveSetting(`work_hours_${userId}`, JSON.stringify(setting));
    }
    toast.success('تم حفظ ساعات العمل');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> تحديد ساعات عمل المستخدمين
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {profiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا يوجد مسؤولين</p>
        ) : (
          <>
            {profiles.map(p => {
              const s = settings[p.id] || { start: '08:00', end: '18:00', enabled: false };
              return (
                <div key={p.id} className="flex items-center gap-2 flex-wrap border rounded-lg p-2">
                  <span className="text-xs font-medium min-w-[80px]">{p.full_name}</span>
                  <Switch checked={s.enabled} onCheckedChange={v => updateSetting(p.id, 'enabled', v)} />
                  {s.enabled && (
                    <>
                      <Input type="time" value={s.start} onChange={e => updateSetting(p.id, 'start', e.target.value)} className="w-24 text-xs" />
                      <span className="text-xs">إلى</span>
                      <Input type="time" value={s.end} onChange={e => updateSetting(p.id, 'end', e.target.value)} className="w-24 text-xs" />
                    </>
                  )}
                </div>
              );
            })}
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5 ml-1" />
              حفظ
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 6. Office-Level Permissions ==========
function OfficePermissions() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const adminIds = roles?.filter(r => r.role === 'admin').map(r => r.user_id) || [];
      setAdmins(profs?.filter(p => adminIds.includes(p.id)) || []);

      const { data: offs } = await supabase.from('offices').select('id, name');
      setOffices(offs || []);

      const { data: settingsData } = await supabase.from('app_settings').select('*').like('key', 'office_perm_%');
      const parsed: Record<string, string[]> = {};
      settingsData?.forEach(s => {
        const userId = s.key.replace('office_perm_', '');
        try { parsed[userId] = JSON.parse(s.value); } catch { }
      });
      setAssignments(parsed);
    };
    load();
  }, []);

  const toggleOffice = (userId: string, officeId: string) => {
    setAssignments(prev => {
      const current = prev[userId] || [];
      const next = current.includes(officeId)
        ? current.filter(id => id !== officeId)
        : [...current, officeId];
      return { ...prev, [userId]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    for (const [userId, officeIds] of Object.entries(assignments)) {
      await saveSetting(`office_perm_${userId}`, JSON.stringify(officeIds));
    }
    toast.success('تم حفظ صلاحيات المكاتب');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" /> صلاحيات على مستوى المكتب
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">حدد المكاتب التي يمكن لكل مسؤول الوصول إليها (فارغ = كل المكاتب)</p>
        {admins.map(admin => (
          <div key={admin.id} className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">{admin.full_name}</p>
            <div className="flex flex-wrap gap-1.5">
              {offices.map(office => {
                const selected = (assignments[admin.id] || []).includes(office.id);
                return (
                  <Badge
                    key={office.id}
                    variant={selected ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => toggleOffice(admin.id, office.id)}
                  >
                    {office.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 ml-1" />
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== 7. Delete Approval System ==========
function DeleteApproval() {
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('key', 'require_owner_delete_approval');
      if (data?.[0]) setEnabled(data[0].value === 'true');
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await saveSetting('require_owner_delete_approval', String(enabled));
    toast.success('تم حفظ إعدادات الموافقة على الحذف');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> موافقة المالك على الحذف النهائي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs">تتطلب الحذف النهائي موافقة المالك</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <p className="text-xs text-muted-foreground">
          عند التفعيل، أي عملية حذف نهائي من المسؤول ستنتظر موافقة المالك أولاً
        </p>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 ml-1" />
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== 8. Read-Only Mode ==========
function ReadOnlyMode() {
  const [users, setUsers] = useState<any[]>([]);
  const [readOnlyUsers, setReadOnlyUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const nonOwnerIds = roles?.filter(r => r.role !== 'owner').map(r => r.user_id) || [];
      setUsers(profs?.filter(p => nonOwnerIds.includes(p.id)) || []);

      const { data } = await supabase.from('app_settings').select('*').eq('key', 'read_only_users');
      if (data?.[0]) try { setReadOnlyUsers(JSON.parse(data[0].value)); } catch { }
    };
    load();
  }, []);

  const toggle = (userId: string) => {
    setReadOnlyUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const save = async () => {
    setSaving(true);
    await saveSetting('read_only_users', JSON.stringify(readOnlyUsers));
    toast.success('تم حفظ إعدادات وضع القراءة فقط');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" /> وضع القراءة فقط
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">اختر المستخدمين اللي يشوفوا بس من غير تعديل</p>
        <div className="flex flex-wrap gap-1.5">
          {users.map(u => (
            <Badge
              key={u.id}
              variant={readOnlyUsers.includes(u.id) ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => toggle(u.id)}
            >
              {u.full_name}
            </Badge>
          ))}
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 ml-1" />
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== 9. Field-Level Permissions ==========
function FieldPermissions() {
  const [hiddenFields, setHiddenFields] = useState<Record<string, string[]>>({});
  const [admins, setAdmins] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const availableFields = [
    { key: 'price', label: 'السعر' },
    { key: 'delivery_price', label: 'سعر التوصيل' },
    { key: 'customer_phone', label: 'رقم الهاتف' },
    { key: 'address', label: 'العنوان' },
    { key: 'notes', label: 'الملاحظات' },
    { key: 'company', label: 'الشركة' },
    { key: 'courier', label: 'المندوب' },
  ];

  useEffect(() => {
    const load = async () => {
      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const adminIds = roles?.filter(r => r.role === 'admin').map(r => r.user_id) || [];
      setAdmins(profs?.filter(p => adminIds.includes(p.id)) || []);

      const { data } = await supabase.from('app_settings').select('*').like('key', 'hidden_fields_%');
      const parsed: Record<string, string[]> = {};
      data?.forEach(s => {
        const userId = s.key.replace('hidden_fields_', '');
        try { parsed[userId] = JSON.parse(s.value); } catch { }
      });
      setHiddenFields(parsed);
    };
    load();
  }, []);

  const toggleField = (userId: string, field: string) => {
    setHiddenFields(prev => {
      const current = prev[userId] || [];
      const next = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
      return { ...prev, [userId]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    for (const [userId, fields] of Object.entries(hiddenFields)) {
      await saveSetting(`hidden_fields_${userId}`, JSON.stringify(fields));
    }
    toast.success('تم حفظ صلاحيات الحقول');
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" /> صلاحيات على مستوى الحقل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">اخفِ أعمدة معينة عن مستخدمين محددين</p>
        {admins.map(admin => (
          <div key={admin.id} className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">{admin.full_name}</p>
            <div className="flex flex-wrap gap-1.5">
              {availableFields.map(field => {
                const hidden = (hiddenFields[admin.id] || []).includes(field.key);
                return (
                  <Badge
                    key={field.key}
                    variant={hidden ? 'destructive' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => toggleField(admin.id, field.key)}
                  >
                    {hidden ? '🚫 ' : ''}{field.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 ml-1" />
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== 10. Data Backup ==========
function DataBackup() {
  const [exporting, setExporting] = useState(false);

  const exportAllData = async () => {
    setExporting(true);
    try {
      const tables = ['orders', 'offices', 'companies', 'profiles', 'customers', 'products', 'delivery_prices'];
      const allData: Record<string, any[]> = {};

      for (const table of tables) {
        const { data } = await supabase.from(table).select('*').limit(5000);
        allData[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير النسخ الاحتياطي بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء التصدير');
    }
    setExporting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Download className="h-4 w-4" /> نسخ احتياطي يدوي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">تصدير كامل للبيانات (أوردرات، مكاتب، شركات، عملاء، منتجات)</p>
        <Button size="sm" onClick={exportAllData} disabled={exporting}>
          <Download className="h-3.5 w-3.5 ml-1" />
          {exporting ? 'جاري التصدير...' : 'تصدير النسخ الاحتياطي (JSON)'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== 11. Security Report Summary ==========
function SecuritySummary() {
  const [stats, setStats] = useState({ totalLogs: 0, deletions: 0, exports: 0, logins: 0, users: 0 });

  useEffect(() => {
    const load = async () => {
      const { count: totalLogs } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true });
      const { count: deletions } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true }).or('action.ilike.%حذف%,action.ilike.%مسح%');
      const { count: exports } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true }).or('action.ilike.%تصدير%,action.ilike.%export%');
      const { count: logins } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true }).or('action.ilike.%دخول%,action.ilike.%login%');
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      setStats({
        totalLogs: totalLogs || 0,
        deletions: deletions || 0,
        exports: exports || 0,
        logins: logins || 0,
        users: users || 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: 'إجمالي الحركات', value: stats.totalLogs, icon: Activity, color: 'text-blue-500' },
    { label: 'عمليات الحذف', value: stats.deletions, icon: Trash2, color: 'text-red-500' },
    { label: 'عمليات التصدير', value: stats.exports, icon: FileText, color: 'text-amber-500' },
    { label: 'تسجيلات الدخول', value: stats.logins, icon: LogIn, color: 'text-green-500' },
    { label: 'عدد المستخدمين', value: stats.users, icon: Users, color: 'text-purple-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" /> ملخص التقرير الأمني
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {cards.map((c, i) => (
            <div key={i} className="text-center p-3 rounded-lg border bg-muted/30">
              <c.icon className={`h-5 w-5 mx-auto mb-1 ${c.color}`} />
              <p className="text-lg font-bold">{c.value}</p>
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ========== Main SecurityTab ==========
export default function SecurityTab() {
  const { isOwner } = useAuth();

  return (
    <div className="mt-4 space-y-4">
      <SecuritySummary />
      <LoginHistory />
      <ActivityAudit />
      {isOwner && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AutoLockSettings />
            <OrderEditLock />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DeleteApproval />
            <ReadOnlyMode />
          </div>
          <OfficePermissions />
          <FieldPermissions />
          <UserWorkHours />
          <DataBackup />
        </>
      )}
    </div>
  );
}
