import { eventHref, type EventPost } from '@/lib/content'
import { vimeoId, youtubeId, type EventBlock } from '@/lib/event-body'

export function EventBodyView({ blocks }: { blocks: EventBlock[] }) {
  if (!blocks.length) return null
  return (
    <div className="event-body">
      {blocks.map((block) => {
        if (block.type === 'heading') {
          return block.level === 3 ? <h3 key={block.id}>{block.text}</h3> : <h2 key={block.id}>{block.text}</h2>
        }
        if (block.type === 'paragraph' && block.html.trim()) {
          return <p key={block.id} dangerouslySetInnerHTML={{ __html: block.html }} />
        }
        if (block.type === 'image' && block.image.secureUrl) {
          return (
            <figure key={block.id}>
              <img src={block.image.secureUrl} alt={block.alt || ''} />
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          )
        }
        if (block.type === 'quote' && block.text.trim()) {
          return (
            <blockquote key={block.id}>
              <p>{block.text}</p>
              {block.cite ? <cite>{block.cite}</cite> : null}
            </blockquote>
          )
        }
        if (block.type === 'list' && block.items.some((item) => item.trim())) {
          const items = block.items.filter((item) => item.trim())
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List key={block.id}>
              {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
            </List>
          )
        }
        if (block.type === 'link' && block.url) {
          const external = !block.url.startsWith('/')
          return (
            <p key={block.id} className="event-body-link">
              <a href={block.url} className="button button-primary" target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
                {block.label || block.url}
              </a>
              {block.note ? <span>{block.note}</span> : null}
            </p>
          )
        }
        if (block.type === 'video') {
          const yt = youtubeId(block.url)
          const vim = vimeoId(block.url)
          if (yt) {
            return (
              <div key={block.id} className="event-video">
                <iframe title="Video" src={`https://www.youtube.com/embed/${yt}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            )
          }
          if (vim) {
            return (
              <div key={block.id} className="event-video">
                <iframe title="Video" src={`https://player.vimeo.com/video/${vim}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            )
          }
        }
        if (block.type === 'divider') return <hr key={block.id} />
        return null
      })}
    </div>
  )
}

export function EventMeta({ item }: { item: EventPost }) {
  const date = new Date(item.startAt)
  const when = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'short' })
  return (
    <p className="event-meta">
      {when}{item.location ? ` · ${item.location}` : ''}
    </p>
  )
}

export function eventReadHref(item: EventPost) {
  return eventHref(item)
}
