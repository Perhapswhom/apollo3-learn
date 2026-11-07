// 电流示波器：像汽车的"油耗表"，告诉你芯片此刻耗多少电、平均多少、一块电池能撑多久

// —— 数据来源：Apollo3 Blue datasheet 典型值（3.3 V）——
const LEVEL = {
  active: 6 * 48, // 运行 48 MHz：6 µA/MHz × 48 ≈ 288 µA
  turbo: 6 * 96,  // TurboSPOT 96 MHz：按同样 6 µA/MHz 线性估算 ≈ 576 µA
  sleep: 1,       // 深睡（BLE 关、RTC 开）：约 1 µA
  radio: 3000,    // BLE 射频收发：约 3 mA（TX 0 dBm / RX），不含 MCU
}
const WINDOW = 5000 // 示波器横轴：最近 5 秒

// 'active' 这样的名字换成 µA；直接给数字也行
const toUA = (s) => (typeof s === 'number' ? s : LEVEL[s])

export function createScope(stage) {
  const canvas = document.querySelector('#scope-canvas')
  const g = canvas.getContext('2d')
  const elNow = document.querySelector('#stat-now')
  const elAvg = document.querySelector('#stat-avg')
  const elLife = document.querySelector('#stat-life')
  const elLifeLabel = document.querySelector('#stat-life-label')

  let battery = { mAh: 220, name: 'CR2032' }
  let points = [] // 底线的变化点：{ t, uA }，uA 为 null 表示没在运行
  let pulses = [] // 叠在底线上的尖峰：{ t0, t1, uA }
  let base = null
  let acc = { charge: 0, covered: 0, last: null } // 运行以来的累计：电荷 µA·ms、时长 ms

  // set('sleep')：底线切到深睡
  // set('active', 1)：在底线上叠一个 1 ms 的尖峰（醒来干一下活）
  // set('radio', 3)：叠一个 3 ms 的 BLE 射频尖峰
  // set(null)：停止
  function set(state, ms) {
    const t = performance.now()
    if (state != null && ms) {
      pulses.push({ t0: t, t1: t + ms, uA: toUA(state) })
      return
    }
    if (base == null && state != null) acc = { charge: 0, covered: 0, last: t } // 从停止到运行：重新累计
    base = state
    points.push({ t, uA: state != null ? toUA(state) : null })
    if (state == null) pulses = []
  }

  // 换课时调用：设置电池（智能戒指只有几十 mAh），并清空上一课的读数
  function setBattery(mAh = 220, name = 'CR2032') {
    battery = { mAh, name }
    elLifeLabel.textContent = `${name} 续航`
    acc = { charge: 0, covered: 0, last: null }
  }

  // 某个时刻的电流 = 底线 + 正在发生的尖峰
  function valueAt(t) {
    let v = null
    for (const p of points) {
      if (p.t > t) break
      v = p.uA
    }
    if (v == null) return null
    for (const q of pulses) if (q.t0 <= t && t < q.t1) v += q.uA
    return v
  }

  // 把 [a, b] 这段时间切成"电流不变"的小段
  function segments(a, b) {
    const cuts = new Set([a, b])
    for (const p of points) if (p.t > a && p.t < b) cuts.add(p.t)
    for (const q of pulses) {
      if (q.t0 > a && q.t0 < b) cuts.add(q.t0)
      if (q.t1 > a && q.t1 < b) cuts.add(q.t1)
    }
    const ts = [...cuts].sort((x, y) => x - y)
    const out = []
    for (let i = 0; i < ts.length - 1; i++) out.push({ a: ts[i], b: ts[i + 1], uA: valueAt((ts[i] + ts[i + 1]) / 2) })
    return out
  }

  // 纵轴用"对数刻度"：1 µA 到 3 mA 差几千倍，普通刻度会把 1 µA 压成一条贴地的线
  const LOG_MIN = Math.log10(0.5)
  const LOG_MAX = Math.log10(10000)
  const yOf = (uA, h) => h - 4 - ((Math.log10(uA) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (h - 8)

  const fmtI = (uA) => (uA >= 1000 ? `${(uA / 1000).toFixed(1)} mA` : uA >= 100 ? `${uA.toFixed(0)} µA` : `${uA.toFixed(1)} µA`)
  function fmtLife(avgUA) {
    const hours = battery.mAh / (avgUA / 1000)
    if (hours < 48) return `${hours.toFixed(0)} 小时`
    if (hours < 24 * 365) return `${(hours / 24).toFixed(0)} 天`
    const years = hours / 24 / 365
    return years > 10 ? '> 10 年' : `${years.toFixed(1)} 年`
  }

  stage.onFrame(() => {
    const now = performance.now()
    const t0 = now - WINDOW

    // 1) 累计"运行以来"的电荷（比只看 5 秒更稳，稀疏的尖峰也算得准）
    if (base != null && acc.last != null) {
      for (const s of segments(acc.last, now)) {
        if (s.uA == null) continue
        acc.charge += s.uA * (s.b - s.a)
        acc.covered += s.b - s.a
      }
    }
    acc.last = now

    // 2) 扔掉 5 秒以前的点和尖峰
    while (points.length > 1 && points[1].t <= t0) points.shift()
    pulses = pulses.filter((q) => q.t1 > t0)

    // 3) 画布跟着显示尺寸走（高清屏要乘 devicePixelRatio，不然发糊）
    const dpr = Math.min(window.devicePixelRatio, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)

    // 4) 背景刻度线：1 µA / 10 µA / 100 µA / 1 mA / 10 mA
    g.font = '10px ui-monospace, monospace'
    g.textBaseline = 'middle'
    for (const uA of [1, 10, 100, 1000, 10000]) {
      const y = yOf(uA, h)
      g.strokeStyle = '#ece2d0'
      g.beginPath(); g.moveTo(34, y); g.lineTo(w, y); g.stroke()
      g.fillStyle = '#9a9184'
      g.fillText(uA >= 1000 ? `${uA / 1000} mA` : `${uA} µA`, 0, y)
    }

    // 5) 电流曲线：一段一段"台阶"，太窄的尖峰至少画 2 像素宽
    const xOf = (t) => 34 + ((t - t0) / WINDOW) * (w - 34)
    g.strokeStyle = '#0e9384'
    g.lineWidth = 2
    g.beginPath()
    let pen = false
    for (const s of segments(t0, now)) {
      if (s.uA == null) { pen = false; continue }
      const y = yOf(s.uA, h)
      const x1 = xOf(s.a)
      const x2 = Math.max(xOf(s.b), x1 + 2)
      if (pen) g.lineTo(x1, y)
      else g.moveTo(x1, y)
      g.lineTo(x2, y)
      pen = true
    }
    g.stroke()

    // 6) 三个读数
    const v = valueAt(now)
    elNow.textContent = v == null ? '—' : fmtI(v)
    if (acc.covered > 300) { // 停止后也保留最后的平均值，方便对比
      const avg = acc.charge / acc.covered
      elAvg.textContent = fmtI(avg)
      elLife.textContent = fmtLife(avg)
    } else {
      elAvg.textContent = '—'
      elLife.textContent = '—'
    }
  })

  return { set, setBattery }
}
