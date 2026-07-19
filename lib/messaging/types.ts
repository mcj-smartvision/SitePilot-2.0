export interface MessengerContact {
  userId: string
  fullName: string
  email: string | null
  /** Primary responsibility label (position), shown as chat title */
  positionLabel: string
  positionKey: string | null
  positionLabels: string[]
}

export interface MessengerAttachment {
  id: string
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  storagePath: string
  url: string | null
}

export interface MessengerConversation {
  id: string
  projectId: string
  kind: 'direct' | 'group' | 'broadcast'
  subject: string | null
  updatedAt: string
  peer: MessengerContact | null
  lastMessage: {
    id: string
    body: string
    senderId: string
    createdAt: string
  } | null
  unreadCount: number
  /** Project-wide hub group for meetings / important notes */
  isProjectHub?: boolean
  memberCount?: number
  /** Folder section in UI: hub | direct */
  folder: 'hub' | 'direct'
}

export interface MessengerMessage {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  senderPositionLabel: string | null
  senderName: string | null
  mine: boolean
  attachments: MessengerAttachment[]
  forwardedFromId?: string | null
  isForwarded?: boolean
}

export type CallMedia = 'audio' | 'video'
export type CallStatus = 'ringing' | 'accepted' | 'ended' | 'rejected' | 'missed'

export interface MessengerCall {
  id: string
  projectId: string
  conversationId: string
  callerId: string
  calleeId: string
  media: CallMedia
  status: CallStatus
  createdAt: string
}
