import { CameraPanel } from '@/components/arena/camera-panel'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArenaHeader } from '@/components/arena/arena-header'
import { ArenaOverlays } from '@/components/arena/arena-overlays'
import { ControlPanel } from '@/components/arena/control-panel'
import { ResultsDialog } from '@/components/arena/results-dialog'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/app.css'

const initialView = {
  mode: 'groups', participants: [], status: 'Menyiapkan arena…',
  countdown: null, result: null, winner: null, muted: false, isBusy: false,
}

export default function App() {
  const canvas = useRef(null)
  const labels = useRef(null)
  const fireworks = useRef(null)
  const [view, setView] = useState(initialView)
  const [actions, setActions] = useState(null)
  const [cameraOpen,setCameraOpen]=useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let disposed = false
    let arena
    import('./engine').then(({ createArenaEngine }) => {
      if (disposed) return
      arena = createArenaEngine({
        surfaces: { canvas: canvas.current, labels: labels.current, fireworks: fireworks.current },
        onState: setView,
        onCollapse: () => setSettingsOpen(false),
        notify: (message, type) => {
          if (type === 'error') toast.error(message)
          else if (type === 'success') toast.success(message)
          else toast(message)
        },
      })
      setActions(arena)
    }).catch(error => {
      if (disposed) return
      console.error(error)
      setView(current => ({ ...current, status: 'Arena tidak dapat dimuat. Muat ulang halaman.' }))
    })
    return () => {
      disposed = true
      arena?.dispose()
    }
  }, [])

  return (
    <main className="arena-app">
      <div id="canvas-container" ref={canvas} aria-label="Arena permainan" />
      <div id="labels-container" ref={labels} aria-hidden="true" />
      <canvas id="fireworks-canvas" ref={fireworks} aria-hidden="true" />
      <ArenaHeader view={view} actions={actions} onCamera={()=>setCameraOpen(true)} />

      <ArenaOverlays actions={actions} view={view} onDismissWinner={() => actions?.hideWinnerCelebration()} />
      <div className="desktop-left-rail">
        <ControlPanel view={view} actions={actions} open={settingsOpen} setOpen={setSettingsOpen} />
        <CameraPanel view={view} actions={actions} open={cameraOpen} setOpen={setCameraOpen}/>
      </div>
      <footer className="developer-credit">© {new Date().getFullYear()} · Developed by Agus Dzuriana</footer>
      <ResultsDialog result={view.result} onClose={() => actions?.closeResults()} />
      <Toaster position="top-right" offset={{ top: 80, right: 24 }} mobileOffset={{ top: 120, left: 12, right: 12 }} richColors />
    </main>
  )
}
