// Server-side renderer for SEO copy that may contain {{…}} price tokens: plain
// text stays server-rendered, each token becomes a small LivePriceToken island.

import { Fragment } from 'react'
import { splitPriceText } from '@/lib/seo-price-tokens'
import LivePriceToken from './LivePriceToken'

export default function PriceText({ text }: { text: string }) {
  return (
    <>
      {splitPriceText(text).map((part, i) =>
        'token' in part ? <LivePriceToken key={i} token={part.token} /> : <Fragment key={i}>{part.text}</Fragment>
      )}
    </>
  )
}
