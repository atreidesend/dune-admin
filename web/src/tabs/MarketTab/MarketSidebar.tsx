import { useMemo } from 'react'
import { Button } from '@heroui/react'

type Props = {
  categories: string[]
  selected: string
  onSelect: (cat: string) => void
}

type Node = {
  label: string
  path: string
  children: Node[]
}

function buildTree(categories: string[]): Node[] {
  const root: Node[] = []

  for (const cat of categories.sort()) {
    const parts = cat.split('/')
    let current = root
    let path = ''
    for (const part of parts) {
      path = path ? `${path}/${part}` : part
      let node = current.find(n => n.label === part)
      if (!node) {
        node = { label: part, path, children: [] }
        current.push(node)
      }
      current = node.children
    }
  }

  return root
}

function formatLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function TreeNode({ node, selected, depth, onSelect }: {
  node: Node
  selected: string
  depth: number
  onSelect: (path: string) => void
}) {
  const isSelected = selected === node.path || selected.startsWith(node.path + '/')
  const isExact = selected === node.path

  return (
    <div>
      <button
        className={[
          'w-full text-left px-2 py-1 rounded text-sm transition-colors',
          depth === 0 ? 'font-semibold' : 'font-normal',
          isExact ? 'bg-accent/20 text-accent' : isSelected ? 'text-accent/70' : 'text-muted hover:text-foreground hover:bg-surface',
        ].join(' ')}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        onClick={() => onSelect(node.path)}
      >
        {formatLabel(node.label)}
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} selected={selected} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MarketSidebar({ categories, selected, onSelect }: Props) {
  const tree = useMemo(() => buildTree(categories), [categories])

  return (
    <div className="w-48 shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
      <Button
        size="sm"
        variant={selected === '' ? 'solid' : 'ghost'}
        className="w-full justify-start text-sm mb-1"
        onPress={() => onSelect('')}
      >
        All Items
      </Button>
      {tree.map(node => (
        <TreeNode key={node.path} node={node} selected={selected} depth={0} onSelect={onSelect} />
      ))}
    </div>
  )
}
