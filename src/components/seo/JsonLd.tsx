import type { JsonLdNode } from '@/lib/structured-data'

/**
 * Renders a schema.org graph into the page as `application/ld+json`.
 *
 * Server-rendered on purpose: answer engines and crawlers read the initial HTML, and
 * a block injected after hydration is a block most of them never see.
 *
 * `<` is escaped to `<`. JSON is otherwise valid inside a <script>, but a CMS
 * string containing the literal sequence `</script` would end the element early and
 * spill the rest of the payload into the document as markup. Escaping the opening
 * angle bracket is the standard defence and leaves the JSON semantically identical.
 */
export const JsonLd = ({ data }: { data: JsonLdNode | JsonLdNode[] }) => {
  const payload = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data }
    : { '@context': 'https://schema.org', ...data }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- payload is JSON.stringify output with < escaped
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, '\\u003c'),
      }}
    />
  )
}
