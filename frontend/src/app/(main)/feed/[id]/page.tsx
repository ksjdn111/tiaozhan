import FeedDetailClient from './page.client'

export function generateStaticParams() {
  return [{ id: '0' }]
}

export default function Page() {
  return <FeedDetailClient />
}
