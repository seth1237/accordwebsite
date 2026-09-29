export type JobImage = {
  publicId: string
  secureUrl: string
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
