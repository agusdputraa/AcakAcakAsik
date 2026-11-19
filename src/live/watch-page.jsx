import { useEffect,useRef,useState } from 'react'
import { api,socketURL } from './api'
import { Button } from '@/components/ui/button'
import { ResultsDialog } from '@/components/arena/results-dialog'
import { ArenaSurfaces } from '@/components/arena/arena-surfaces'
import '@/styles/app.css'

function ExpiredNotice() {
    return (
        <main className="grid min-h-dvh place-content-center gap-4 bg-background p-8 text-center">
            <h1 className="text-2xl font-bold">Maaf, rekaman sudah tidak tersedia</h1>
            <p>Link tontonan berlaku selama 7 hari. Rekaman yang kedaluwarsa dihapus otomatis.</p>
            <a href="#home" className="underline">Kembali ke beranda</a>
        </main>
    )
}

export function WatchPage({id}) {
    const canvas=useRef(null),labels=useRef(null),fireworks=useRef(null),actions=useRef(null)
    const frames=useRef([]),cursor=useRef(-1),clock=useRef(0),playing=useRef(true)
    const [room,setRoom]=useState(null),[error,setError]=useState(null),[connected,setConnected]=useState(false),[view,setView]=useState(null)
    const [time,setTime]=useState(0),[duration,setDuration]=useState(0),[paused,setPaused]=useState(false),[following,setFollowing]=useState(true),[resultOpen,setResultOpen]=useState(false)
    useEffect(()=>{
        let disposed=false,socket,timer,attempt=0,fetching=false,pending=false,initial=true,finalKnown=false,online=false
        async function sync() {
            if(fetching){pending=true;return}
            fetching=true
            try {
                let page
                do {
                    page=await api('/api/rooms/'+id+'/chunks?after='+cursor.current)
                    if(disposed)return
                    for(const chunk of page.chunks) {
                        if(chunk.seq<=cursor.current)continue
                        if(chunk.seq!==cursor.current+1)throw new Error('Rekaman belum lengkap. Coba muat ulang.')
                        frames.current.push(...chunk.frames);cursor.current=chunk.seq
                    }
                    setRoom(page.room)
                    finalKnown=page.room.status!=='live'
                }while(page.chunks.length===16)
                const last=frames.current.at(-1)?.t || 0
                setDuration(last)
                if(initial && frames.current.length){clock.current=page.room.status!=='live'?0:Math.max(0,last-1000);initial=false}
                setConnected(true);setError(null)
                if(finalKnown)socket?.close()
            }catch(e){if(!disposed){if(e.status===410 || e.status===404)setError({expired:true,message:e.message});else setConnected(false)}}
            finally{fetching=false;if(pending && !disposed){pending=false;void sync()}}
        }
        function connect() {
            if(disposed || finalKnown)return
            socket=new WebSocket(socketURL(id))
            socket.onopen=()=>{attempt=0;online=true;setConnected(true);void sync()}
            socket.onmessage=event=>{
                try {
                    const message=JSON.parse(event.data)
                    if(message.type!=='chunk' || fetching || message.chunk.seq!==cursor.current+1){void sync();return}
                    const chunk=message.chunk
                    frames.current.push(...chunk.frames);cursor.current=chunk.seq
                    setDuration(frames.current.at(-1).t)
                    setRoom(current=>current?{...current,status:message.status,lastSeq:chunk.seq}:current)
                    finalKnown=message.status!=='live'
                    if(finalKnown)socket.close()
                }catch{void sync()}
            }
            socket.onerror=()=>setConnected(false)
            socket.onclose=()=>{online=false;if(disposed || finalKnown)return;setConnected(false);void sync();timer=setTimeout(connect,Math.min(15000,1000*2**attempt++))}
        }
        void sync();connect()
        const poll=setInterval(()=>{if(!online && !finalKnown)void sync()},15000)
        return()=>{disposed=true;clearInterval(poll);clearTimeout(timer);socket?.close()}
    },[id])
    useEffect(()=>{
        if(!room)return
        const timeout=setTimeout(()=>setError({expired:true}),Math.max(0,room.expiresAt-Date.now()))
        return()=>clearTimeout(timeout)
    },[room?.expiresAt])
    useEffect(()=>{
        if(!room || actions.current || error?.expired)return
        let disposed=false,engine
        import('../engine').then(({createArenaEngine})=>{
            if(disposed)return
            engine=createArenaEngine({initialMode:room.config.mode,playbackConfig:room.config,
                surfaces:{canvas:canvas.current,labels:labels.current,fireworks:fireworks.current},onState:setView,onCollapse(){},notify(){}})
            actions.current=engine
        }).catch(()=>setError({message:'Rekaman belum dapat dimuat. Silakan muat ulang.'}))
        return()=>{disposed=true;engine?.dispose();actions.current=null}
    },[room?.id,error?.expired])
    useEffect(()=>{
        let last=performance.now(),shown=-1
        const tick=setInterval(()=>{
            const now=performance.now(),dt=now-last;last=now
            if(playing.current)clock.current=Math.min(clock.current+dt,frames.current.at(-1)?.t || 0)
            let index=frames.current.findLastIndex(f=>f.t<=clock.current)
            if(index<0 && frames.current.length)index=0
            if(actions.current && index>=0 && shown!==index){actions.current.applyFrame(frames.current[index]);shown=index}
            setTime(clock.current)
        },50)
        return()=>clearInterval(tick)
    },[])
    if(error?.expired) return <ExpiredNotice />
    return <main className="arena-app">
        <ArenaSurfaces canvasRef={canvas} labelsRef={labels} fireworksRef={fireworks} label="Arena tontonan" />
        <header className="fixed left-4 right-4 top-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-4 shadow">
            <div><strong>{room?.status==='interrupted'?'Rekaman parsial':room?.status==='complete'?'Replay':'Tontonan langsung'} · {room?.config.mode || 'Menghubungkan…'}</strong><p className="text-xs">{error?.message || (connected?'Hanya menonton · daftar dan hasil dikunci':'Koneksi terputus · mencoba menyambung kembali')}</p></div><a href="#home" className="text-sm underline">Beranda</a>
        </header>
        {!frames.current.length && <p className="fixed inset-x-4 top-32 z-30 text-center">{room?'Menunggu host memulai proses acak…':'Menghubungkan ke rekaman…'}</p>}
        <section className="fixed bottom-4 left-4 right-4 z-30 mx-auto grid max-w-3xl gap-3 rounded-2xl bg-white/95 p-4 shadow">
            <p role="status" className="text-sm">{view?.winner?.name || view?.choicesWinner || view?.status || 'Menunggu proses…'}</p>
            <input aria-label="Posisi replay" type="range" min="0" max={duration || 1} value={Math.min(time,duration)} onChange={e=>{clock.current=Number(e.target.value);setTime(clock.current)}}/>
            <div className="flex flex-wrap items-center gap-2">
                <Button onClick={()=>{playing.current=!playing.current;setPaused(!playing.current)}}>{paused?'Putar':'Jeda'}</Button>
                <Button variant="outline" onClick={()=>{clock.current=0;playing.current=true;setPaused(false)}}>Putar ulang</Button>
                <Button variant="outline" onClick={()=>{setFollowing(!following);actions.current?.setFollowBroadcast(!following)}}>{following?'Kamera bebas':'Ikuti kamera host'}</Button>
                {view?.result && <Button variant="outline" onClick={()=>setResultOpen(true)}>Lihat hasil</Button>}
                <span className="text-xs">{Math.floor(time/1000)} / {Math.floor(duration/1000)} detik</span>
            </div>
        </section>
        <ResultsDialog result={view?.result} open={resultOpen} onClose={()=>setResultOpen(false)}/>
    </main>
}
