import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PermissionLevel = 'view' | 'edit' | 'hidden';

export interface SectionPermission {
  section: string;
  permission: PermissionLevel;
}

// All sections that can be permissioned
export const ALL_SECTIONS = [
  { key: 'dashboard', label: 'لوحة التحكم', url: '/' },
  { key: 'orders', label: 'الأوردرات', url: '/orders' },
  { key: 'pending-collections', label: 'معلق', url: '/pending-collections' },
  { key: 'order-approval', label: 'فرع', url: '/order-approval' },
  { key: 'closed-orders', label: 'الأوردرات المتقفلة', url: '/closed-orders' },
  { key: 'search', label: 'بحث شامل', url: '/search' },
  { key: 'orders-reminder', label: 'تذكير الأوردرات القديمة', url: '/orders-reminder' },
  { key: 'status-changed-today', label: 'تغييرات الحالة اليوم', url: '/status-changed-today' },
  { key: 'courier-tracking', label: 'تتبع المناديب', url: '/courier-tracking' },
  { key: 'chat', label: 'التواصل الداخلي', url: '/chat' },
  { key: 'tasks', label: 'قائمة المهام', url: '/tasks' },
  { key: 'postponed-orders', label: 'الأوردرات المؤجلة', url: '/postponed-orders' },
  { key: 'offices', label: 'المكاتب', url: '/offices' },
  { key: 'delivery-prices', label: 'أسعار التوصيل', url: '/delivery-prices' },
  { key: 'companies', label: 'الشركات', url: '/companies' },
  { key: 'products', label: 'المنتجات', url: '/products' },
  { key: 'customers', label: 'العملاء', url: '/customers' },
  { key: 'couriers', label: 'المندوبين', url: '/couriers' },
  { key: 'users', label: 'المستخدمين', url: '/users' },
  { key: 'status-management', label: 'إدارة الحالات', url: '/status-management' },
  { key: 'courier-collections', label: 'تحصيلات المندوبين', url: '/courier-collections' },
  { key: 'company-accounts', label: 'حسابات الشركات', url: '/company-accounts' },
  { key: 'advances', label: 'السلفات والخصومات', url: '/advances' },
  { key: 'office-settlement', label: 'تقفيلة المكاتب', url: '/office-settlement' },
  { key: 'daily-report', label: 'التقرير اليومي', url: '/daily-report' },
  { key: 'financial-reports', label: 'التقارير المالية', url: '/financial-reports' },
  { key: 'courier-stats', label: 'إحصائيات المناديب', url: '/courier-stats' },
  { key: 'office-stats', label: 'إحصائيات المكاتب', url: '/office-stats' },
  { key: 'profit-report', label: 'تقرير الأرباح', url: '/profit-report' },
  { key: 'tracking', label: 'تتبع الشحنات', url: '/tracking' },
  { key: 'print', label: 'الطباعة', url: '/print' },
  { key: 'order-notes', label: 'ملاحظات الأوردرات', url: '/order-notes' },
  { key: 'data-export', label: 'تصدير البيانات', url: '/data-export' },
  { key: 'logs', label: 'سجل الحركات', url: '/logs' },
  { key: 'trash', label: 'سلة المحذوفات', url: '/trash' },
  { key: 'office-report', label: 'تقرير المكاتب', url: '/office-report' },
  { key: 'settings', label: 'الإعدادات', url: '/settings' },
  { key: 'accounting-system', label: 'سيستم الحسابات', url: '/accounting-system' },
  { key: 'branch-diaries', label: 'يوميات الفروع', url: '/branch-diaries' },
  { key: 'courier-applications', label: 'طلبات عمال', url: '/courier-applications' },
];

export function urlToSectionKey(url: string): string {
  if (url === '/') return 'dashboard';
  if (url.startsWith('/accounting-system')) return 'accounting-system';
  return url.replace(/^\//, '');
}

// Sections a moderator can see by default (edit). All others default to hidden.
export const MODERATOR_DEFAULT_SECTIONS = [
  'order-approval',
  'delivery-prices',
  'tasks',
  'courier-applications',
  'courier-tracking',
  'tracking',
  'chat',
];

export function getDefaultPermissionForRole(role: string | undefined, sectionKey: string): PermissionLevel {
  if (role === 'moderator') {
    return MODERATOR_DEFAULT_SECTIONS.includes(sectionKey) ? 'edit' : 'hidden';
  }

  return 'edit';
}

export function getPermissionSectionsForRole(role: string | undefined) {
  if (role === 'moderator') {
    return ALL_SECTIONS.filter(section => MODERATOR_DEFAULT_SECTIONS.includes(section.key));
  }

  return ALL_SECTIONS;
}

export function usePermissions() {
  const { user, isOwner, roles } = useAuth();
  const [permissions, setPermissions] = useState<SectionPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const isModerator = (roles as string[])?.includes('moderator');

  useEffect(() => {
    if (!user) { setPermissions([]); setLoading(false); return; }
    if (isOwner) { setPermissions([]); setLoading(false); return; } // Owner has full access

    const load = async () => {
      const { data } = await supabase
        .from('user_permissions')
        .select('section, permission')
        .eq('user_id', user.id);
      setPermissions((data || []) as SectionPermission[]);
      setLoading(false);
    };
    load();
  }, [user, isOwner]);

  const getPermission = (sectionKey: string): PermissionLevel => {
    if (isOwner) return 'edit'; // Owner always has full access
    if (isModerator && !MODERATOR_DEFAULT_SECTIONS.includes(sectionKey)) return 'hidden';
    const found = permissions.find(p => p.section === sectionKey);
    if (found) return found.permission as PermissionLevel;
    return getDefaultPermissionForRole(isModerator ? 'moderator' : undefined, sectionKey);
  };

  const canView = (sectionKey: string): boolean => {
    const perm = getPermission(sectionKey);
    return perm === 'view' || perm === 'edit';
  };

  const canEdit = (sectionKey: string): boolean => {
    return getPermission(sectionKey) === 'edit';
  };

  const isHidden = (sectionKey: string): boolean => {
    return getPermission(sectionKey) === 'hidden';
  };

  return { permissions, loading, getPermission, canView, canEdit, isHidden };
}
