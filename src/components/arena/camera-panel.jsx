import { useSyncExternalStore } from 'react'
import { Camera, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
const query=()=>window.matchMedia('(max-width: 767px)')
const subscribe=cb=>{const q=query();q.addEventListener('change',cb);return()=>q.removeEventListener('change',cb)}
export function CameraPanel({view,actions,open,setOpen}) {
  const mobile=useSyncExternalStore(subscribe,()=>query().matches)
  const set=(key,value)=>actions?.setRaceOption(key,value)
  const roster = view.cameraRoster || []
  const nextParticipant = () => {
    if (!roster.length) return
    const index = roster.findIndex(person => person.id === view.cameraTarget)
    set('cameraTarget', roster[(index + 1) % roster.length].id)
  }
  const groups=Object.groupBy(view.cameraRoster||[],p=>p.groupName||'Peserta')
  const content=<div className="grid gap-4"><div className="grid grid-cols-2 gap-2"><Button variant={view.cameraMode==='track'?'default':'outline'} onClick={()=>set('cameraMode','track')}>Bebas / Track</Button><Button variant={view.cameraMode==='follow'?'default':'outline'} onClick={()=>{if(!view.cameraTarget && view.cameraRoster?.[0])set('cameraTarget',view.cameraRoster[0].id);set('cameraMode','follow')}}>Ikuti peserta</Button></div>
    {view.cameraMode==='follow' && <><p className="text-xs text-muted-foreground">Pilih anggota untuk diikuti kamera.</p><Button onClick={nextParticipant} disabled={!actions || !roster.length}>Next peserta <ArrowRight aria-hidden="true" /></Button><div className="grid grid-cols-2 gap-2">{[['rear','Dari belakang'],['front','Dari depan']].map(([value,label])=><Button key={value} size="sm" variant={view.cameraSide===value?'default':'outline'} onClick={()=>set('cameraSide',value)}>{label}</Button>)}</div><div className="max-h-[55dvh] overflow-y-auto space-y-4">{Object.entries(groups).map(([name,people])=><section key={name}><h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">{name}</h3><div className="flex flex-wrap gap-2">{people.map(p=><Button key={p.id} size="sm" variant={view.cameraTarget===p.id?'default':'outline'} onClick={()=>set('cameraTarget',p.id)}>{p.name}</Button>)}</div></section>)}</div></>}
    <p className="text-xs text-muted-foreground">Geser untuk memutar, scroll atau cubit untuk zoom. Klik kanan dan geser untuk menggeser tampilan.</p>
    <Button variant="outline" disabled={!actions} onClick={()=>actions?.showWorld()}>Lihat seluruh map</Button>
    <Button variant="outline" disabled={!actions} onClick={()=>actions?.resetCamera()}>Reset tampilan kamera</Button>
  </div>
  if(mobile)return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Mode kamera</DialogTitle><DialogDescription>Atur sudut bebas atau ikuti anggota pilihan.</DialogDescription></DialogHeader>{content}</DialogContent></Dialog>
  return <aside className="camera-sidebar"><div className="flex items-center justify-between mb-4"><h2 className="flex items-center gap-2 font-bold"><Camera className="size-4"/>Mode kamera</h2></div>{content}</aside>
}
