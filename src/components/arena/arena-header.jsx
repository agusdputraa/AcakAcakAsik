import { Check, ChevronDown, Camera, Trophy, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { modes } from './modes'

export function ArenaHeader({ view, actions, onCamera, onResults, hasResults }) {
  const active = modes[view.mode]
  const ModeIcon = active.icon
  const AudioIcon = view.muted ? VolumeX : Volume2
  return (
    <header className="arena-header">
      <div className="arena-brand">
        <div className="brand-mark" aria-hidden="true"><i /><i /><i /></div>
        <h1>Acak Acak <span>Asik</span></h1>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={!actions || view.isBusy} className="mode-button">
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
  )
}
