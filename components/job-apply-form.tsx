'use client'

import { useCallback, useState, type DragEvent, type FormEvent } from 'react'
import { FileText } from 'lucide-react'
import { JOB_DEPARTMENTS, JOB_WORKING_TERMS } from '@/lib/jobs'
import { CvUploadOverlay } from '@/components/cv-upload-overlay'
import { SiteToast } from '@/components/site-toast'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isCvFile(file: File) {
  const name = file.name.toLowerCase()
  return (
    file.type === 'application/pdf'
    || file.type === 'application/msword'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || name.endsWith('.pdf')
    || name.endsWith('.doc')
    || name.endsWith('.docx')
  )
}

export function JobApplyForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [overlay, setOverlay] = useState('')
  const [toast, setToast] = useState('')

  const hideToast = useCallback(() => setToast(''), [])

  function assignFile(input: HTMLInputElement, file?: File | null) {
    if (!file) return
    if (!isCvFile(file) || file.size > 8 * 1024 * 1024) {
      setError('Upload a PDF or Word CV under 8MB.')
      return
    }
    const transfer = new DataTransfer()
    transfer.items.add(file)
    input.files = transfer.files
    setFileName(file.name)
    setError('')
    if (prefersReducedMotion()) return
    setOverlay('Tucking your CV in')
    window.setTimeout(() => setOverlay(''), 1400)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const cv = (form.elements.namedItem('cv') as HTMLInputElement | null)?.files?.[0]
    if (!cv) {
      setError('Upload your CV to continue.')
      return
    }
    setBusy(true)
    setError('')
    if (!prefersReducedMotion()) setOverlay('Sending your application')
    try {
      const response = await fetch('/api/jobs/apply', { method: 'POST', body: new FormData(form) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) throw new Error(payload.message || 'Could not submit')
      form.reset()
      setFileName('')
      setToast('Thank you for showing interest. We shall hopefully get back to you.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit your application')
    } finally {
      setOverlay('')
      setBusy(false)
    }
  }

  return (
    <>
      <form className="quote-form job-apply-form" onSubmit={(event) => void onSubmit(event)}>
        <div className="admin-job-row">
          <label>
            Full name
            <input name="fullName" required autoComplete="name" placeholder="Your name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
          </label>
        </div>
        <label>
          Phone
          <input name="phone" type="tel" required autoComplete="tel" placeholder="07xx xxx xxx" />
        </label>
        <label>
          Department
          <select name="department" required defaultValue="">
            <option value="" disabled>Select a department</option>
            {JOB_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        </label>
        <fieldset className="job-terms">
          <legend>Working terms</legend>
          {JOB_WORKING_TERMS.map((term, index) => (
            <label key={term} className="job-term">
              <input type="radio" name="workingTerms" value={term} required defaultChecked={index === 1} />
              {term}
            </label>
          ))}
        </fieldset>
        <label>
          Note <span className="job-optional">(optional)</span>
          <textarea name="notes" rows={4} placeholder="A short note about your experience or the role you are looking for" />
        </label>
        <div
          className={`job-cv-drop${dragging ? ' is-dragging' : ''}${fileName ? ' has-file' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragOver={(event: DragEvent) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            setDragging(true)
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) return
            setDragging(false)
          }}
          onDrop={(event: DragEvent) => {
            event.preventDefault()
            setDragging(false)
            const input = event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null
            if (input) assignFile(input, event.dataTransfer.files[0])
          }}
        >
          <input
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
            onChange={(event) => assignFile(event.currentTarget, event.currentTarget.files?.[0])}
          />
          <span className="catalogue-dance job-cv-dance"><FileText size={22} /></span>
          <strong>
            {fileName
              ? fileName
              : dragging
                ? 'Drop your CV now'
                : 'Drop your CV here'}
          </strong>
          <span>{fileName ? 'Click to replace · PDF or Word, up to 8MB' : 'or click to browse · PDF or Word, up to 8MB'}</span>
        </div>
        <button className="button button-primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit application'}
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
      {overlay ? <CvUploadOverlay label={overlay} /> : null}
      {toast ? <SiteToast message={toast} onDone={hideToast} /> : null}
    </>
  )
}
