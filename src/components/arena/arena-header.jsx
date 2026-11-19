import { Shuffle, Check, ChevronDown, Camera, Trophy, Volume2, VolumeX, RectangleHorizontal, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { modes } from './modes'

export function ArenaHeader({ locked, view, actions, onCamera, onResults, hasResults }) {
  const active = modes[view.mode]
  const ModeIcon = active.icon
  const AudioIcon = view.muted ? VolumeX : Volume2
  return (
    <><header className="arena-header">
      <a href="#home" className="arena-brand pointer-events-auto" aria-label="Kembali ke beranda">
        <span className="home-brand-icon" aria-hidden="true"><Shuffle size={23}/></span>
        <h1>Acak Acak <span>Asik.</span></h1>
      </a>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={!actions || view.isBusy || locked} className="mode-button">
            <ModeIcon aria-hidden="true" />
            <span>{active.label}</span>
            <ChevronDown className="opacity-50" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-60 min-w-46">
          {Object.entries(modes).map(([mode, { label, icon: Icon }]) => (
            <DropdownMenuItem key={mode} onSelect={() => actions.selectMode(mode)}>
              <Icon />{label}{mode === view.mode && <Check className="ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="quick-actions">
        <Button type="button" variant="outline" size="icon" aria-label="Mode kamera" title="Mode kamera" onClick={onCamera} disabled={!actions}>
          <Camera />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label={view.muted ? 'Aktifkan suara' : 'Matikan suara'} title={view.muted ? 'Aktifkan suara' : 'Matikan suara'} onClick={() => actions?.toggleAudio()} disabled={!actions}>
          <AudioIcon />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="Tampilkan hasil" title="Tampilkan hasil" onClick={onResults} disabled={!hasResults}><Trophy /></Button>
      </div>
    </header>
    {view.mode==='race' && <nav className="race-camera-shortcuts" aria-label="Sudut kamera Urutan">
      {[['track','Lintasan lari',RectangleHorizontal],['waiting','Area tunggu',Users]].map(([value,label,Icon])=>
        <Button key={value} variant={view.cameraMode==='track' && view.raceCameraView===value?'default':'outline'} size="icon" aria-label={label} aria-pressed={view.cameraMode==='track' && view.raceCameraView===value} title={label} disabled={!actions} onClick={()=>actions.setRaceOption('raceCameraView',value)}><Icon/></Button>
      )}
    </nav>}</>
  )
}
