import type { SupabaseClient } from '@supabase/supabase-js';

// Best-effort audit trail for service-role writes made through /api/admin/rpc.
// Stores who, what action, which table and row, and the column NAMES touched
// (never the values: users rows hold personal data). A failure here is logged
// but never blocks the admin action.
export async function writeAudit(
  supabase: SupabaseClient,
  adminEmail: string,
  action: string,
  tableName: string,
  rowId: unknown,
  detail: Record<string, unknown>,
) {
  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      admin_email: adminEmail,
      action,
      table_name: tableName,
      row_id: rowId == null ? null : typeof rowId === 'string' ? rowId : JSON.stringify(rowId),
      detail,
    });
    if (error) console.error('[audit] insert failed:', error.message);
  } catch (e: any) {
    console.error('[audit] insert threw:', e?.message);
  }
}
