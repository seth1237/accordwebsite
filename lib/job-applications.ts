import {
  JOB_DEPARTMENTS,
  JOB_WORKING_TERMS,
  type JobApplication,
  type JobDepartment,
  type JobWorkingTerms,
} from '@/lib/jobs'
import {
  isMysqlConfigured,
  mysqlCreateJobApplication,
  mysqlDeleteJobApplication,
  mysqlGetJobApplication,
  mysqlGetJobApplicationCv,
  mysqlListJobApplications,
  mysqlUpdateJobApplicationStatus,
} from '@/lib/mysql'

function isDepartment(value: string): value is JobDepartment {
  return (JOB_DEPARTMENTS as readonly string[]).includes(value)
}

function isWorkingTerms(value: string): value is JobWorkingTerms {
  return (JOB_WORKING_TERMS as readonly string[]).includes(value)
}

export async function createJobApplication(input: {
  fullName: string
  email: string
  phone: string
  department: string
  workingTerms: string
  notes?: string
  cv: { buffer: Buffer; filename: string; mime: string }
}) {
  if (!isMysqlConfigured()) throw new Error('Applications are not available right now')
  const fullName = String(input.fullName || '').trim()
  const email = String(input.email || '').trim()
  const phone = String(input.phone || '').trim()
  const department = String(input.department || '').trim()
  const workingTerms = String(input.workingTerms || '').trim()
  if (!fullName || !email || !phone) throw new Error('Enter your name, email, and phone number')
  if (!email.includes('@')) throw new Error('Enter a valid email address')
  if (!isDepartment(department)) throw new Error('Choose a department')
  if (!isWorkingTerms(workingTerms)) throw new Error('Choose internship, full time, or part time')
  if (!input.cv?.buffer?.length) throw new Error('Upload your CV')
  return mysqlCreateJobApplication({
    fullName,
    email,
    phone,
    department,
    workingTerms,
    notes: input.notes,
    cv: input.cv,
  })
}

export async function listJobApplications(): Promise<JobApplication[]> {
  if (!isMysqlConfigured()) return []
  return mysqlListJobApplications()
}

export async function getJobApplication(id: string) {
  if (!isMysqlConfigured()) return null
  return mysqlGetJobApplication(id)
}

export async function updateJobApplicationStatus(id: string, status: 'new' | 'reviewed') {
  if (!isMysqlConfigured()) throw new Error('Applications are not available right now')
  const item = await mysqlUpdateJobApplicationStatus(id, status)
  if (!item) throw new Error('Application not found')
  return item
}

export async function deleteJobApplication(id: string) {
  if (!isMysqlConfigured()) throw new Error('Applications are not available right now')
  const item = await mysqlDeleteJobApplication(id)
  if (!item) throw new Error('Application not found')
  return item
}

export async function getJobApplicationCv(id: string) {
  if (!isMysqlConfigured()) return null
  return mysqlGetJobApplicationCv(id)
}
