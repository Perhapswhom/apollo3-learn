import * as THREE from 'three'

// ============================================================
//  用"积木"拼一块 Apollo3 Blue 评估板（示意模型，不是真实布局）
//  单位：1 = 1 cm。x 向右，z 朝向你，y 向上。
// ============================================================

const Y0 = 0.46 // PCB 上表面离桌面的高度（板子架在 4 根铜柱上）

// 每个零件的名字和说明：点击零件、标注气泡都读这里
export const PARTS = {
  soc:     { title: 'Apollo3 Blue SoC', desc: 'Cortex-M4F · 48/96 MHz · 1 MB Flash · 384 KB SRAM · BLE 5' },
  antenna: { title: 'BLE 天线', desc: '2.4 GHz 陶瓷天线，下面不铺铜' },
  xtal:    { title: '32.768 kHz 晶振', desc: '低功耗时钟，RTC 和 STIMER 靠它计时' },
  led0:    { title: 'LED0', desc: '板载 LED，AM_BSP_GPIO_LED0' },
  led1:    { title: 'LED1', desc: '板载 LED，AM_BSP_GPIO_LED1' },
  led2:    { title: 'LED2', desc: '板载 LED，AM_BSP_GPIO_LED2' },
  btn0:    { title: '按键 BTN0', desc: '按下 = 低电平，可唤醒芯片' },
  btn1:    { title: '按键 BTN1', desc: '第二个用户按键' },
  jlink:   { title: 'J-Link USB', desc: '板载调试器：烧录、调试、串口' },
  jumper:  { title: '电流测量跳线', desc: '拔掉跳线帽、串电流表，实测芯片电流（示意）' },
  headers: { title: '扩展排针', desc: '2×20 双排针，引出 GPIO 接外设' },
}

// ---------- 小工具 ----------
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...extra })

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// 把文字画到一张"贴纸"上，平放在零件表面
function sticker(lines, w, h, { color = '#e9e4d8', px = 0.42 } = {}) {
  const S = 256 // 每个单位画多少像素，越大越清晰
  const canvas = document.createElement('canvas')
  canvas.width = w * S
  canvas.height = h * S
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${px * S}px system-ui, sans-serif`
  lines.forEach((t, i) => {
    const y = canvas.height / 2 + (i - (lines.length - 1) / 2) * px * S * 1.25
    ctx.fillText(t, canvas.width / 2, y)
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  )
  m.rotation.x = -Math.PI / 2 // 躺平
  return m
}

// 零件的"包围盒"（能装下它的最小盒子）：只算实体，不算 LED 光晕
export function partBox(g) {
  g.updateWorldMatrix(true, true) // 先把位置信息算到最新，否则第一帧前算出来是错的
  const box = new THREE.Box3()
  g.traverse((o) => { if (o.isMesh) box.expandByObject(o) })
  return box
}

// 一个"零件" = 一个 Group，名字统一叫 part:xxx，点击时靠它认出是谁
function part(id, x, z) {
  const g = new THREE.Group()
  g.name = `part:${id}`
  g.userData = { id, ...PARTS[id] }
  g.position.set(x, Y0, z)
  return g
}

// LED 发光用的光晕贴图（中间亮、四周透明的圆）
function haloTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// ============================================================
export function createBoard() {
  const board = new THREE.Group()
  const parts = new Map()
  const add = (g) => { parts.set(g.userData.id, g); board.add(g); return g }

  // ---- PCB 本体 + 4 根铜柱 ----
  const pcb = box(7, 0.16, 4.4, mat(0x1f2a37, { roughness: 0.7 }))
  pcb.position.y = Y0 - 0.08
  board.add(pcb)
  for (const [x, z] of [[-3.2, -1.9], [3.2, -1.9], [-3.2, 1.9], [3.2, 1.9]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, Y0 - 0.16, 16), mat(0xc9a35b, { metalness: 0.6, roughness: 0.35 }))
    post.position.set(x, (Y0 - 0.16) / 2, z)
    post.castShadow = true
    board.add(post)
  }
  const silk = sticker(['Apollo3 Blue EVB', '示意模型'], 1.9, 0.62, { color: '#9fb0c4', px: 0.18 })
  silk.position.set(0.45, Y0 + 0.002, 1.3)
  board.add(silk)

  // ---- SoC 芯片 ----
  const soc = add(part('soc', 0.2, -0.3))
  const chip = box(1.1, 0.14, 1.1, mat(0x2a2e35, { roughness: 0.4 }))
  chip.position.y = 0.07
  soc.add(chip)
  const chipText = sticker(['AMBIQ', 'Apollo3 Blue'], 1.0, 0.7, { px: 0.17 })
  chipText.position.y = 0.142
  soc.add(chipText)

  // ---- 天线：陶瓷块 + 下面一块"净空区" ----
  const ant = add(part('antenna', 3.0, -1.55))
  const keepout = box(0.9, 0.01, 0.9, mat(0x2d3d50))
  keepout.position.y = 0.005
  ant.add(keepout)
  const ceramic = box(0.75, 0.12, 0.3, mat(0xf3efe6))
  ceramic.position.y = 0.07
  ant.add(ceramic)

  // ---- 32.768 kHz 晶振 ----
  const xtal = add(part('xtal', -1.0, -0.6))
  const can = box(0.38, 0.1, 0.18, mat(0xc7ccd3, { metalness: 0.7, roughness: 0.3 }))
  can.position.y = 0.05
  xtal.add(can)

  // ---- 3 颗 LED：外壳 + 光晕 + 一盏小灯（亮时照亮板子） ----
  const halo = haloTexture()
  const ledColors = { led0: 0xffb020, led1: 0x22c55e, led2: 0xef4444 }
  const leds = {}
  ;['led0', 'led1', 'led2'].forEach((id, i) => {
    const g = add(part(id, 1.5 + i * 0.6, 1.25))
    const color = new THREE.Color(ledColors[id])
    const m = mat(color.clone().multiplyScalar(0.55), { emissive: color, emissiveIntensity: 0 })
    const body = box(0.22, 0.12, 0.14, m)
    body.position.y = 0.06
    g.add(body)
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color, transparent: true, depthWrite: false, opacity: 0 }))
    glow.scale.set(0.9, 0.9, 0.9)
    glow.position.y = 0.16
    g.add(glow)
    const light = new THREE.PointLight(color, 0, 2.5, 2)
    light.position.y = 0.3
    g.add(light)
    leds[id] = { m, glow, light }
  })

  // ---- 2 个按键：底座 + 圆帽 ----
  ;['btn0', 'btn1'].forEach((id, i) => {
    const g = add(part(id, -2.55 + i * 0.85, 1.25))
    const base = box(0.5, 0.18, 0.5, mat(0xd8d2c4))
    base.position.y = 0.09
    g.add(base)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 24), mat(0x2f3547))
    cap.position.y = 0.24
    cap.castShadow = true
    g.add(cap)
  })

  // ---- J-Link USB 口（板子左边缘） ----
  const usb = add(part('jlink', -3.2, -0.9))
  const shell = box(0.75, 0.32, 0.85, mat(0xc7ccd3, { metalness: 0.75, roughness: 0.3 }))
  shell.position.y = 0.16
  usb.add(shell)
  const usbText = sticker(['J-Link'], 0.9, 0.3, { px: 0.18, color: '#9fb0c4' })
  usbText.position.set(0.85, 0.002, 0)
  usb.add(usbText)

  // ---- 电流测量跳线：两根针 + 红色跳线帽 ----
  const jp = add(part('jumper', -0.9, 0.85))
  const jpBase = box(0.5, 0.1, 0.26, mat(0x26272b))
  jpBase.position.y = 0.05
  jp.add(jpBase)
  const capJ = box(0.46, 0.22, 0.24, mat(0xd94848))
  capJ.position.y = 0.21
  jp.add(capJ)

  // ---- 扩展排针：板子后沿一条 2×20 双排针（用 InstancedMesh，一次画 40 根针更省资源） ----
  const hdr = add(part('headers', 0, -1.85))
  const pinGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06)
  const pins = new THREE.InstancedMesh(pinGeo, mat(0xd4a94a, { metalness: 0.8, roughness: 0.3 }), 40)
  const tmp = new THREE.Object3D()
  for (let i = 0; i < 40; i++) {
    tmp.position.set(-2.375 + (i % 20) * 0.25, 0.3, i < 20 ? -0.125 : 0.125)
    tmp.updateMatrix()
    pins.setMatrixAt(i, tmp.matrix)
  }
  pins.castShadow = true
  hdr.add(pins)
  const plastic = box(5.0, 0.2, 0.5, mat(0x26272b))
  plastic.position.y = 0.1
  hdr.add(plastic)

  // ---- 对外提供的"遥控器" ----
  function setLed(id, on) {
    const led = leds[id]
    if (!led) return
    led.m.emissiveIntensity = on ? 2.2 : 0
    led.glow.material.opacity = on ? 0.9 : 0
    led.light.intensity = on ? 4 : 0
  }

  board.traverse((o) => { if (o.isMesh) o.receiveShadow = true })
  return { group: board, parts, setLed }
}
