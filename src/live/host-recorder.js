import { api } from './api'
import { MAX_BYTES, MAX_DURATION } from '../../server/protocol.js'
// Capture actual poses, not new randomness. One serialized, retryable upload stream.
export function createHostRecorder(actions,room,onChange) {
    let queue=[],seq=0,timer=null,started=0,finished=false,stopped=false,busy=false,bytes=0,sawBusy=false
    let finalPending=false,disposed=false,pending=null,retryAt=0
    const notify=state=>onChange({...state,url:location.origin+location.pathname+'#watch/'+room.id})
    async function flush() {
        if(busy || !queue.length || disposed || performance.now()<retryAt)return
        busy=true
        if(!pending) {
            const batch=queue.slice(0,4),done=finalPending && queue.length<=4
            pending={seq,frames:batch,done,interrupted:done && stopped}
        }
        const payload=pending,done=payload.done,batch=payload.frames
        try {
            await api('/api/rooms/'+room.id+'/chunks',{method:'POST',headers:{Authorization:'Bearer '+room.token},body:JSON.stringify(payload)})
            queue.splice(0,batch.length);seq++;pending=null
            if(!done && finalPending && !queue.length)queue.push(actions.captureFrame(Math.min(MAX_DURATION,performance.now()-started)))
            if(done){finished=true;notify({status:stopped?'interrupted':'complete'})}
            else if(!stopped)notify({status:'live'})
        } catch(error) {
            retryAt=performance.now()+1500
            notify({status:'retrying',error:error.message})
            if([400,403,409,410,413].includes(error.status)){clearInterval(timer);stopped=true;notify({status:'error',error:error.message})}
        } finally {busy=false}
    }
    function sample() {
        if(disposed || finished)return
        if(!finalPending && !stopped) {
            const t=Math.min(MAX_DURATION,performance.now()-started)
            const frame=actions.captureFrame(t)
            sawBusy ||= frame.busy
            const final=sawBusy && !frame.busy && frame.racePhase!=='ready' && (frame.result || frame.winner || frame.choicesWinner)
            const size=new TextEncoder().encode(JSON.stringify(frame)).length
            if(bytes+size>MAX_BYTES-16000 || t>=MAX_DURATION) {
                stopped=true;finalPending=true
                // Preserve the last real frame; never invent a final outcome.
                if(!queue.length)queue.push(frame)
                notify({status:'interrupted',error:'Batas rekaman 1 MB tercapai. Rekaman tetap dapat ditonton.'})
            } else {
                bytes+=size;queue.push(frame)
                if(final)finalPending=true
            }
        }
        if(queue.length>=4 || finalPending)void flush()
    }
    return {
        start() {
            if(timer)return;
            started=performance.now();
            notify({status:'live'});
            sample();
            const count=actions.captureFrame(0)?.people?.length || 0;
            const sampleRate=count>60?350:(count>25?300:250);
            timer=setInterval(sample,sampleRate);
        },
        dispose() {disposed=true;clearInterval(timer)},
        get finished(){return finished},
    }
}
