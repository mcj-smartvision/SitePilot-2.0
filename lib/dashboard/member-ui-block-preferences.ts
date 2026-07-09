import type { SupabaseClient } from '@supabase/supabase-js'
import { getBlocksForDashboard } from '@/lib/dashboard/ui-block-catalog'

export interface MemberUiBlockPreference {
  block_code: string
  is_visible: boolean
}

function isMissingPreferencesTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('member_ui_block_preferences') ||
    msg.includes('schema cache')
  )
}

export async function fetchMemberUiBlockPreferences(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  dashboard: string
): Promise<MemberUiBlockPreference[]> {
  const { data, error } = await supabase
    .from('member_ui_block_preferences')
    .select('block_code, is_visible')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('dashboard', dashboard)

  if (error) {
    if (isMissingPreferencesTable(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []) as MemberUiBlockPreference[]
}

export async function upsertMemberUiBlockPreference(
  supabase: SupabaseClient,
  input: {
    userId: string
    projectId: string
    dashboard: string
    blockCode: string
    isVisible: boolean
  }
): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('member_ui_block_preferences')
    .select('id')
    .eq('user_id', input.userId)
    .eq('project_id', input.projectId)
    .eq('dashboard', input.dashboard)
    .eq('block_code', input.blockCode)
    .maybeSingle()

  if (selectError) {
    if (isMissingPreferencesTable(selectError)) {
      throw new Error(
        'جدول شخصی‌سازی داشبورد هنوز ساخته نشده. فایل database/38-member-ui-block-preferences.sql را در Supabase SQL Editor اجرا کنید.'
      )
    }
    throw new Error(selectError.message)
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('member_ui_block_preferences')
      .update({ is_visible: input.isVisible })
      .eq('id', existing.id)
    if (updateError) throw new Error(updateError.message)
    return
  }

  const { error: insertError } = await supabase.from('member_ui_block_preferences').insert({
    user_id: input.userId,
    project_id: input.projectId,
    dashboard: input.dashboard,
    block_code: input.blockCode,
    is_visible: input.isVisible,
  })

  if (insertError) {
    if (isMissingPreferencesTable(insertError)) {
      throw new Error(
        'جدول شخصی‌سازی داشبورد هنوز ساخته نشده. فایل database/38-member-ui-block-preferences.sql را در Supabase SQL Editor اجرا کنید.'
      )
    }
    throw new Error(insertError.message)
  }
}

/** Apply personal overrides on top of role/position defaults. */
export function mergeMemberUiBlockPreferences(
  baseVisible: Set<string>,
  preferences: MemberUiBlockPreference[],
  dashboard: string
): Set<string> {
  const catalogCodes = new Set(getBlocksForDashboard(dashboard).map((b) => b.code))
  const result = new Set(baseVisible)

  for (const pref of preferences) {
    if (!catalogCodes.has(pref.block_code)) continue
    if (pref.is_visible) result.add(pref.block_code)
    else result.delete(pref.block_code)
  }

  return result
}

export function getDefaultVisibleCodesForDashboard(dashboard: string): Set<string> {
  return new Set(
    getBlocksForDashboard(dashboard)
      .filter((b) => b.defaultVisible)
      .map((b) => b.code)
  )
}
