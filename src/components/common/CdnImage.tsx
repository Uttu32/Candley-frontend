import type { ImgHTMLAttributes } from 'react'
import { optimizedImage } from '../../utils/image'

type CdnImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width'> & {
  src: string
  /** Rendered width in CSS pixels; a 2× version is offered for high-density screens. */
  width: number
}

/** Image that loads lazily by default and is served at the size it is shown. */
export const CdnImage = ({ src, width, loading = 'lazy', decoding = 'async', alt = '', ...props }: CdnImageProps) => {
  const resized = optimizedImage(src, width)
  const srcSet = resized === src ? undefined : `${resized} 1x, ${optimizedImage(src, width * 2)} 2x`
  return <img src={resized} srcSet={srcSet} loading={loading} decoding={decoding} alt={alt} {...props} />
}
