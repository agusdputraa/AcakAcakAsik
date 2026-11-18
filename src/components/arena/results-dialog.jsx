import { formatGroups } from '@/lib/group-format'
import { Copy, Flag, Trophy, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function ResultsDialog({ result, open, onClose }) {
  const topics = result?.kind === 'topics'
  const race = result?.kind === 'race'
  const title = race ? 'Hasil Urutan' : topics ? 'Hasil Pembagian Topik' : 'Hasil Pembagian Kelompok'
  const Icon = race ? Trophy : Users

  const canCopyMembers = race && result?.listType === 'group-members'

  async function copy(withMembers = false) {
    const lines = result.entries.map(item => {
      const people = item.members.join(', ')
      return race
        ? `${item.rank}. ${item.name}${withMembers && people ? ` · ${people}` : ''}`
        : `${item.name} · ${people}`
    })
    try {
      await navigator.clipboard.writeText((race || topics) ? [title, ...lines].join('\n') : formatGroups(result.entries))
      toast.success('Hasil berhasil disalin!')
    } catch {
      toast.error('Browser tidak mengizinkan menyalin hasil.')
    }
  }

  const content = <>
        <DialogHeader className="text-left">
          <div className={`result-symbol ${race ? 'race-symbol' : ''}`}><Icon /></div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{race ? 'Urutan presentasi individu atau kelompok.' : topics ? 'Kelompok atau individu dan topik yang diterima.' : `${result?.entries.length ?? 0} kelompok terbentuk.`}</p>
        </DialogHeader>
        <div className="overflow-y-auto pr-1">
          {race ? (
            <ol className="grid gap-2">
              {result?.entries.map(item => (
                <li key={item.rank} className={`result-card race-card ${item.rank === 1 ? 'first-place' : ''}`}>
                  <span className="result-rank">{item.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-bold">{item.name}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {result?.entries.map(item => (
                <section key={item.index} className="result-card group-card" style={{ '--group-color': item.color }}>
                  <h3 className="flex items-center gap-2 text-sm font-bold"><span className="group-color" />{item.name}</h3>
                  {topics && !item.members.length && <p className="mt-2 text-xs text-muted-foreground">Belum mendapat peserta</p>}
                  <ol className="mt-2 list-inside list-decimal break-words text-sm text-muted-foreground">
                    {item.members.map((name, index) => <li key={index}>{name}</li>)}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="sm:flex-wrap">
          <Button type="button" variant="outline" onClick={() => copy(false)}><Copy /> {canCopyMembers ? 'Salin tanpa anggota' : 'Salin Hasil'}</Button>
          {canCopyMembers && <Button type="button" variant="outline" onClick={() => copy(true)}><Copy /> Salin dengan anggota</Button>}
          <Button type="button" onClick={onClose}><Flag /> Kembali ke Arena</Button>
        </DialogFooter>
  </>
  return <Dialog open={open && !!result} onOpenChange={open=>{if(!open)onClose()}}><DialogContent aria-describedby={undefined} className="max-h-[86dvh] grid-rows-[auto_minmax(0,1fr)_auto] select-text overflow-hidden rounded-2xl sm:max-w-lg"><DialogTitle className="sr-only">{title}</DialogTitle>{content}</DialogContent></Dialog>
}
