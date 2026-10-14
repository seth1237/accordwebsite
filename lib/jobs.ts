export type JobImage = {
  publicId: string
  secureUrl: string
}

export const JOB_DEPARTMENTS = [
  'Accounts',
  'Management',
  'Delivery',
  'Warehouse Management',
  'IT',
  'Marketing',
  'Digital Marketing',
  'Human Resource',
  'Sales',
  'Technical Service',
  'Technical Sales Engineer',
] as const

export const JOB_WORKING_TERMS = ['Internship', 'Full time', 'Part time'] as const

export type JobDepartment = (typeof JOB_DEPARTMENTS)[number]
export type JobWorkingTerms = (typeof JOB_WORKING_TERMS)[number]

export type JobApplication = {
  _id: string
  fullName: string
  email: string
  phone: string
  department: string
  workingTerms: string
  notes: string
  cvFilename: string
  cvFileId: number | null
  status: 'new' | 'reviewed'
  createdAt: string
}

export type JobPost = {
  _id: string
  title: string
  slug: string
  location: string
  employmentType: string
  department: string
  summary: string
  description: string
  requirements: string
  applyEmail: string
  image: JobImage | null
  published: boolean
  createdAt: string
  updatedAt: string
}

export function jobHref(job: Pick<JobPost, 'slug'>) {
  return `/vacancy/${job.slug}`
}
