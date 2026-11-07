import * as THREE from 'three'
import { Y0, mat, box, sticker, part } from './board.js'
import { t } from '../i18n/index.js'

// ============================================================
//  外接配件：电位器、加速度计、SPI Flash、PDM 麦克风、手机、纽扣电池
//  平时都藏起来，哪节课需要就显示哪个（课程文件里写 accessories: ['pot']）
//  另外还有两个特效：天线发出的"无线电波纹"、模块上的活动指示灯
// ============================================================

const SLOT = [3.6, 3.7]   // 模块放在板子右前方的桌面上
const PHONE = [5.2, 2.9]  // 手机立在板子右前方

export function addAccessories(board) {
  const extras = new Map() // id → 配件 Group
  const acts = {}          // id → 活动指示灯的材质
  const anims = []         // 每帧要跑的小动画

  // 新建一个配件：放在桌面上，先藏起来，登记进 board.parts（这样能点、能加标注）
  function add(id, x, z) {
    const g = part(id, x, z)
    g.position.y = 0
    g.visible = false
    board.parts.set(id, g)
    board.group.add(g)
    extras.set(id, g)
    return g
  }

  // 4 根杜邦线：从模块后沿弯到板子前沿（g 的局部坐标；终点落在板子上 x = 2.0~2.9 的位置）
  function wires(g) {
    const colors = [0xd94848, 0x26272b, 0xf0a53a, 0x22c55e]
    colors.forEach((c, i) => {
      const x = -0.45 + i * 0.3
      const endX = 2.0 + i * 0.3 - SLOT[0]
      const pts = [
        new THREE.Vector3(x, 0.06, -0.5),
        new THREE.Vector3((x + endX) / 2, 0.4, -1.0),
        new THREE.Vector3(endX, Y0 + 0.02, 2.0 - SLOT[1]),
      ]
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.03, 6),
        mat(c, { roughness: 0.6 })
      )
      tube.castShadow = true
      g.add(tube)
    })
  }

  // 模块底板：彩色小 PCB + 名字 + 一颗活动指示灯
  function moduleBase(g, id, color, label) {
    const pcb = box(1.5, 0.08, 1.1, mat(color, { roughness: 0.7 }))
    pcb.position.y = 0.04
    g.add(pcb)
    const text = sticker([label], 1.4, 0.26, { px: 0.15, color: '#f5f1e8' })
    text.position.set(0, 0.082, 0.38)
    g.add(text)
    const actMat = mat(0x7a1f1f, { emissive: new THREE.Color(0xff3b3b), emissiveIntensity: 0 })
    const act = box(0.12, 0.06, 0.08, actMat)
    act.position.set(0.58, 0.11, -0.38)
    g.add(act)
    acts[id] = actMat
  }

  // ---- 电位器模块：底板 + 旋钮（旋钮上有一条白色指针） ----
  const pot = add('pot', ...SLOT)
  moduleBase(pot, 'pot', 0x2563eb, 'POT 10k')
  wires(pot)
  const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 32), mat(0x9aa3ad, { metalness: 0.5 }))
  potBody.position.set(-0.1, 0.19, -0.05)
  potBody.castShadow = true
  pot.add(potBody)
  const knob = new THREE.Group()
  knob.position.set(-0.1, 0.3, -0.05)
  const knobCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.3, 32), mat(0x2f3547))
  knobCap.position.y = 0.15
  knobCap.castShadow = true
  const pointer = box(0.05, 0.02, 0.2, mat(0xffffff))
  pointer.position.set(0, 0.31, -0.11)
  knob.add(knobCap, pointer)
  pot.add(knob)

  // ---- 加速度计模块：整块板子能"倾斜"（像拿在手里转） ----
  const imu = add('imu', ...SLOT)
  wires(imu)
  const tilt = new THREE.Group()
  tilt.position.y = 0.3
  imu.add(tilt)
  moduleBase(tilt, 'imu', 0x7c3aed, 'LIS2DH12')
  const imuChip = box(0.32, 0.08, 0.32, mat(0x1d1f24))
  imuChip.position.set(0, 0.12, -0.1)
  tilt.add(imuChip)

  // ---- SPI Flash 模块：一颗 8 脚芯片 ----
  const flash = add('flash', ...SLOT)
  moduleBase(flash, 'flash', 0x166534, 'W25Q32')
  wires(flash)
  const soic = box(0.5, 0.12, 0.4, mat(0x1d1f24))
  soic.position.set(-0.05, 0.14, -0.08)
  flash.add(soic)
  for (let i = 0; i < 8; i++) {
    const leg = box(0.05, 0.04, 0.12, mat(0xc7ccd3, { metalness: 0.7 }))
    leg.position.set(-0.23 + (i % 4) * 0.12, 0.1, i < 4 ? -0.32 : 0.16)
    flash.add(leg)
  }

  // ---- PDM 麦克风模块：麦克风 + 一圈随音量变化的光环 ----
  const mic = add('mic', ...SLOT)
  moduleBase(mic, 'mic', 0x334155, 'PDM MIC')
  wires(mic)
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 32), mat(0xc7ccd3, { metalness: 0.7, roughness: 0.3 }))
  can.position.set(-0.1, 0.16, -0.08)
  can.castShadow = true
  mic.add(can)
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.17, 16), mat(0x111111))
  hole.position.copy(can.position)
  mic.add(hole)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0, depthWrite: false })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 48), ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.set(-0.1, 0.25, -0.08)
  mic.add(ring)

  // ---- 纽扣电池 CR2032 ----
  const bat = add('battery', ...SLOT)
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.32, 48), mat(0xd5d9de, { metalness: 0.8, roughness: 0.25 }))
  cell.position.y = 0.16
  cell.castShadow = true
  bat.add(cell)
  const batText = sticker(['CR2032', '3V'], 1.4, 0.8, { px: 0.28, color: '#1f2a37' })
  batText.position.y = 0.322
  bat.add(batText)

  // ---- 手机：立着，屏幕朝向镜头，屏幕内容用画布画 ----
  const phone = add('phone', ...PHONE)
  const stand = new THREE.Group()
  stand.rotation.y = Math.atan2(8, 10) // 转向相机（相机在 x=8, z=10 的方向）
  stand.rotation.x = -0.28             // 往后仰一点，像靠在支架上
  phone.add(stand)
  const body = box(2.0, 3.8, 0.18, mat(0x1f2a37, { roughness: 0.4 }))
  body.position.y = 1.95
  stand.add(body)
  const screenCanvas = document.createElement('canvas')
  screenCanvas.width = 360
  screenCanvas.height = 680
  const screenTex = new THREE.CanvasTexture(screenCanvas)
  screenTex.colorSpace = THREE.SRGBColorSpace
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.4), new THREE.MeshBasicMaterial({ map: screenTex }))
  screen.position.set(0, 1.95, 0.095)
  stand.add(screen)

  // 画手机屏幕：标题 + 几行字 + 一个大按钮（可选）
  function setPhone({ title = '', lines = [], button = '', on = false } = {}) {
    const c = screenCanvas.getContext('2d')
    const W = screenCanvas.width
    c.fillStyle = '#f8fafc'
    c.fillRect(0, 0, W, screenCanvas.height)
    c.fillStyle = '#0e9384'
    c.fillRect(0, 0, W, 96)
    c.fillStyle = '#ffffff'
    c.font = '600 34px system-ui, sans-serif'
    c.fillText(title, 24, 64)
    c.fillStyle = '#1f2a37'
    c.font = '30px system-ui, sans-serif'
    lines.forEach((t, i) => c.fillText(t, 24, 156 + i * 50))
    if (button) {
      c.fillStyle = on ? '#0e9384' : '#cbd5e1'
      c.beginPath()
      c.roundRect(40, 480, W - 80, 110, 24)
      c.fill()
      c.fillStyle = on ? '#ffffff' : '#1f2a37'
      c.font = '600 34px system-ui, sans-serif'
      c.textAlign = 'center'
      c.fillText(button, W / 2, 547)
      c.textAlign = 'left'
    }
    screenTex.needsUpdate = true
  }

  // ---- 天线的无线电波纹：两圈从天线向外扩散的环 ----
  const antenna = board.parts.get('antenna')
  const waves = [0, 1].map(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x0e9384, transparent: true, opacity: 0, depthWrite: false })
    )
    m.rotation.x = -Math.PI / 2
    m.position.set(antenna.position.x, Y0 + 0.2, antenna.position.z)
    board.group.add(m)
    return { m, t0: -1e9 }
  })
  let waveTurn = 0
  function wave() {
    waves[waveTurn % 2].t0 = performance.now()
    waveTurn++
  }
  anims.push((t) => {
    for (const w of waves) {
      const k = (t - w.t0) / 700 // 0 → 1 的进度
      w.m.material.opacity = k >= 0 && k < 1 ? 0.8 * (1 - k) : 0
      w.m.scale.setScalar(0.4 + 2.6 * Math.max(0, Math.min(1, k)))
    }
  })

  // ---- 对外的"遥控器"：挂到 board 上，剧本里用 ctx.board.xxx() 调用 ----
  Object.assign(board, {
    // 只显示这节课要的配件
    show(ids) {
      for (const [id, g] of extras) g.visible = ids.includes(id)
    },
    setKnob(v) { knob.rotation.y = (0.75 - 1.5 * v) * Math.PI }, // v: 0~1，转 270°
    setTilt(rad) { tilt.rotation.x = rad },                        // 加速度计前后倾斜
    setMic(level) {                                                // level: 0~1
      ringMat.opacity = 0.15 + 0.75 * level
      ring.scale.setScalar(1 + level * 0.8)
    },
    setPhone,
    wave,
    // 模块上的活动灯闪一下
    act(id) {
      const m = acts[id]
      if (!m) return
      m.emissiveIntensity = 2.5
      setTimeout(() => { m.emissiveIntensity = 0 }, 120)
    },
    // 每节课开始/停止时把特效都清掉
    reset() {
      tilt.rotation.x = 0
      ringMat.opacity = 0
      ring.scale.setScalar(1)
      for (const w of waves) w.t0 = -1e9
      setPhone({ title: t('phone.title'), lines: [t('phone.waiting')] })
    },
    update(t) { anims.forEach((fn) => fn(t)) },
  })

  board.setKnob(0.3)
  board.reset()
  return board
}
