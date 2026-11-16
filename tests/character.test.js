import test from 'node:test'
import assert from 'node:assert/strict'
import { createCharacter, animateCharacter } from '../src/engine/characters/character.js'

test('character limbs have normalized weights and deform around elbow and knee joints', () => {
  const parts = createCharacter()
  const limbs = []
  parts.root.traverse(mesh => { if (mesh.isSkinnedMesh) limbs.push(mesh) })
  assert.equal(limbs.length, 4)
  for (const mesh of limbs) {
    const weights = mesh.geometry.attributes.skinWeight
    for (let i = 0; i < weights.count; i++) {
      assert.ok(Math.abs(weights.getX(i) + weights.getY(i) - 1) < 1e-6)
    }
    const positions = mesh.geometry.attributes.position
    const vertex = new (parts.root.position.constructor)().fromBufferAttribute(positions, 60)
    parts.root.updateMatrixWorld(true)
    mesh.skeleton.update()
    const rest = mesh.boneTransform(60, vertex.clone())
    mesh.skeleton.bones[1].rotation.x = .6
    parts.root.updateMatrixWorld(true)
    mesh.skeleton.update()
    const bent = mesh.boneTransform(60, vertex.clone())
    assert.ok(rest.distanceTo(bent) > .001)
  }
  animateCharacter(parts, Math.PI / 2, true, true)
  assert.ok(parts.rightKnee.rotation.x > 1)
  assert.equal(parts.leftKnee.rotation.x, 0)
})

test('torso contour normals face outward and geometry stays modest', () => {
  const parts = createCharacter()
  let vertices = 0
  parts.root.traverse(mesh => {
    if (mesh.geometry) vertices += mesh.geometry.attributes.position.count
  })
  const torso = parts.bodyPivot.children.find(child => child.isMesh)
  assert.ok(torso.geometry.attributes.normal.getX(24) > 0)
  assert.ok(vertices < 10000)
})
