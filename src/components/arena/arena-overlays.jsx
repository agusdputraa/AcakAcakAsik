import { Activity, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ArenaOverlays({ view, onDismissWinner, actions }) {
  return (
    <>
      <div className="arena-status" role="status" data-busy={view.isBusy}>
        <Activity aria-hidden="true" />
        {view.status}
      </div>
      {view.fallback && <span className="fallback-badge" title="WebGL tidak tersedia di browser ini">Grafik sederhana</span>}
      {view.countdown !== null && (
        <div className="countdown-overlay" role="status" aria-label={`Aba-aba ${view.countdown}`}>
          <strong key={view.countdown}>{view.countdown}</strong>
        </div>
      )}
      {view.mode==='choices' && view.choicesWinner && (
        <section className="winner-banner celebration-banner" role="status" aria-label="Pilihan terpilih">
          <Trophy className="text-amber-500" aria-hidden="true"/>
          <div><p>Pilihan terpilih</p><strong className="break-words">{view.choicesWinner}</strong></div>
          <Button size="sm" disabled={view.liveLocked} onClick={()=>actions?.start()}>Acak lagi</Button>
          <Button variant="outline" size="sm" onClick={()=>actions?.dismissChoiceResult()}>Tutup</Button>
        </section>
      )}
      {view.winner && (
        <section className="winner-banner celebration-banner" aria-label="Orang terpilih">
          <Trophy className="text-amber-500" aria-hidden="true" />
          <div><p>Orang terpilih</p><strong>{view.winner.name}</strong></div>
          <Button size="sm" disabled={view.liveLocked || view.excludedIds?.includes(view.winner.id)} onClick={actions?.excludeWinner}>{view.excludedIds?.includes(view.winner.id) ? 'Sudah dikeluarkan' : 'Keluarkan dari daftar'}</Button><Button variant="outline" size="sm" disabled={view.liveLocked} onClick={actions?.resetExcluded}>Reset</Button><Button type="button" variant="outline" size="sm" onClick={onDismissWinner}>Tutup</Button>
        </section>
      )}
    </>
  )
}
