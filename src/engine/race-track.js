import * as THREE from 'three'
import { CIRCUIT_X, CIRCUIT_Z, CIRCUIT_LENGTH } from './race-model.js'
export function attachRaceTrack(engine) {
    const shape = new THREE.Shape();
    shape.absellipse(0,0,23,16,0,Math.PI*2,false,0);
    const hole = new THREE.Path();
    hole.absellipse(0,0,13,6,0,Math.PI*2,true,0); shape.holes.push(hole);
    const track = new THREE.Mesh(new THREE.ShapeGeometry(shape,80),new THREE.MeshStandardMaterial({color:0x56aa69,side:THREE.DoubleSide,roughness:1}));
    track.rotation.x=-Math.PI/2; track.position.y=.07; track.userData.fallbackLayer=-2;
    engine.raceEnvGroup.add(track);
    [-5,0,5].forEach(offset => {
        const points=Array.from({length:161},(_,i)=>new THREE.Vector3((CIRCUIT_X+offset)*Math.sin(i/160*Math.PI*2),.10,(CIRCUIT_Z+offset)*Math.cos(i/160*Math.PI*2)));
        const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points.flatMap((p,i)=>i ? [points[i-1],p] : [])),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:offset ? .9 : .4}));
        line.userData.fallbackLayer=-1;engine.raceEnvGroup.add(line);
    });
    for(let i=0;i<12;i++) for(let j=0;j<2;j++) {
        const tile=new THREE.Mesh(new THREE.BoxGeometry(.5,.025,10/12),new THREE.MeshBasicMaterial({color:(i+j)%2 ? 0x203d30 : 0xffffff}));
        tile.position.set(j*.5-.25,.12,6+(i+.5)*10/12);tile.userData.fallbackLayer=-1;engine.raceEnvGroup.add(tile);
    }
    function positionRaceParticipants() {
        const groups=[...new Set(engine.participantEntities.map(p=>p.groupId))];
        engine.participantEntities.forEach(p=>{
            const members=engine.participantEntities.filter(a=>a.groupId===p.groupId);
            const index=engine.participantEntities.indexOf(p), count=engine.participantEntities.length;
            p.laneOffset=count===1 ? 0 : -4.3+8.6*index/(count-1);
            p.meshParts.root.scale.setScalar(Math.min(1,9/count));
            p.pos.set(0,.13,CIRCUIT_Z+p.laneOffset);p.meshParts.root.position.copy(p.pos);p.meshParts.root.rotation.y=Math.PI/2;
        });
    }
    function resetRaceCamera() {
        const tan=Math.tan(THREE.MathUtils.degToRad(engine.camera.fov/2));
        const distance=Math.max(27/(tan*engine.camera.aspect),20/tan);
        engine.controls.maxDistance=Math.max(100,distance*1.3);engine.camera.far=distance+200;engine.camera.updateProjectionMatrix();
        engine.moveCameraSmoothly(new THREE.Vector3(0,distance,1),new THREE.Vector3(0,0,0));
    }
    let followedId=null;
    const previousPosition=new THREE.Vector3();
    const delta=new THREE.Vector3();
    function clearFollowCamera() { followedId=null; }
    function resetFollowCamera() {
        const person=engine.participantEntities.find(p=>p.id===engine.state.cameraTarget);
        if(!person) return;
        engine.cameraAnim.active=false;
        const heading=person.meshParts.root.rotation.y;
        const side=engine.state.cameraSide==='front' ? 1 : -1;
        engine.camera.position.set(person.pos.x+Math.sin(heading)*side*6,person.pos.y+3.8,person.pos.z+Math.cos(heading)*side*6);
        engine.controls.target.set(person.pos.x,person.pos.y+1.1,person.pos.z);
        engine.controls.update();
        previousPosition.copy(person.pos);followedId=person.id;
    }
    function updateFollowCamera() {
        if(engine.state.cameraMode!=='follow') {followedId=null;return;}
        const person=engine.participantEntities.find(p=>p.id===engine.state.cameraTarget);
        if(!person) return;
        if(followedId!==person.id) {resetFollowCamera();return;}
        engine.cameraAnim.active=false;
        // Translate both points equally: user orbit, pan and zoom remain intact.
        delta.subVectors(person.pos,previousPosition);
        engine.camera.position.add(delta);
        engine.controls.target.add(delta);
        previousPosition.copy(person.pos);
    }
    Object.assign(engine,{RACE_START_Z:CIRCUIT_Z,configureRaceLanes:()=>{},positionRaceParticipants,resetRaceCamera,updateFollowCamera,resetFollowCamera,clearFollowCamera,CIRCUIT_LENGTH});
}
