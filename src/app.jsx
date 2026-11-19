import { ArenaSurfaces } from '@/components/arena/arena-surfaces'
import { SharePanel } from '@/live/share-panel'
import { modes } from '@/components/arena/modes'
import { CameraPanel } from '@/components/arena/camera-panel'
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { ArenaHeader } from '@/components/arena/arena-header'
import { ArenaOverlays } from '@/components/arena/arena-overlays'
import { ControlPanel } from '@/components/arena/control-panel'
import { ResultsDialog } from '@/components/arena/results-dialog'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/app.css'

const WatchPage = lazy(() => import('@/live/watch-page').then(m => ({ default: m.WatchPage })))
const HomePage = lazy(() => import('@/components/home/home-page').then(m => ({ default: m.HomePage })))

const initialView = {
  mode: 'groups', participants: [], status: 'Menyiapkan arena…',
  countdown: null, result: null, winner: null, muted: false, isBusy: false,
}

const subscribeRoute = callback => { window.addEventListener('hashchange',callback); return ()=>window.removeEventListener('hashchange',callback) }
const getRoute = () => window.location.hash
export default function App() {
  const route = useSyncExternalStore(subscribeRoute,getRoute)
  const watch = route.match(/^#watch\/([a-f0-9]{32})$/)
  if(watch) {
    return (
      <Suspense fallback={<div className="grid min-h-dvh place-content-center bg-background text-sm text-muted-foreground">Memuat tayangan…</div>}>
        <WatchPage key={watch[1]} id={watch[1]}/>
      </Suspense>
    )
  }
  const mode = route.startsWith('#arena/') ? route.slice(7) : null
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-content-center bg-background text-sm text-muted-foreground">Memuat arena…</div>}>
      {mode && modes[mode] ? <ArenaApp key={mode} initialMode={mode}/> : <HomePage/>}
    </Suspense>
  )
}

function ArenaApp({initialMode}) {
  const canvas = useRef(null)
  const labels = useRef(null)
  const fireworks = useRef(null)
  const [view, setView] = useState(initialView)
  const [liveLocked,setLiveLocked]=useState(false)
  const [actions, setActions] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  useEffect(() => {
    if (view.result) { setLastResult(view.result); setResultsOpen(true) }
  }, [view.result])
  const [cameraOpen,setCameraOpen]=useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let disposed = false
    let arena
    import('./engine').then(({ createArenaEngine }) => {
      if (disposed) return
      arena = createArenaEngine({
        initialMode,
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
      <ArenaSurfaces canvasRef={canvas} labelsRef={labels} fireworksRef={fireworks} label="Arena permainan" />
      <ArenaHeader locked={!!liveLocked} view={view} actions={actions} onCamera={()=>setCameraOpen(true)} onResults={()=>setResultsOpen(true)} hasResults={!!lastResult} />

      <ArenaOverlays actions={actions} view={{...view,liveLocked:!!liveLocked}} onDismissWinner={() => actions?.hideWinnerCelebration()} />
      <div className="desktop-left-rail">
        <SharePanel actions={actions} view={view} onLock={setLiveLocked}/>
        <ControlPanel locked={liveLocked} view={view} actions={actions} open={settingsOpen} setOpen={setSettingsOpen} />
      </div>
      <CameraPanel view={view} actions={actions} open={cameraOpen} setOpen={setCameraOpen}/>
      <footer className="developer-credit">© {new Date().getFullYear()} · Developed by Agus Dzuriana</footer>
      <ResultsDialog result={lastResult} open={resultsOpen} onClose={() => { setResultsOpen(false); actions?.closeResults() }} />
      <Toaster position="top-right" offset={{ top: 80, right: 24 }} mobileOffset={{ top: 120, left: 12, right: 12 }} richColors />
    </main>
  )
}
