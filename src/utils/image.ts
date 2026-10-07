const cloudinaryImage = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/

/**
 * Asks Cloudinary for a copy sized for display (`w_<width>`), in the best format the browser accepts
 * (`f_auto`) at automatic quality (`q_auto`). Other URLs (local files, blob previews) pass through unchanged.
 */
export const optimizedImage = (url: string, width: number) => {
  const match = cloudinaryImage.exec(url)
  if (!match || /(^|,)(w|f|q)_/.test(match[2]!.split('/')[0]!)) return url
  return `${match[1]}f_auto,q_auto,c_limit,w_${Math.round(width)}/${match[2]}`
}
