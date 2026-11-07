import * as THREE from 'three'
import { t, isEn } from '../i18n/index.js'

// ============================================================
//  用"积木"拼一块 Apollo3 Blue 评估板（示意模型，不是真实布局）
//  单位：1 = 1 cm。x 向右，z 朝向你，y 向上。
// ============================================================

export const Y0 = 0.46 // PCB 上表面离桌面的高度（板子架在 4 根铜柱上）

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
  // —— 第 12 步加的外接配件（平时藏起来，课程需要才显示）——
  pot:     { title: '电位器模块', desc: '旋钮，把 0–2.0 V 的电压送进 ADC' },
  imu:     { title: '加速度计 LIS2DH12', desc: 'I2C 接口的三轴加速度计（示意）' },
  flash:   { title: 'SPI Flash W25Q32', desc: '4 MB 串行 Flash，走 SPI（示意）' },
  mic:     { title: 'PDM 麦克风模块', desc: '数字麦克风，只要 CLK 和 DATA 两根线' },
  phone:   { title: '手机', desc: '用 nRF Connect 这类 App 扫描、连接' },
  battery: { title: 'CR2032 纽扣电池', desc: '3 V，标称约 220 mAh' },
}

// 第 19 步：零件说明的英文版（英文模式下用这里的）
export const PARTS_EN = {
  soc:     { title: 'Apollo3 Blue SoC', desc: 'Cortex-M4F · 48/96 MHz · 1 MB flash · 384 KB SRAM · BLE 5' },
  antenna: { title: 'BLE antenna', desc: '2.4 GHz ceramic antenna, no copper underneath' },
  xtal:    { title: '32.768 kHz crystal', desc: 'Low-power clock that RTC and STIMER count on' },
  led0:    { title: 'LED0', desc: 'On-board LED, AM_BSP_GPIO_LED0' },
  led1:    { title: 'LED1', desc: 'On-board LED, AM_BSP_GPIO_LED1' },
  led2:    { title: 'LED2', desc: 'On-board LED, AM_BSP_GPIO_LED2' },
  btn0:    { title: 'Button BTN0', desc: 'Pressed = low; can wake the chip' },
  btn1:    { title: 'Button BTN1', desc: 'Second user button' },
  jlink:   { title: 'J-Link USB', desc: 'On-board debugger: flash, debug, serial' },
  jumper:  { title: 'Current jumper', desc: 'Remove the jumper, put an ammeter in series to measure the chip (illustrative)' },
  headers: { title: 'Expansion headers', desc: '2×20 headers bring GPIOs out to peripherals' },
  pot:     { title: 'Potentiometer module', desc: 'A knob that feeds 0–2.0 V into the ADC' },
  imu:     { title: 'Accelerometer LIS2DH12', desc: '3-axis accelerometer on I2C (illustrative)' },
  flash:   { title: 'SPI flash W25Q32', desc: '4 MB serial flash on SPI (illustrative)' },
  mic:     { title: 'PDM mic module', desc: 'Digital mic: just CLK and DATA' },
  phone:   { title: 'Phone', desc: 'Scan and connect with an app such as nRF Connect' },
  battery: { title: 'CR2032 coin cell', desc: '3 V, about 220 mAh nominal' },
}

// ---------- 小工具 ----------
export const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...extra })

export function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// 把文字画到一张"贴纸"上，平放在零件表面
export function sticker(lines, w, h, { color = '#e9e4d8', px = 0.42 } = {}) {
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
export function part(id, x, z) {
  const g = new THREE.Group()
  g.name = `part:${id}`
  g.userData = { id, ...PARTS[id], ...(isEn ? PARTS_EN[id] : {}) }
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
  const silk = sticker(['Apollo3 Blue EVB', t('board.silk')], 1.9, 0.62, { color: '#9fb0c4', px: 0.18 })
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
  const caps = {}
  ;['btn0', 'btn1'].forEach((id, i) => {
    const g = add(part(id, -2.55 + i * 0.85, 1.25))
    const base = box(0.5, 0.18, 0.5, mat(0xd8d2c4))
    base.position.y = 0.09
    g.add(base)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 24), mat(0x2f3547))
    cap.position.y = 0.24
    cap.castShadow = true
    g.add(cap)
    caps[id] = cap
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
  // on 可以是 true/false，也可以是 0~1 的亮度（第 6 课呼吸灯用）
  function setLed(id, on) {
    const led = leds[id]
    if (!led) return
    const k = typeof on === 'number' ? Math.max(0, Math.min(1, on)) : on ? 1 : 0
    led.m.emissiveIntensity = 2.2 * k
    led.glow.material.opacity = 0.9 * k
    led.light.intensity = 4 * k
  }

  // 按键被点时，圆帽往下按一下再弹回来
  function press(id) {
    const cap = caps[id]
    if (!cap) return
    cap.position.y = 0.19
    setTimeout(() => { cap.position.y = 0.24 }, 150)
  }

  board.traverse((o) => { if (o.isMesh) o.receiveShadow = true })
  return { group: board, parts, setLed, press }
}
