import { Check, Shuffle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ParticipantPanel({ view, actions, tab, onTabChange }) {
  return (
    <section className="grid gap-3" aria-labelledby="participants-title">
      <div className="flex items-center justify-between">
        <h3 id="participants-title" className="text-sm font-bold">Daftar peserta</h3>
        <Badge variant="secondary">{view.participants.length} peserta</Badge>
      </div>
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">Data Kasar</TabsTrigger>
          <TabsTrigger value="table">Daftar Tabel</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="mt-2 grid gap-2.5">
          <Textarea id="participant-names" aria-label="Nama peserta" placeholder="Tulis satu nama per baris" value={view.rawText}
            onChange={event => actions.updateNames(event.target.value)} disabled={view.isBusy || view.liveLocked} rows={5} className="max-h-56 min-h-28 text-base sm:text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={view.isBusy || view.liveLocked} onClick={actions.applyNames}>
              <Check /> Terapkan ke Arena
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={view.isBusy || view.liveLocked} onClick={actions.shuffleNames}>
              <Shuffle /> Acak Urutan
            </Button>
          </div>
          {view.liveLocked && <p className="text-xs text-muted-foreground">Daftar nama utama dikunci selama siaran langsung. Anda tetap dapat mengeluarkan pemenang dari tombol panggung.</p>}
        </TabsContent>
        <TabsContent value="table" className="mt-2 max-h-52 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead className="w-12">No.</TableHead><TableHead>Nama</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {view.participants.map((person, index) => (
                <TableRow key={person.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="whitespace-normal break-all font-medium">{person.name}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus ${person.name}`} title={`Hapus ${person.name}`}
                      className="text-destructive" disabled={view.isBusy || view.liveLocked} onClick={() => actions.deleteParticipant(person.id)}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!view.participants.length && <TableRow><TableCell colSpan={3} className="py-5 text-center text-muted-foreground">Belum ada peserta</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </section>
  )
}
