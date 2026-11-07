import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { partBox } from './board.js'

// ① 拖动旋转、滚轮缩放：用 three.js 自带的 OrbitControls（"绕着目标转圈"的相机控制器）
export function addControls(stage) {
  const controls = new OrbitControls(stage.camera, stage.renderer.domElement)
  controls.enableDamping = true              // 松手后慢慢停下，手感更顺
  controls.enablePan = false                 // 第一版不做平移，省得把板子拖丢
  controls.minZoom = 0.7
  controls.maxZoom = 3
  controls.minPolarAngle = Math.PI * 0.1     // 不能转到正上方
  controls.maxPolarAngle = Math.PI * 0.42    // 也不能钻到桌子底下
  controls.target.set(0, 0.4, 0)
  stage.onFrame(() => controls.update())
  return controls
}

// 一个"圆角矩形边框"，选中零件时套在它脚下
function frameGeometry(w, d) {
  const r = 0.12
  const rect = (hw, hd) => {
    const s = new THREE.Shape()
    s.moveTo(-hw + r, -hd)
    s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r)
    s.lineTo(hw, hd - r);  s.quadraticCurveTo(hw, hd, hw - r, hd)
    s.lineTo(-hw + r, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - r)
    s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd)
    return s
  }
  const outer = rect(w / 2 + 0.14, d / 2 + 0.14)
  outer.holes.push(rect(w / 2 + 0.07, d / 2 + 0.07))
  return new THREE.ShapeGeometry(outer)
}

// ② 点击零件：从鼠标位置往场景里"射一根激光"（Raycaster），看先打到谁
export function enablePicking(stage, board, onPick) {
  const canvas = stage.renderer.domElement
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const frame = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, depthWrite: false })
  )
  frame.rotation.x = -Math.PI / 2
  frame.visible = false
  stage.scene.add(frame)

  // 鼠标下面是哪个零件？没有就返回 null
  function partAt(event) {
    const r = canvas.getBoundingClientRect()
    mouse.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(mouse, stage.camera)
    for (const hit of raycaster.intersectObject(board.group, true)) {
      let o = hit.object
      while (o && !o.name.startsWith('part:')) o = o.parent // 往上找，直到找到 part:xxx 这一层
      if (o) return o
    }
    return null
  }

  function select(id) {
    const g = id ? board.parts.get(id) : null
    if (!g) { frame.visible = false; return }
    const box = partBox(g)
    const size = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    frame.geometry.dispose()
    frame.geometry = frameGeometry(size.x, size.z)
    frame.position.set(c.x, 0.47, c.z)
    frame.visible = true
  }

  // 区分"点击"和"拖动"：按下到松开移动不超过 5 像素才算点击
  let down = null
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY } })
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    down = null
    if (moved > 5) return
    const p = partAt(e)
    select(p ? p.userData.id : null)
    onPick(p ? p.userData : null)
  })
  canvas.addEventListener('pointermove', (e) => {
    canvas.style.cursor = partAt(e) ? 'pointer' : 'grab'
  })

  // 选中框一闪一闪
  stage.onFrame((t) => {
    if (frame.visible) frame.material.opacity = 0.55 + 0.35 * Math.sin(t / 220)
  })

  return { select }
}
