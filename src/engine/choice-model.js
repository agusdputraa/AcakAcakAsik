import { randomUnit } from './random.js'

export function parseChoices(text='') {
    return text.split(/\r?\n/).map(label=>label.trim()).filter(Boolean)
}

export function makeChoicePlan(entries,random=randomUnit) {
    if(!entries.length)return null
    const winnerIndex=Math.floor(random()*entries.length)
    const minimumSteps=Math.max(24,entries.length*3)
    const steps=minimumSteps+(winnerIndex-minimumSteps%entries.length+entries.length)%entries.length
    return {entries:[...entries],winnerIndex,steps,duration:6.5}
}

export function choiceScrollPosition(plan,elapsed) {
    const progress=Math.min(1,Math.max(0,elapsed/plan.duration))
    return plan.steps*(1-Math.pow(1-progress,3))
}

export function attachChoices(engine) {
    let plan=null, elapsed=0
    function resetChoiceDisplay() {
        plan=null;elapsed=0
        engine.state.choicesWinner=null
        engine.drawChoiceScreen(parseChoices(engine.state.choicesText),0,'idle')
    }
    function startChoiceSimulation() {
        if(engine.state.isBusy)return
        const entries=parseChoices(engine.state.choicesText)
        if(!entries.length)return engine.showToast('Masukkan minimal satu pilihan, satu per baris.','error')
        engine.clearSimulationTimers()
        engine.hideWinnerCelebration()
        engine.resetCrowdAndStage()
        engine.state.choicesWinner=null
        plan=makeChoicePlan(entries);elapsed=0
        engine.sfx.init();engine.sfx.playPop(2)
        engine.state.cameraMode='track'
        engine.resetChoiceCamera()
        engine.setStatus('Layar sedang mengacak pilihan…',true)
        engine.drawChoiceScreen(plan.entries,0,'spinning')
    }
    function updateChoiceSimulation(dt) {
        if(!plan)return
        elapsed+=dt
        const finished=elapsed>=plan.duration
        engine.drawChoiceScreen(plan.entries,choiceScrollPosition(plan,elapsed),finished?'finished':'spinning')
        if(!finished)return
        const winner=plan.entries[plan.winnerIndex]
        plan=null
        engine.state.choicesWinner=winner
        engine.participantEntities.forEach(person=>{person.celebrating=true})
        if(engine.mcEntity)engine.mcEntity.celebrating=true
        engine.sfx.playFanfare();engine.launchFireworkShow()
        engine.setStatus('Pilihan terpilih: '+winner,false)
    }
    Object.assign(engine,{resetChoiceDisplay,startChoiceSimulation,updateChoiceSimulation})
}
