import { useState, useEffect, useMemo } from 'react'
import { Button, Modal, Spinner, toast } from '@heroui/react'
import { api } from '../api/client'
import type { InventoryItem } from '../api/client'

type Container = { id: number; class: string; map: string; item_count: number }

function shortClass(cls: string): string {
  const m = cls.match(/BP_(\w+StorageContainer)/)
  return m ? m[1] : cls.split('/').pop()?.replace(/_C$/, '') ?? cls
}

export default function StorageTab() {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Container | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [showGive, setShowGive] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setContainers(await api.storage.list())
    } catch (e: unknown) {
      toast.danger((e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selectContainer = async (c: Container) => {
    setSelected(c)
    setItemsLoading(true)
    try {
      setItems(await api.storage.items(c.id))
    } catch (e: unknown) {
      toast.danger((e instanceof Error ? e.message : String(e)))
    } finally {
      setItemsLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    try {
      await api.players.deleteItem(itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      if (selected) setContainers(prev => prev.map(c => c.id === selected.id ? { ...c, item_count: c.item_count - 1 } : c))
      toast.success('Item removed')
    } catch (e: unknown) {
      toast.danger((e instanceof Error ? e.message : String(e)))
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return containers.filter(c => String(c.id).includes(q) || c.map.toLowerCase().includes(q) || shortClass(c.class).toLowerCase().includes(q))
  }, [containers, search])

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <div className="shrink-0 rounded-lg px-4 py-2 text-xs font-medium" style={{ background: '#1a0808', border: '1px solid #7a1818', color: '#e88' }}>
        ⚠ Items added to or removed from storage containers require a <strong>server zone restart</strong> to become visible to other players.
      </div>
    <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
      {/* Container list */}
      <div
        className="w-64 shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid #2a2418', borderRadius: 8 }}
      >
        <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #2a2418' }}>
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-primary)' }}>
            Containers ({containers.length})
          </span>
          <Button size="sm" variant="ghost" onPress={load} isDisabled={loading}>
            {loading ? <Spinner size="sm" color="current" /> : '↻'}
          </Button>
        </div>
        <div className="px-2 py-1.5 shrink-0">
          <input
            className="w-full rounded px-2 py-1 text-xs border"
            style={{ background: '#0d0b07', color: 'var(--color-text)', borderColor: '#2a2418', outline: 'none' }}
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => selectContainer(c)}
              className="w-full text-left px-3 py-2 text-xs transition-colors"
              style={{
                background: selected?.id === c.id ? '#241e12' : 'transparent',
                borderBottom: '1px solid #1a1610',
                borderLeft: selected?.id === c.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: 'var(--color-text)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold" style={{ color: selected?.id === c.id ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  #{c.id}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#2a2418', color: 'var(--color-text-dim)' }}>
                  {c.item_count} items
                </span>
              </div>
              <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                {shortClass(c.class)} · {c.map}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Items panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {!selected ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-dim)' }}>
            <p className="text-sm">Select a container to view its contents</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-primary)' }}>
                  Container #{selected.id}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  {shortClass(selected.class)} · {selected.map}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onPress={() => selectContainer(selected)} isDisabled={itemsLoading}>
                  {itemsLoading ? <Spinner size="sm" color="current" /> : '↻ Refresh'}
                </Button>
                <Button size="sm" onPress={() => setShowGive(true)}>
                  + Add Item
                </Button>
              </div>
            </div>

            {itemsLoading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : items.length === 0 ? (
              <div className="flex items-center justify-center flex-1" style={{ color: 'var(--color-text-dim)' }}>
                <p className="text-sm">Container is empty</p>
              </div>
            ) : (
              <div className="overflow-auto flex-1 rounded-lg" style={{ border: '1px solid #2a2418' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#1a1610', borderBottom: '1px solid #2a2418' }}>
                      {['ID', 'Template', 'Stack', 'Quality', 'Durability', ''].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #1a1610', background: i % 2 === 0 ? '#0d0b07' : '#0f0d09' }}>
                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--color-text-dim)' }}>{item.id}</td>
                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--color-text)' }}>{item.template_id}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--color-text)' }}>{item.stack_size}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--color-text)' }}>{item.quality}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--color-text-dim)' }}>{item.durability}</td>
                        <td className="px-3 py-1.5">
                          <Button size="sm" variant="danger-soft" onPress={() => handleDeleteItem(item.id)}>Remove</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Item Modal */}
      {selected && (
        <AddItemModal
          container={selected}
          open={showGive}
          onClose={() => setShowGive(false)}
          onSuccess={() => { setShowGive(false); selectContainer(selected) }}
        />
      )}
    </div>
    </div>
  )
}

function AddItemModal({ container, open, onClose, onSuccess }: {
  container: Container; open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const [templates, setTemplates] = useState<{id: string; name: string}[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const [qty, setQty] = useState(1)
  const [quality, setQuality] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.players.templates().then(setTemplates).catch(() => {}).finally(() => setLoading(false))
    setQuery(''); setSelected(''); setQty(1); setQuality(1)
  }, [open])

  const filtered = useMemo(() => {
    if (!query) return []
    const q = query.toLowerCase()
    return templates.filter(t => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)).slice(0, 100)
  }, [templates, query])

  const pick = (t: {id: string; name: string}) => {
    setSelected(t.id)
    setQuery(t.name ? `${t.id}  —  ${t.name}` : t.id)
  }

  const handleSubmit = async () => {
    if (!selected) { toast.warning('Select a template'); return }
    setSubmitting(true)
    try {
      await api.storage.giveItem(container.id, selected, qty, quality)
      toast.success(`Added ${qty}× ${selected} to container #${container.id}`)
      onSuccess()
    } catch (e: unknown) {
      toast.danger((e instanceof Error ? e.message : String(e)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={v => !v && onClose()}>
        <Modal.Container size="full">
          <Modal.Dialog style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Add Item — Container #{container.id}</Modal.Heading>
            </Modal.Header>
            <Modal.Body style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px 16px' }}>
              {loading ? (
                <div className="flex justify-center py-6"><Spinner size="lg" /></div>
              ) : (
                <div className="flex flex-col gap-3 h-full overflow-hidden">
                  {/* Buttons + qty/quality at top */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Button variant="tertiary" size="sm" onPress={onClose}>Cancel</Button>
                    <Button size="sm" onPress={handleSubmit} isDisabled={submitting || !selected}>
                      {submitting ? <Spinner size="sm" color="current" /> : null}
                      Add Item
                    </Button>
                    <div className="flex-1" />
                    <div className="flex gap-3">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Qty</label>
                        <input type="number" min={1} max={9999} value={qty}
                          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="rounded px-2 py-1 text-sm border w-20"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: '#3a3020', outline: 'none' }} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Quality (0–5)</label>
                        <input type="number" min={0} max={5} value={quality}
                          onChange={e => setQuality(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))}
                          className="rounded px-2 py-1 text-sm border w-20"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: '#3a3020', outline: 'none' }} />
                      </div>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="shrink-0">
                    {selected && (
                      <div className="text-xs mb-1 font-mono" style={{ color: 'var(--color-success)' }}>✓ {selected}</div>
                    )}
                    <input
                      className="rounded px-3 py-2 text-sm border w-full"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: selected ? 'var(--color-success)' : '#3a3020', outline: 'none' }}
                      placeholder="Search by template ID or item name..."
                      value={query}
                      onChange={e => { setQuery(e.target.value); setSelected('') }}
                      autoFocus
                    />
                  </div>

                  {/* Inline results list — fills remaining space */}
                  <div className="flex-1 overflow-y-auto rounded-lg min-h-0" style={{ border: '1px solid #2a2418', background: '#0a0806' }}>
                    {query.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-8 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                        Start typing to search {templates.length.toLocaleString()} templates
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-8 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                        No results for "{query}"
                      </div>
                    ) : (
                      filtered.map(t => (
                        <div
                          key={t.id}
                          className="flex items-baseline gap-3 px-3 py-2 cursor-pointer"
                          style={{ borderBottom: '1px solid #1a1610', background: selected === t.id ? '#241e12' : 'transparent' }}
                          onMouseEnter={e => { if (selected !== t.id) e.currentTarget.style.background = '#161208' }}
                          onMouseLeave={e => { if (selected !== t.id) e.currentTarget.style.background = 'transparent' }}
                          onClick={() => pick(t)}
                        >
                          <span className="font-mono text-xs shrink-0" style={{ color: selected === t.id ? 'var(--color-primary)' : 'var(--color-text)' }}>{t.id}</span>
                          {t.name && <span className="text-xs truncate" style={{ color: 'var(--color-text-dim)' }}>{t.name}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
