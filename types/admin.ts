export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string | null
  avatar_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SystemRole {
  id: string
  key: string
  title: string
  description?: string | null
  is_active: boolean
}

export interface AdminProject {
  id: string
  name: string
  description?: string | null
  location?: string | null
  code?: string | null
  status: string
  is_active: boolean
  start_date?: string | null
  end_date?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  email: string
  full_name: string
  phone?: string | null
  is_active: boolean
  invited_at?: string | null
  joined_at?: string | null
  created_at: string
  updated_at: string
  positions?: MemberPositionSummary[]
}

export interface MemberPositionSummary {
  id: string
  title: string
  key: string
  is_active: boolean
}

export interface Position {
  id: string
  project_id: string
  title: string
  key: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Feature {
  id: string
  key: string
  title: string
  description?: string | null
  module_group?: string | null
  is_active: boolean
}

export interface PositionFeature {
  id: string
  position_id: string
  feature_id: string
  can_view: boolean
  can_edit: boolean
  feature?: Feature
}

export interface EventType {
  id: string
  key: string
  title: string
  description?: string | null
  category?: string | null
  is_active: boolean
}

export interface NotificationRoute {
  id: string
  project_id: string
  event_type_id: string
  position_id: string
  email_enabled: boolean
  is_active: boolean
  event_type?: EventType
  position?: Position
}

export interface DashboardWidget {
  id: string
  key: string
  title: string
  description?: string | null
  default_visible: boolean
  sort_order: number
  is_active: boolean
}

export interface PositionDashboardWidget {
  id: string
  position_id: string
  widget_id: string
  is_visible: boolean
  sort_order: number
  widget?: DashboardWidget
}

export interface CreateProjectInput {
  name: string
  code?: string
  description?: string
  location?: string
  status?: string
  is_active?: boolean
}

export interface CreatePositionInput {
  title: string
  key: string
  description?: string
  is_active?: boolean
}

export interface CreateMemberInput {
  full_name: string
  email: string
  phone?: string
  is_active?: boolean
  position_ids: string[]
}

export interface UpdateMemberInput {
  full_name?: string
  email?: string
  phone?: string
  is_active?: boolean
  position_ids?: string[]
}

export interface NotificationRouteInput {
  event_type_id: string
  position_id: string
  email_enabled: boolean
  is_active?: boolean
}

export interface WidgetVisibilityInput {
  position_id: string
  widget_id: string
  is_visible: boolean
  sort_order?: number
}

export interface AdminStats {
  projectCount: number
  memberCount: number
  positionCount: number
  activeRouteCount: number
}
