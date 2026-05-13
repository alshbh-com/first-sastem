DELETE FROM public.user_permissions up
USING public.user_roles ur
WHERE up.user_id = ur.user_id
  AND ur.role = 'moderator'
  AND up.section IN (
    'order-approval',
    'delivery-prices',
    'tasks',
    'courier-applications',
    'courier-tracking',
    'tracking',
    'chat'
  )
  AND up.permission = 'hidden';