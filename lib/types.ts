export interface StaffProfile {
  id: string
  email: string
  name: string
  clinic: 'MAH' | 'HPVC' | 'Both'
  role: 'staff' | 'admin'
  created_at: string
}

export interface Document {
  id: string
  created_at: string
  file_name: string
  storage_path: string
  title: string
  description: string
  category: string
  folder_id?: string | null  //
  clinic: 'MAH' | 'HPVC' | 'Both'
}

export const CATEGORIES = [
  'Emergency Procedures',
  'Contacts',
  'HR & Leave',
  'Clinical Protocols',
  'Equipment',
  'WHS & Safety',
  'General',
]

export const CLINICS = ['MAH', 'HPVC', 'Both'] as const
