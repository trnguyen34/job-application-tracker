export const STATUSES = [
  'wishlist',
  'applied',
  'phone_screen',
  'interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
  'ghosted',
] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
}

export type WorkMode = 'remote' | 'hybrid' | 'onsite'
export type Priority = 'low' | 'medium' | 'high'
export type RoundType =
  | 'phone_screen'
  | 'technical'
  | 'behavioral'
  | 'system_design'
  | 'onsite'
  | 'final'
  | 'other'
export type Outcome = 'pending' | 'passed' | 'failed' | 'cancelled'
export type FileType = 'resume' | 'cover_letter' | 'other'

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  phone_screen: 'Phone Screen',
  technical: 'Technical',
  behavioral: 'Behavioral',
  system_design: 'System Design',
  onsite: 'Onsite',
  final: 'Final',
  other: 'Other',
}

export interface Application {
  id: number
  company: string
  role: string
  status: Status
  applied_date: string | null
  job_url: string | null
  location: string | null
  work_mode: WorkMode | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  source: string | null
  priority: Priority
  created_at: string
  updated_at: string
}

export interface ReminderBrief {
  id: number
  due_date: string
  description: string
}

export interface InterviewBrief {
  id: number
  round_type: RoundType
  scheduled_at: string | null
}

export interface ApplicationCard extends Application {
  days_since_applied: number | null
  next_reminder: ReminderBrief | null
  next_interview: InterviewBrief | null
}

export interface Contact {
  id: number
  application_id: number
  name: string
  role: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  notes: string | null
  created_at: string
}

export interface InterviewRound {
  id: number
  application_id: number
  round_type: RoundType
  scheduled_at: string | null
  interviewers: string | null
  outcome: Outcome
  notes: string | null
  created_at: string
}

export interface Note {
  id: number
  application_id: number
  body: string
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: number
  application_id: number
  filename: string
  file_type: FileType
  content_type: string | null
  size_bytes: number | null
  uploaded_at: string
}

export interface Reminder {
  id: number
  application_id: number
  due_date: string
  description: string
  done: boolean
  created_at: string
}

export interface ReminderWithApplication extends Reminder {
  company: string
  role: string
}

export interface ApplicationDetail extends Application {
  contacts: Contact[]
  interview_rounds: InterviewRound[]
  notes: Note[]
  attachments: Attachment[]
  reminders: Reminder[]
}

export interface Stats {
  totals: { total: number; active: number; offers: number; rejected: number }
  applications_over_time: { week: string; count: number }[]
  applications_per_day: { date: string; count: number }[]
  status_funnel: { status: Status; count: number }[]
  by_source: { source: string; count: number }[]
  avg_response_time_days: number | null
}

export type ApplicationInput = Partial<Omit<Application, 'id' | 'created_at' | 'updated_at'>> & {
  company: string
  role: string
}
