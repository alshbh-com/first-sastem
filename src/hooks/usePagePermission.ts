import { useLocation } from 'react-router-dom';
import { usePermissions, urlToSectionKey } from '@/hooks/usePermissions';

/**
 * Returns canEdit for the current page based on user permissions.
 * Use in any page to conditionally show/hide add/edit/delete buttons.
 */
export function usePagePermission() {
  const location = useLocation();
  const { canEdit, canView, isHidden, getPermission, loading } = usePermissions();
  const sectionKey = urlToSectionKey(location.pathname);

  return {
    canEdit: canEdit(sectionKey),
    canView: canView(sectionKey),
    isHidden: isHidden(sectionKey),
    permission: getPermission(sectionKey),
    loading,
  };
}
