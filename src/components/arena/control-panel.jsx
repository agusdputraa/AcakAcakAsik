import { useState, useSyncExternalStore } from 'react'
import { ChevronDown, ChevronUp, Settings2, X, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { ModeSettings } from './mode-settings'
import { modes } from './modes'
import { ParticipantPanel } from './participant-panel'

const mobileQuery = '(max-width: 767px)'
const isMobile = () => window.matchMedia(mobileQuery).matches
function subscribe(callback) {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

export function ControlPanel({ locked, view, actions, open, setOpen }) {
  const mobile = useSyncExternalStore(subscribe, isMobile)
  const [tab, setTab] = useState('text')
  const { action, icon: ModeIcon } = modes[view.mode]
  const isComplete = locked === 'complete'
  const isLive = Boolean(locked)
  const effectiveView = { ...view, isBusy: view.isBusy || isComplete, liveLocked: isLive }
  const settings = actions && (
    <div className="settings-content">
      <ModeSettings view={effectiveView} actions={actions} />
      {!['race','topics','choices'].includes(view.mode) && <ParticipantPanel view={effectiveView} actions={actions} tab={tab} onTabChange={setTab} />}
    </div>
  )

  function settingsButton(props) {
    return (
      <Button type="button" variant="outline" disabled={!actions} className="settings-toggle" {...props}>
        <Settings2 /><span>Pengaturan</span>
        {open ? <ChevronDown className="opacity-50" /> : <ChevronUp className="opacity-50" />}
      </Button>
    )
  }

  const startButton = view.isBusy ? (
    <Button type="button" className="start-button" onClick={()=>actions?.skip()} disabled={!actions}><SkipForward/>{view.mode==='race' && view.racePhase==='walking'?'Lewati perjalanan':'Skip ke hasil'}</Button>
  ) : (
    <Button type="button" onClick={() => actions?.start()} disabled={!actions || view.isBusy || locked==='complete'} className="start-button">
      <ModeIcon />{view.isBusy ? (view.mode==='choices'?'Sedang mengacak…':'Sedang berjalan…') : view.mode === 'race' ? (view.racePhase === 'ready' ? 'Mulai lari' : 'Pergi ke lapangan') : action}
    </Button>
  )

  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <div className="action-dock">
          <DrawerTrigger asChild>{settingsButton()}</DrawerTrigger>
          {startButton}
        </div>
        <DrawerContent className="rounded-t-3xl px-0 pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="flex-row items-center justify-between text-left">
            <div>
              <DrawerTitle>Pengaturan Arena</DrawerTitle>
              <DrawerDescription className="sr-only">Mode dan daftar peserta</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Tutup pengaturan"><X /></Button>
            </DrawerClose>
          </DrawerHeader>
          {settings}
          <div className="border-t px-4 py-3">{startButton}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <aside className="desktop-controls" aria-label="Kontrol arena">
      <section className="settings-surface" id="desktop-settings" aria-labelledby="desktop-settings-title">
        <div className="settings-heading"><h2 id="desktop-settings-title">Pengaturan Arena</h2></div>
        {settings}
        <div className="p-4 pt-0">{startButton}</div>
      </section>
    </aside>
  )
}
