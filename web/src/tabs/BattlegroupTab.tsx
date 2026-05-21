import { useState, useEffect, useCallback } from 'react'
import { Button, Modal, Spinner, toast } from '@heroui/react'
import { api } from '../api/client'

type PodRow = { name: string; ready: string; status: string; restarts: string; age: string }

function parseKubectlOutput(raw: string): PodRow[] {
  const lines = raw.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  return lines.slice(1).map(line => {
    const parts = line.trim().split(/\s+/)
    return {
      name: parts[0] ?? '',
      ready: parts[1] ?? '',
      status: parts[2] ?? '',
      restarts: parts[3] ?? '',
      age: parts[4] ?? '',
    }
  })
}

const STATUS_COLOR: Record<string, string> = {
  Running: '#27ae60',
  Pending: '#f0a830',
  CrashLoopBackOff: '#c0392b',
  Error: '#c0392b',
  Terminating: '#c0392b',
  Completed: '#8a7a60',
}

const ACTIONS = [
  { label: 'Start',   cmd: 'start',   danger: false, msg: 'Start the battlegroup server?' },
  { label: 'Stop',    cmd: 'stop',    danger: true,  msg: 'Stop the server? All players will be disconnected.' },
  { label: 'Restart', cmd: 'restart', danger: false, msg: 'Restart the server? Players will be briefly disconnected.' },
  { label: 'Update',  cmd: 'update',  danger: false, msg: 'Run a server update? This takes the server offline briefly.' },
  { label: 'Backup',  cmd: 'backup',  danger: false, msg: 'Create a database backup?' },
  { label: 'Restore', cmd: 'restore', danger: true,  msg: 'Restore from backup? This overwrites current data.' },
]

type ActionDef = typeof ACTIONS[0]

export default function BattlegroupTab() {
  const [pods, setPods] = useState<PodRow[]>([])
  const [statusLoading, setStatusLoading] = useState(false)
  const [runningCmd, setRunningCmd] = useState<string | null>(null)
  const [cmdOutput, setCmdOutput] = useState<string | null>(null)
  const [cmdDone, setCmdDone] = useState(false)
  const [confirmCmd, setConfirmCmd] = useState<ActionDef | null>(null)

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await api.battlegroup.status()
      setPods(parseKubectlOutput(res.output))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.danger(`Status failed: ${msg}`)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const runCmd = async (action: ActionDef) => {
    setConfirmCmd(null)
    setRunningCmd(action.label)
    setCmdOutput(null)
    setCmdDone(false)
    try {
      const res = await api.battlegroup.exec(action.cmd)
      setCmdOutput(res.output || '(no output)')
      setCmdDone(true)
      toast.success(`${action.label} completed`)
      fetchStatus()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setCmdOutput(`Error: ${msg}`)
      setCmdDone(true)
      toast.danger(`${action.label} failed: ${msg}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '0' }}>
      {/* Pod Status — scrollable */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-primary)' }}>
            Pod Status
          </h2>
          <Button size="sm" variant="ghost" onPress={fetchStatus} isDisabled={statusLoading}>
            {statusLoading ? <Spinner size="sm" color="current" /> : '↻ Refresh'}
          </Button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {statusLoading && pods.length === 0 ? (
            <div className="flex items-center gap-2 py-4" style={{ color: 'var(--color-text-dim)' }}>
              <Spinner size="sm" color="current" />
              <span className="text-sm">Loading pod status...</span>
            </div>
          ) : pods.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>No pods found. Click Refresh to try again.</p>
          ) : (
            <div className="overflow-auto rounded-lg" style={{ border: '1px solid #2a2418' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1a1610', borderBottom: '1px solid #2a2418' }}>
                    {['Name', 'Ready', 'Status', 'Restarts', 'Age'].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pods.map((pod, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1a1610', background: i % 2 === 0 ? '#0d0b07' : '#111009' }}>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--color-text)' }}>{pod.name}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>{pod.ready}</td>
                      <td className="px-4 py-2 text-xs font-semibold" style={{ color: STATUS_COLOR[pod.status] ?? 'var(--color-text)' }}>{pod.status}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>{pod.restarts}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>{pod.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons — sticky footer */}
      <div
        className="shrink-0"
        style={{ borderTop: '1px solid #2a2418', paddingTop: '12px', marginTop: '12px' }}
      >
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>
          Server Control
        </h2>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map(action => (
            <Button
              key={action.cmd}
              variant={action.danger ? 'danger-soft' : 'outline'}
              onPress={() => setConfirmCmd(action)}
              isDisabled={runningCmd !== null}
              size="sm"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Confirm dialog */}
      <Modal>
        <Modal.Backdrop isOpen={confirmCmd !== null} onOpenChange={v => { if (!v) setConfirmCmd(null) }}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{confirmCmd?.label ?? ''} Server</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p style={{ color: 'var(--color-text)' }}>{confirmCmd?.msg ?? ''}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setConfirmCmd(null)}>Cancel</Button>
                <Button
                  variant={confirmCmd?.danger ? 'danger' : 'primary'}
                  onPress={() => confirmCmd && runCmd(confirmCmd)}
                >
                  Confirm {confirmCmd?.label ?? ''}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Running command modal — closes when done */}
      <Modal>
        <Modal.Backdrop
          isOpen={runningCmd !== null}
          onOpenChange={v => { if (!v && cmdDone) { setRunningCmd(null); setCmdOutput(null) } }}
        >
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{runningCmd ?? ''}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {!cmdDone ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <Spinner size="lg" />
                    <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                      Running {runningCmd?.toLowerCase() ?? ''}... this may take a moment.
                    </p>
                  </div>
                ) : (
                  <div
                    className="rounded-lg p-3 font-mono text-xs overflow-auto max-h-60"
                    style={{ background: '#0a0806', color: '#a8d8a8', border: '1px solid #2a2418' }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{cmdOutput}</pre>
                  </div>
                )}
              </Modal.Body>
              {cmdDone && (
                <Modal.Footer>
                  <Button onPress={() => { setRunningCmd(null); setCmdOutput(null) }}>
                    Close
                  </Button>
                </Modal.Footer>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
