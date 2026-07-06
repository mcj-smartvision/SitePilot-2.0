export type AiStatus = 'draft_by_ai' | 'confirmed_by_user' | 'rejected_by_user'

export type PmReviewStatus = 'not_required' | 'pending' | 'approved' | 'rejected'

export interface AiDraftLabels {
  draftByAi: string
  confirmed: string
  approveSend: string
  editText: string
  reject: string
  regenerate?: string
  saving: string
}
