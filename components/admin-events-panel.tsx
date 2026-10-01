'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlignLeft,
  Heading2,
  ImagePlus,
  Link2,
  List,
  Minus,
  Quote,
  Video,
} from 'lucide-react'
import { eventHref, type EventPost } from '@/lib/content'
import {
  createBlock,
  excerptFromBody,
  isSafeHref,
  parseEventBody,
  sanitizeRichText,
  type EventBlock,
  type EventBlockType,
} from '@/lib/event-body'

const BLOCKS: { type: EventBlockType; label: string; icon: typeof AlignLeft }[] = [
  { type: 'paragraph', label: 'Text', icon: AlignLeft },
  { type: 'heading', label: 'Heading', icon: Heading2 },
  { type: 'image', label: 'Photo', icon: ImagePlus },
  { type: 'quote', label: 'Quote', icon: Quote },
  { type: 'list', label: 'List', icon: List },
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'divider', label: 'Line', icon: Minus },
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function datetimeValue(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function nowLocal() {
  return datetimeValue(new Date().toISOString())
}

function formatWhen(value: string) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

function ParagraphField({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html || ''
  }, [])

  function commit(sanitize = false) {
    const value = ref.current?.innerHTML || ''
    onChange(sanitize ? sanitizeRichText(value) : value)
  }

  function command(name: string, value?: string) {
    ref.current?.focus()
    document.execCommand(name, false, value)
    commit()
  }

  function addLink() {
    const url = window.prompt('Link URL', 'https://')
    if (!url || !isSafeHref(url.trim())) return
    command('createLink', url.trim())
  }

  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <div className="event-write-text">
      <div className="event-inline-tools">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command('bold')}>Bold</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command('italic')}>Italic</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>Link</button>
      </div>
      <div
        ref={ref}
        className="event-write-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={() => commit(false)}
        onBlur={() => commit(true)}
        onPaste={onPaste}
        data-placeholder="Write the next section…"
      />
    </div>
  )
}

async function uploadImage(file: File) {
  const data = new FormData()
  data.set('file', file)
  data.set('folder', 'tarumed/events')
  data.set('name', file.name.replace(/\.[^.]+$/, ''))
  const response = await fetch('/api/admin/media', { method: 'POST', body: data })
  const payload = await response.json()
  if (!response.ok || !payload?.data?.secureUrl) throw new Error(payload.message || 'Could not upload image')
  return payload.data as { publicId: string; secureUrl: string }
}

function BlockEditor({
  block,
  onChange,
  onUploadError,
}: {
  block: EventBlock
  onChange: (block: EventBlock) => void
  onUploadError: (message: string) => void
}) {
  async function onImage(file: File | undefined) {
    if (!file) return
    try {
      const image = await uploadImage(file)
      if (block.type === 'image') onChange({ ...block, image, alt: block.alt || file.name.replace(/\.[^.]+$/, '') })
    } catch (error) {
      onUploadError(error instanceof Error ? error.message : 'Could not upload image')
    }
  }

  if (block.type === 'paragraph') {
    return <ParagraphField html={block.html} onChange={(html) => onChange({ ...block, html })} />
  }
  if (block.type === 'heading') {
    return (
      <div className="event-write-heading">
        <select value={block.level} onChange={(event) => onChange({ ...block, level: event.target.value === '3' ? 3 : 2 })}>
          <option value="2">Section heading</option>
          <option value="3">Small heading</option>
        </select>
        <input value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} placeholder="Heading" />
      </div>
    )
  }
  if (block.type === 'image') {
    return (
      <div className="event-write-image">
        {block.image.secureUrl ? <img src={block.image.secureUrl} alt="" /> : <p>Drop a photo into the post, or choose a file.</p>}
        <input type="file" accept="image/*" onChange={(event) => onImage(event.target.files?.[0])} />
        <input value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} placeholder="Alt text" />
        <input value={block.caption} onChange={(event) => onChange({ ...block, caption: event.target.value })} placeholder="Caption (optional)" />
      </div>
    )
  }
  if (block.type === 'quote') {
    return (
      <div className="event-write-quote">
        <textarea rows={3} value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} placeholder="Quoted text" />
        <input value={block.cite} onChange={(event) => onChange({ ...block, cite: event.target.value })} placeholder="Source (optional)" />
      </div>
    )
  }
  if (block.type === 'list') {
    return (
      <div className="event-write-list">
        <label className="admin-check">
          <input type="checkbox" checked={block.ordered} onChange={(event) => onChange({ ...block, ordered: event.target.checked })} /> Numbered list
        </label>
        <textarea
          rows={5}
          value={block.items.join('\n')}
          onChange={(event) => onChange({ ...block, items: event.target.value.split('\n') })}
          placeholder={'One item per line'}
        />
      </div>
    )
  }
  if (block.type === 'link') {
    return (
      <div className="event-write-link">
        <input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} placeholder="Button label" />
        <input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} placeholder="https://" />
        <input value={block.note} onChange={(event) => onChange({ ...block, note: event.target.value })} placeholder="Short note under the button (optional)" />
      </div>
    )
  }
  if (block.type === 'video') {
    return (
      <input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} placeholder="YouTube or Vimeo URL" />
    )
  }
  return <hr className="event-write-rule" />
}

export function AdminEventsPanel({ items }: { items: EventPost[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const loadedFor = useRef<string | 'new' | null>(null)
  const selected = useMemo(() => items.find((item) => item._id === selectedId) || null, [items, selectedId])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [location, setLocation] = useState('')
  const [registrationUrl, setRegistrationUrl] = useState('')
  const [published, setPublished] = useState(true)
  const [coverUrl, setCoverUrl] = useState('')
  const [removeCover, setRemoveCover] = useState(false)
  const [blocks, setBlocks] = useState<EventBlock[]>([createBlock('paragraph')])

  useEffect(() => {
    if (!selectedId) {
      loadedFor.current = null
      return
    }
    const item = items.find((row) => row._id === selectedId)
    if (selectedId !== 'new' && !item) return
    if (loadedFor.current === selectedId) return
    loadedFor.current = selectedId
    setTitle(item?.title || '')
    setSlug(item?.slug || '')
    setDescription(item?.description || '')
    setStartAt(datetimeValue(item?.startAt || '') || (selectedId === 'new' ? nowLocal() : ''))
    setLocation(item?.location || '')
    setRegistrationUrl(item?.registrationUrl || '')
    setPublished(item ? item.published !== false : true)
    setCoverUrl(item?.cover?.secureUrl || '')
    setRemoveCover(false)
    const body = parseEventBody(item?.body, item?.description || '')
    setBlocks(body.length ? body : [createBlock('paragraph')])
  }, [selectedId, items])

  function updateBlock(id: string, next: EventBlock) {
    setBlocks((current) => current.map((block) => (block.id === id ? next : block)))
  }

  function insertBlock(type: EventBlockType, afterId?: string) {
    const created = createBlock(type)
    setBlocks((current) => {
      if (!afterId) return [...current, created]
      const index = current.findIndex((block) => block.id === afterId)
      const copy = [...current]
      copy.splice(index + 1, 0, created)
      return copy
    })
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id)
      const next = index + direction
      if (index < 0 || next < 0 || next >= current.length) return current
      const copy = [...current]
      const [item] = copy.splice(index, 1)
      copy.splice(next, 0, item)
      return copy
    })
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setMessage('Title is required')
      return
    }
    const data = new FormData(event.currentTarget)
    data.set('title', title.trim())
    data.set('slug', slug.trim())
    data.set('description', description.trim() || excerptFromBody(blocks))
    data.set('startAt', startAt)
    data.set('location', location.trim())
    data.set('registrationUrl', registrationUrl.trim())
    data.set('published', published ? 'true' : 'false')
    data.set('body', JSON.stringify(blocks))
    if (removeCover) data.set('removeImage', 'true')
    setSaving(true)
    setMessage('')
    const url = selectedId && selectedId !== 'new' ? `/api/admin/events/${selectedId}` : '/api/admin/events'
    const response = await fetch(url, { method: selectedId && selectedId !== 'new' ? 'PATCH' : 'POST', body: data })
    const payload = await response.json()
    setSaving(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not save event')
      return
    }
    setMessage('Event saved.')
    loadedFor.current = payload.data?._id || selectedId
    setSelectedId(payload.data?._id || null)
    router.refresh()
  }

  async function remove(id?: string) {
    const target = id || (selectedId && selectedId !== 'new' ? selectedId : '')
    if (!target) return
    if (!window.confirm('Delete this event? This cannot be undone.')) return
    setBusyId(target)
    const response = await fetch(`/api/admin/events/${target}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not delete event')
      return
    }
    if (selectedId === target) setSelectedId(null)
    setMessage('Event deleted.')
    router.refresh()
  }

  async function duplicate(item: EventPost) {
    setBusyId(item._id)
    setMessage('')
    const response = await fetch(`/api/admin/events/${item._id}/duplicate`, { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not duplicate event')
      return
    }
    setMessage('Draft copy created.')
    loadedFor.current = null
    setSelectedId(payload.data?._id || null)
    router.refresh()
  }

  async function togglePublished(item: EventPost, next: boolean) {
    setBusyId(item._id)
    setMessage('')
    const data = new FormData()
    data.set('published', next ? 'true' : 'false')
    const response = await fetch(`/api/admin/events/${item._id}`, { method: 'PATCH', body: data })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not update event')
      return
    }
    setMessage(next ? 'Event published.' : 'Event unpublished.')
    router.refresh()
  }

  function edit(id: string | 'new') {
    loadedFor.current = null
    setSelectedId(id)
    setMessage('')
    window.requestAnimationFrame(() => {
      document.querySelector('.event-write')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Events</h1>
          <p className="admin-header-note">Write each event as a post. Photos, links, and video can sit in the body.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => edit('new')}>New post</button>
      </header>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Posts</h3>
            <span>Edit, duplicate, publish, or delete from this list. Published posts appear on /events.</span>
          </div>
        </div>
        {items.length === 0 && <p className="text-muted-foreground">Nothing here yet.</p>}
        <div className="admin-product-list">
          {items.map((item) => (
            <article key={item._id} className={`admin-event-row${selectedId === item._id ? ' is-selected' : ''}`}>
              <button type="button" className="admin-product" onClick={() => edit(item._id)} disabled={busyId === item._id}>
                {item.cover?.secureUrl ? <img src={item.cover.secureUrl} alt="" /> : <span className="admin-job-placeholder" />}
                <div>
                  <b>{item.title}</b>
                  <small>
                    {formatWhen(item.startAt)}
                    {item.location ? ` · ${item.location}` : ''}
                    {item.published === false ? ' · Draft' : ' · Live'}
                  </small>
                </div>
              </button>
              <div className="admin-event-actions">
                <button type="button" onClick={() => edit(item._id)} disabled={busyId === item._id}>Edit</button>
                {item.slug ? (
                  <a href={eventHref(item)} target="_blank" rel="noreferrer">View</a>
                ) : null}
                <button type="button" onClick={() => duplicate(item)} disabled={busyId === item._id}>Duplicate</button>
                <button type="button" onClick={() => togglePublished(item, item.published === false)} disabled={busyId === item._id}>
                  {item.published === false ? 'Publish' : 'Unpublish'}
                </button>
                <button type="button" className="is-danger" onClick={() => remove(item._id)} disabled={busyId === item._id}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selectedId && (
        <form key={selectedId} className="admin-card event-write" onSubmit={save}>
          <div className="card-title">
            <div>
              <h3>{selected ? 'Edit post' : 'New post'}</h3>
              <span>Cover and title first, then the article body.</span>
            </div>
          </div>
          <label className="event-write-cover">
            Cover image
            {coverUrl && !removeCover ? <img src={coverUrl} alt="" /> : null}
            <input name="cover" type="file" accept="image/*" />
            {coverUrl ? (
              <label className="admin-check">
                <input type="checkbox" checked={removeCover} onChange={(event) => setRemoveCover(event.target.checked)} /> Remove current cover
              </label>
            ) : null}
          </label>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Event title" />
          </label>
          <div className="admin-job-row">
            <label>
              Date and time
              <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </label>
            <label>
              Location
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Venue or city" />
            </label>
          </div>
          <div className="admin-job-row">
            <label>
              Registration URL
              <input type="url" value={registrationUrl} onChange={(event) => setRegistrationUrl(event.target.value)} placeholder="https://" />
            </label>
            <label>
              URL slug
              <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="generated-from-title" />
            </label>
          </div>
          <label>
            Short intro
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Shown on the events list. Leave blank to use the first paragraph." />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Published
          </label>

          <div className="event-write-body">
            <div className="event-write-body-head">
              <h4>Article</h4>
              <p>Insert text, photos, lists, quotes, buttons, or video anywhere in the post.</p>
            </div>
            <div className="event-write-insert">
              {BLOCKS.map((item) => {
                const Icon = item.icon
                return (
                  <button key={`top-${item.type}`} type="button" onClick={() => setBlocks((current) => [createBlock(item.type), ...current])}>
                    <Icon size={14} /> {item.label}
                  </button>
                )
              })}
            </div>
            {blocks.map((block) => (
              <div key={block.id} className="event-write-block">
                <div className="event-write-block-bar">
                  <span>{BLOCKS.find((item) => item.type === block.type)?.label || block.type}</span>
                  <div>
                    <button type="button" onClick={() => moveBlock(block.id, -1)}>Up</button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)}>Down</button>
                    <button type="button" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}>Remove</button>
                  </div>
                </div>
                <BlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} onUploadError={setMessage} />
                <div className="event-write-insert">
                  {BLOCKS.map((item) => {
                    const Icon = item.icon
                    return (
                      <button key={item.type} type="button" onClick={() => insertBlock(item.type, block.id)}>
                        <Icon size={14} /> {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {blocks.length === 0 && (
              <div className="event-write-insert">
                {BLOCKS.map((item) => {
                  const Icon = item.icon
                  return (
                    <button key={item.type} type="button" onClick={() => insertBlock(item.type)}>
                      <Icon size={14} /> {item.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="admin-job-actions">
            <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save post'}</button>
            {selected && <button type="button" className="button button-outline" onClick={() => remove(selected._id)}>Delete</button>}
            <button type="button" className="button button-outline" onClick={() => setSelectedId(null)}>Close</button>
          </div>
        </form>
      )}
    </>
  )
}
