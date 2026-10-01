'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Heart, MessageCircle } from 'lucide-react'

type EventComment = {
  _id: string
  name: string
  body: string
  createdAt: string
}

type Engagement = {
  likes: number
  liked: boolean
  comments: EventComment[]
}

const VISITOR_KEY = 'accord_vid'
const NAME_KEY = 'accord_comment_name'

function visitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, created)
    return created
  } catch {
    return ''
  }
}

function formatCount(value: number, one: string, many: string) {
  const count = Math.max(0, value)
  return `${count} ${count === 1 ? one : many}`
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function EventEngagement({ slug }: { slug: string }) {
  const [data, setData] = useState<Engagement>({ likes: 0, liked: false, comments: [] })
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const commentsRef = useRef<HTMLTextAreaElement>(null)

  async function load() {
    const id = visitorId()
    const response = await fetch(`/api/events/${encodeURIComponent(slug)}/engagement?visitorId=${encodeURIComponent(id)}`)
    const payload = await response.json().catch(() => null)
    if (payload?.success && payload.data) setData(payload.data)
    setLoaded(true)
  }

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) || '')
    } catch {}
    void load().catch(() => setLoaded(true))
  }, [slug])

  async function toggleLike() {
    if (busy) return
    const nextLiked = !data.liked
    setBusy(true)
    setError('')
    setData((current) => ({
      ...current,
      liked: nextLiked,
      likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)),
    }))
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        await load()
        setError(payload?.message || 'Could not save that like')
        return
      }
      setData(payload.data)
    } catch {
      await load()
      setError('Could not save that like')
    } finally {
      setBusy(false)
    }
  }

  function focusComments() {
    document.getElementById('event-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    commentsRef.current?.focus()
  }

  async function postComment(event: FormEvent) {
    event.preventDefault()
    if (posting) return
    setPosting(true)
    setError('')
    try {
      localStorage.setItem(NAME_KEY, name.trim())
    } catch {}
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId(), name, body, website }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        setError(payload?.message || 'Could not post that comment')
        return
      }
      setData(payload.data)
      setBody('')
    } catch {
      setError('Could not post that comment')
    } finally {
      setPosting(false)
    }
  }

  return (
    <section className="event-talk" aria-label="Likes and comments">
      <div className="event-talk-actions">
        <button
          type="button"
          className={`button button-outline button-compact event-like${data.liked ? ' is-liked' : ''}`}
          aria-pressed={data.liked}
          disabled={busy}
          onClick={() => void toggleLike()}
        >
          <Heart size={14} fill={data.liked ? 'currentColor' : 'none'} />
          {data.liked ? 'Liked' : 'Like'}
        </button>
        <button type="button" className="button button-outline button-compact" onClick={focusComments}>
          <MessageCircle size={14} />
          Comment
        </button>
      </div>
      <p className="event-talk-tally">
        {loaded ? `${formatCount(data.likes, 'like', 'likes')} · ${formatCount(data.comments.length, 'comment', 'comments')}` : 'Likes and comments'}
      </p>
      <div id="event-comments" className="event-comments">
        <h2>Comments</h2>
        <form className="event-comment-form" onSubmit={(event) => void postComment(event)}>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required autoComplete="name" />
          </label>
          <label className="event-honeypot">
            Website
            <input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
          </label>
          <label>
            Comment
            <textarea
              ref={commentsRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              rows={4}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="button button-primary button-compact" disabled={posting}>
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
        {data.comments.length === 0 ? (
          <p className="event-comments-empty">Be the first to comment.</p>
        ) : (
          <ul className="event-comment-list">
            {data.comments.map((item) => (
              <li key={item._id}>
                <strong>{item.name}</strong>
                <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
