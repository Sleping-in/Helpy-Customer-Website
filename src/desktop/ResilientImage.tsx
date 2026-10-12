import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  src?: string
  fallbackSrc?: string
  fallback: ReactNode
}

const isBackendPlaceholder = (url: string) => /\/images\/(?:default-image|deafult_user|default-user)\.png(?:\?|$)/i.test(url)

export default function ResilientImage({ src, fallbackSrc, fallback, ...imageProps }: Props) {
  const [failedUrls, setFailedUrls] = useState<string[]>([])
  const primary = src && !isBackendPlaceholder(src) && !failedUrls.includes(src) ? src : ''
  const image = primary || (fallbackSrc && !failedUrls.includes(fallbackSrc) ? fallbackSrc : '')

  if (!image) return <>{fallback}</>

  return <img {...imageProps} src={image} onError={() => setFailedUrls(current => current.includes(image) ? current : [...current, image])} />
}
