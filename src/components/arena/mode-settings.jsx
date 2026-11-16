import { parseGroups, formatGroups } from '@/lib/group-format'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Camera, History, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

function GroupSettings({ view, actions }) {
  return (
    <section className="mode-settings grid gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 id="group-count-label" className="text-sm font-bold">Jumlah kelompok</h3>
        <output className="count-badge">{view.groupCount}</output>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="icon-sm" variant="outline" aria-label="Kurangi jumlah kelompok" disabled={view.isBusy || view.groupCount <= 2} onClick={() => actions.setGroupCount(view.groupCount - 1)}><Minus /></Button>
        <Slider aria-labelledby="group-count-label" aria-label="Jumlah kelompok" min={2} max={8} step={1} value={[view.groupCount]} disabled={view.isBusy}
          onValueChange={([count]) => actions.setGroupCount(count)} />
        <Button type="button" size="icon-sm" variant="outline" aria-label="Tambah jumlah kelompok" disabled={view.isBusy || view.groupCount >= 8} onClick={() => actions.setGroupCount(view.groupCount + 1)}><Plus /></Button>
      </div>
    </section>
  )
}

function RaceSettings({view,actions}) {
  const set=(key,value)=>actions.setRaceOption(key,value)
  const parsed=parseGroups(view.raceGroupsText)
  const edit=(index,key,value)=>{
    const groups=parsed.groups.map((g,i)=>i===index?{...g,[key]:value}:g)
    set('raceGroupsText',formatGroups(groups))
  }
  return <section className="mode-settings grid gap-3">
    <h3 className="text-sm font-bold">Daftar khusus Urutan</h3>
    <Select value={view.raceListType} disabled={view.isBusy} onValueChange={v=>set('raceListType',v)}>
      <SelectTrigger className="w-full" aria-label="Jenis daftar Urutan"><SelectValue/></SelectTrigger>
      <SelectContent><SelectItem value="only-groups">Hanya Kelompok</SelectItem><SelectItem value="group-members">Kelompok dan Anggota</SelectItem><SelectItem value="individual">Individu</SelectItem></SelectContent>
    </Select>
    {view.raceListType==='only-groups' && <label className="grid gap-2 text-sm">Jumlah kelompok (2–12)<input className="arena-input" type="number" min="2" max="12" disabled={view.isBusy} value={view.raceGroupCount} onChange={e=>set('raceGroupCount',e.target.value)}/><small>3 anggota per kelompok, dengan warna baju yang sama.</small></label>}
    {view.raceListType==='individual' && <label className="grid gap-2 text-sm">Nama peserta, satu per baris<Textarea value={view.raceNames} disabled={view.isBusy} onChange={e=>set('raceNames',e.target.value)} rows={6}/></label>}
    {view.raceListType==='group-members' && <>
      <Button variant="outline" size="sm" disabled={view.isBusy || !view.hasSavedGroups} onClick={actions.useSavedGroups}>Gunakan hasil Grup terakhir</Button>
      <Tabs defaultValue="raw"><TabsList className="w-full"><TabsTrigger value="raw">Tempel hasil Grup</TabsTrigger><TabsTrigger value="edit">Edit kelompok</TabsTrigger></TabsList>
        <TabsContent value="raw"><label className="grid gap-2 text-sm">Kelompok dan anggotanya<Textarea rows={7} disabled={view.isBusy} value={view.raceGroupsText} placeholder={'[Kelompok 1]\n- Ayu\n- Bima\n\n[Kelompok 2]\n- Citra\n- Deni'} onChange={e=>set('raceGroupsText',e.target.value)}/></label><p className="mt-2 text-xs text-muted-foreground">Tempel Salin Hasil dari Grup. Format: [Nama kelompok], lalu - nama anggota di setiap baris.</p></TabsContent>
        <TabsContent value="edit" className="grid gap-3">
          {parsed.groups.map((g,i)=><div className="grid gap-2 rounded-xl border p-3" key={`${i}-${g.name}-${g.members.join('|')}`}><input className="arena-input" aria-label={`Nama kelompok ${i+1}`} disabled={view.isBusy} defaultValue={g.name} onBlur={e=>edit(i,'name',e.target.value)}/><Textarea aria-label={`Anggota ${g.name}`} disabled={view.isBusy} defaultValue={g.members.join('\n')} onBlur={e=>edit(i,'members',e.target.value.split(/\r?\n/).map(n=>n.trim()).filter(Boolean))}/><Button variant="ghost" size="sm" disabled={view.isBusy} onClick={()=>set('raceGroupsText',formatGroups(parsed.groups.filter((_,j)=>j!==i)))}>Hapus kelompok</Button></div>)}
          <Button variant="outline" disabled={view.isBusy || !!parsed.error} onClick={()=>set('raceGroupsText',formatGroups([...parsed.groups,{name:`Kelompok ${parsed.groups.length+1}`,members:['Anggota 1']}]))}>Tambah kelompok</Button>
        </TabsContent>
      </Tabs>
      {parsed.error ? <p role="alert" className="text-xs text-destructive">{parsed.error}</p> : <p className="text-xs text-muted-foreground">{parsed.groups.length} kelompok · {parsed.groups.reduce((n,g)=>n+g.members.length,0)} anggota terdeteksi</p>}
    </>}
    <label className="grid gap-2 text-sm">Jumlah lap (1–10)<input className="arena-input" type="number" min="1" max="10" disabled={view.isBusy} value={view.laps} onChange={e=>set('laps',e.target.value)}/></label>
    <p className="text-xs text-muted-foreground">Kecepatan setiap anggota diacak ulang tiap balapan. Kelompok finis ketika anggota terakhir menyelesaikan semua lap. Kelompok dengan anggota lebih banyak secara alami lebih sulit finis lebih awal.</p>
    {view.hasRaceResults && <Button variant="outline" onClick={actions.showLastRaceResults}>Lihat hasil balap terakhir</Button>}
  </section>
}
export function ModeSettings({view,actions}) {
  return <>
    {view.mode==='groups' && <GroupSettings view={view} actions={actions}/>}
    {view.mode==='race' && <RaceSettings view={view} actions={actions}/>}
    {view.mode==='single' && <section className="mode-settings grid gap-2"><h3 className="text-sm font-bold">Jenis Pemilihan</h3><RadioGroup value={view.singleType} disabled={view.isBusy} onValueChange={v=>actions.setRaceOption('singleType',v)}>{[['spotlight','Sorot Lampu'],['mc','Dijemput MC']].map(([v,label])=><label key={v} className="radio-option"><RadioGroupItem value={v}/>{label}</label>)}</RadioGroup></section>}
    {view.mode!=='race' && view.excludedCount>0 && <Button variant="outline" disabled={view.isBusy} onClick={actions.resetExcluded}>Reset · kembalikan {view.excludedCount} orang</Button>}
  </>
}
