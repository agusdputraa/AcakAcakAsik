import * as THREE from 'three'
import { attachGroupField } from './group-field.js'
import { createParkScenery } from './park-scenery.js'

export const VILLAGES = Object.fromEntries(
    [['groups','Grup'],['topics','Topik'],['race','Urutan'],['choices','Pilihan'],['single','Single']].map(([id,label],index)=>{
        const angle=index*Math.PI*2/5;
        return [id,{x:Math.sin(angle)*110,z:Math.cos(angle)*110,angle:angle+Math.PI,label}];
    })
)

// Floating origin keeps existing animations in their local arena coordinates.
// All villages remain mounted; camera and scenery rebase by the same offset.
export function attachWorld(engine) {
    const groupsField = engine.fieldEnvGroup
    const groupBuilder = { rebuild:engine.rebuildGroupZones }
    const topicsField = new THREE.Group()
    const topicEngine = { ...engine, fieldEnvGroup:topicsField }
    attachGroupField(topicEngine)
    const originalGroupRebuild = groupBuilder.rebuild
    let groupData = engine.groupZoneData, groupLayout = engine.fieldLayout
    const choiceScreen = engine.choiceStageGroup
    choiceScreen.parent.remove(choiceScreen)
    const choicesStage = engine.stageEnvGroup.clone(true)
    choicesStage.traverse(object=>{if(object.userData.fallbackSign==='ORANG TERPILIH')object.visible=false})
    choicesStage.add(choiceScreen)
    choiceScreen.visible=true
    engine.stageBanner.visible=true
    engine.setChoiceStageVisible=()=>{}
    const villages = {
        single:engine.stageEnvGroup, groups:groupsField, topics:topicsField,
        race:engine.raceEnvGroup, choices:choicesStage,
    }
    const infrastructure = new THREE.Group()
    engine.scene.add(infrastructure)
    const roadMaterial = new THREE.MeshStandardMaterial({color:0x68766b,roughness:1})
    function box(parent,w,h,d,x,y,z,material) {
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material)
        mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh)
        return mesh
    }
    function sign(parent,text,x,z) {
        const material=new THREE.MeshStandardMaterial({map:engine.createSignTexture(text,'#24583f',46),roughness:1})
        const board=box(parent,12,3,.3,x,3.7,z,material)
        board.userData.fallbackSign=text;board.userData.fallbackColor='#24583f'
        for(const dx of [-4.5,4.5])box(parent,.2,3,.2,x+dx,1.5,z,roadMaterial)
    }
    // A central ring joins inward-facing entrances. Expansion is outward.
    const road=new THREE.Mesh(new THREE.RingGeometry(60,67,80),roadMaterial)
    road.rotation.x=-Math.PI/2;road.position.y=.03;infrastructure.add(road)
    infrastructure.add(createParkScenery({trees:[[-20,0],[20,0],[0,-20],[0,20]],benches:[[-10,0],[10,0]],beds:[[0,0]]}))
    for(const [id,group] of Object.entries(villages)) {
        group.visible=true;engine.scene.add(group)
        const points=[[-51,-92],[51,-92],[51,0],[20,43],[-20,43],[-51,0],[-51,-92]].map(([x,z])=>new THREE.Vector3(x,.06,z))
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x638568})))
        sign(group,'AREA '+VILLAGES[id].label.toUpperCase(),0,40)
        box(group,6,.08,14,0,.01,40,roadMaterial)
    }
    const waiting = {}
    for(const [id,field] of [['groups',groupsField],['topics',topicsField]]) {
        const group=new THREE.Group();field.add(group);waiting[id]=group
        box(group,29,.14,28,0,.06,7,new THREE.MeshStandardMaterial({color:0xdce5cf,roughness:1}))
        sign(group,'AREA TUNGGU',0,-5)
        group.add(createParkScenery({trees:[[-17,0],[17,0],[-17,17],[17,17]],benches:[[-13,6,Math.PI/2],[13,6,-Math.PI/2]],beds:[[-12,-4],[12,-4]]}))
    }
    const park=groupsField.children.find(child=>child.type==='Group' && child.children.some(c=>c.geometry?.type==='IcosahedronGeometry'))
    if(park)park.scale.set(1.3,1,1.3)
    const topicPark=createParkScenery({trees:[[-49,-35],[49,-35],[-49,-70],[49,-70]],benches:[[-49,-10],[49,-10]],beds:[]})
    topicsField.add(topicPark)

    function syncField() {
        const id=engine.state.mode==='topics'?'topics':'groups'
        engine.groupZoneData=id==='topics'?topicEngine.groupZoneData:groupData
        engine.fieldLayout=id==='topics'?topicEngine.fieldLayout:groupLayout
        waiting[id].position.z=engine.fieldLayout.waitingZ
        if(id==='groups' && park) { park.scale.set(engine.fieldLayout.width/34+.1,1,engine.fieldLayout.depth/24+.1); park.position.z=engine.fieldLayout.centerZ; }
    }
    engine.rebuildGroupZones=(count,names=[])=>{
        if(engine.state.mode==='topics') {
            topicEngine.participantEntities=engine.participantEntities
            topicEngine.rebuildGroupZones(count,names)
        } else {
            originalGroupRebuild(count,names)
            groupData=engine.groupZoneData;groupLayout=engine.fieldLayout
        }
        syncField()
    }
    topicEngine.rebuildGroupZones(Math.max(1,Math.min(30,engine.state.topicsText.split(/\r?\n/).filter(t=>t.trim()).length)),engine.state.topicsText.split(/\r?\n/).filter(t=>t.trim()))
    waiting.groups.position.z=groupLayout.waitingZ
    waiting.topics.position.z=topicEngine.fieldLayout.waitingZ
    let origin=new THREE.Vector3(), heading=0
    const axis=new THREE.Vector3(0,1,0)
    function activateWorld(mode) {
        const id=mode==='individual'?'single':mode
        const location=VILLAGES[id]
        const next=new THREE.Vector3(location.x,0,location.z)
        const rebase=p=>p.applyAxisAngle(axis,heading).add(origin).sub(next).applyAxisAngle(axis,-location.angle)
        rebase(engine.camera.position);rebase(engine.controls.target)
        for(const [key,group] of Object.entries(villages)) {
            group.visible=true
            group.position.set(VILLAGES[key].x,0,VILLAGES[key].z).sub(next).applyAxisAngle(axis,-location.angle)
            group.rotation.y=VILLAGES[key].angle-location.angle
        }
        infrastructure.position.copy(next).multiplyScalar(-1).applyAxisAngle(axis,-location.angle)
        infrastructure.rotation.y=-location.angle
        origin=next;heading=location.angle
        engine.activeHostGroup=id==='choices'?choicesStage:id==='race'?villages.race:engine.stageEnvGroup
        syncField()
        engine.camera.far=1500;engine.camera.updateProjectionMatrix()
        engine.controls.maxDistance=850
    }
    function focusField(includeWaiting=false) {
        const layout=engine.fieldLayout
        const targetZ=includeWaiting?(layout.centerZ+20)/2:layout.centerZ
        const span=Math.max(layout.width,layout.depth+(includeWaiting?35:0))
        const distance=span*(engine.camera.aspect<1?1.8:1.05)
        engine.moveCameraSmoothly(new THREE.Vector3(0,distance*.8,targetZ+distance),new THREE.Vector3(0,.5,targetZ))
    }
    function showWorld() {
        engine.state.cameraMode='track'
        engine.clearFollowCamera()
        engine.controls.maxDistance=850
        engine.moveCameraSmoothly(new THREE.Vector3(0,420,300).sub(origin).applyAxisAngle(axis,-heading),new THREE.Vector3().sub(origin).applyAxisAngle(axis,-heading))
        engine.publish()
    }
    Object.assign(engine,{activateWorld,focusField})
    engine.actions.showWorld=showWorld
}
