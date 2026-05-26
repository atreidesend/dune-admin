import { InputGroup, TextField, Button } from '@heroui/react'
import { Icon } from '../../dune-ui'

export type MarketFilters = {
  search: string
  category: string
  owner: '' | 'bot' | 'player'
}

type Props = {
  filters: MarketFilters
  onChange: (f: MarketFilters) => void
  onReset: () => void
}

export default function MarketSearch({ filters, onChange, onReset }: Props) {
  const set = (patch: Partial<MarketFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TextField aria-label="Search items" className="flex-1 min-w-[200px]">
        <InputGroup>
          <InputGroup.Prefix><Icon name="search" /></InputGroup.Prefix>
          <InputGroup.Input
            value={filters.search}
            onChange={e => set({ search: e.target.value })}
            placeholder="Search items…"
          />
          {filters.search && (
            <InputGroup.Suffix>
              <button
                className="text-muted hover:text-foreground px-1"
                onClick={() => set({ search: '' })}
                aria-label="Clear search"
              >
                <Icon name="x" />
              </button>
            </InputGroup.Suffix>
          )}
        </InputGroup>
      </TextField>

      <select
        className="bg-surface border border-border rounded px-2 py-1.5 text-sm text-foreground"
        value={filters.owner}
        onChange={e => set({ owner: e.target.value as MarketFilters['owner'] })}
        aria-label="Filter by owner"
      >
        <option value="">All sellers</option>
        <option value="bot">Bot only</option>
        <option value="player">Players only</option>
      </select>

      {(filters.search || filters.category || filters.owner) && (
        <Button size="sm" variant="ghost" onPress={onReset}>
          <Icon name="x" /> Clear
        </Button>
      )}
    </div>
  )
}
