import { createParkScenery } from './park-scenery.js'

// Reuse the raffle stage and character factory; scenery has no participant IDs
// and never enters the race roster or affects its outcome.
export function attachRaceScenery(engine) {
    const scenery = engine.raceEnvGroup
    const waitingStage = engine.stageEnvGroup.clone(true)
    waitingStage.visible = true
    waitingStage.position.set(-10,0,27)
    waitingStage.traverse(object=>{
        if(object.userData.fallbackSign==='ORANG TERPILIH') {
            object.material=object.material.clone()
            object.material.map=engine.createSignTexture('AREA TUNGGU','#24583f',48)
            object.userData.fallbackSign='AREA TUNGGU'
            object.userData.fallbackColor='#24583f'
        }
    })
    scenery.add(waitingStage)

    scenery.add(createParkScenery({
        trees:[[-31,-17],[-20,-22],[-8,-23],[7,-23],[22,-21],[31,-16],
            [-34,-3],[34,-3],[-34,10],[34,10],[-28,23],[16,24],[25,24],[-27,36],[6,36]],
        benches:[...[-9,0,9].flatMap(z=>[[-29,z,Math.PI/2],[29,z,-Math.PI/2]]),[-5,-1],[5,-1]],
        beds:[[-7,-4],[7,-4]]
    }))
    for(let i=0;i<12;i++) {
        const side=i<6?-1:1
        const person=engine.createCharacterMesh({
            shirtColor:engine.OUTFIT_COLORS[i%engine.OUTFIT_COLORS.length],
            skinColor:engine.SKIN_TONES[i%engine.SKIN_TONES.length],styleSeed:i,scale:.95
        })
        person.root.position.set(side*26,.12,-12+(i%6)*4.5)
        person.root.rotation.y=-side*Math.PI/2
        if(i%3===0) {
            person.leftArm.rotation.z=-1.8
            person.leftElbow.rotation.x=-.6
        }
        scenery.add(person.root)
    }
}
