const siteName = 'Candley Aroma'

type PageMetaProps = { title?: string; description?: string; image?: string; canonicalPath?: string; noIndex?: boolean }

/** Per-page metadata. React 19 hoists these tags into <head>. */
export const PageMeta = ({ title, description, image, canonicalPath, noIndex }: PageMetaProps) => {
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | Premium candles & home fragrance`
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '')
  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      {appUrl && canonicalPath && <link rel="canonical" href={`${appUrl}${canonicalPath}`} />}
      {noIndex && <meta name="robots" content="noindex" />}
    </>
  )
}
