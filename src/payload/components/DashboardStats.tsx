type Stat = {
  label: string
  value: number | null
  href: string
  format?: 'currency'
}

const formatValue = (stat: Stat): string => {
  // null means the viewer's role cannot read that collection, or the read failed.
  if (stat.value === null) return '—'
  if (stat.format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(stat.value)
  }
  return String(stat.value)
}

/**
 * Presentational half of the dashboard. Each card links to the matching filtered list
 * view, so a number is always one click from the records behind it.
 */
export const DashboardStats = ({ stats }: { stats: Stat[] }) => (
  <div
    style={{
      display: 'grid',
      gap: '1rem',
      gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
      marginBottom: '2rem',
    }}
  >
    {stats.map((stat) => (
      <a
        key={stat.label}
        href={stat.href}
        style={{
          display: 'block',
          padding: '1.25rem',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '0.75rem',
          background: 'var(--theme-elevation-50)',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--theme-elevation-600)',
          }}
        >
          {stat.label}
        </div>
        <div
          style={{
            marginTop: '0.5rem',
            fontSize: '1.75rem',
            fontWeight: 600,
            color: 'var(--theme-elevation-1000)',
          }}
        >
          {formatValue(stat)}
        </div>
      </a>
    ))}
  </div>
)

export default DashboardStats
