// 电流示波器：像汽车的"油耗表"，告诉你芯片此刻耗多少电、平均多少、一颗纽扣电池能撑多久

// —— 数据来源：Apollo3 Blue datasheet 典型值（3.3 V）——
const MHZ = 48
const LEVEL = {
  active: 6 * MHZ, // 运行：6 µA/MHz × 48 MHz ≈ 288 µA
  sleep: 1,        // 深睡（BLE 关、RTC 开）：约 1 µA
}
const BATTERY_MAH = 220 // CR2032 纽扣电池，常见标称 220 mAh 左右
const WINDOW = 5000     // 示波器横轴：最近 5 秒

export function createScope(stage) {
  const canvas = document.querySelector('#scope-canvas')
  const g = canvas.getContext('2d')
  const elNow = document.querySelector('#stat-now')
  const elAvg = document.querySelector('#stat-avg')
  const elLife = document.querySelector('#stat-life')

  // 记录"状态变化点"：{ t: 时间, uA: 电流 }，uA 为 null 表示没在运行
  let points = []
  let base = null

  // set('active') / set('sleep')：切换状态
  // set('active', 1)：醒来 1 毫秒再回到原来的状态（一个"尖峰"）
  // set(null)：停止
  function set(state, ms) {
    const t = performance.now()
    if (state && ms) {
      points.push({ t, uA: LEVEL[state] })
      points.push({ t: t + ms, uA: base ? LEVEL[base] : null })
    } else {
      base = state
      points.push({ t, uA: state ? LEVEL[state] : null })
    }
  }

  // 某个时刻的电流
  function valueAt(t) {
    let v = null
    for (const p of points) {
      if (p.t > t) break
      v = p.uA
    }
    return v
  }

  // 纵轴用"对数刻度"：1 µA 和 288 µA 差几百倍，普通刻度会把 1 µA 压成一条贴地的线
  const LOG_MIN = Math.log10(0.5)
  const LOG_MAX = Math.log10(1000)
  const yOf = (uA, h) => h - 4 - ((Math.log10(uA) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (h - 8)

  const fmtI = (uA) => (uA >= 100 ? `${uA.toFixed(0)} µA` : `${uA.toFixed(1)} µA`)
  function fmtLife(avgUA) {
    const hours = BATTERY_MAH / (avgUA / 1000)
    if (hours < 48) return `${hours.toFixed(0)} 小时`
    if (hours < 24 * 365) return `${(hours / 24).toFixed(0)} 天`
    const years = hours / 24 / 365
    return years > 10 ? '> 10 年' : `${years.toFixed(1)} 年`
  }

  stage.onFrame(() => {
    const now = performance.now()
    const t0 = now - WINDOW

    // 1) 扔掉 5 秒以前的点（保留窗口开头之前的最后一个，它决定开头的高度）
    while (points.length > 1 && points[1].t <= t0) points.shift()

    // 2) 画布跟着显示尺寸走（高清屏要乘 devicePixelRatio，不然发糊）
    const dpr = Math.min(window.devicePixelRatio, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)

    // 3) 背景刻度线：1 / 10 / 100 / 1000 µA
    g.font = '10px ui-monospace, monospace'
    g.textBaseline = 'middle'
    for (const uA of [1, 10, 100, 1000]) {
      const y = yOf(uA, h)
      g.strokeStyle = '#ece2d0'
      g.beginPath(); g.moveTo(34, y); g.lineTo(w, y); g.stroke()
      g.fillStyle = '#9a9184'
      g.fillText(uA >= 1000 ? '1 mA' : `${uA} µA`, 0, y)
    }

    // 4) 电流曲线：一段一段"台阶"
    const xOf = (t) => 34 + ((t - t0) / WINDOW) * (w - 34)
    g.strokeStyle = '#0e9384'
    g.lineWidth = 2
    g.beginPath()
    let pen = false
    let covered = 0
    let charge = 0
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const a = Math.max(p.t, t0)
      const b = Math.min(points[i + 1]?.t ?? now, now)
      if (b <= a) continue
      if (p.uA == null) { pen = false; continue }
      covered += b - a
      charge += p.uA * (b - a)
      const y = yOf(p.uA, h)
      const x1 = xOf(a)
      const x2 = Math.max(xOf(b), x1 + 2) // 太窄的尖峰至少画 2 像素宽
      if (pen) g.lineTo(x1, y)
      else g.moveTo(x1, y)
      g.lineTo(x2, y)
      pen = true
    }
    g.stroke()

    // 5) 三个读数
    const v = valueAt(now)
    elNow.textContent = v == null ? '—' : fmtI(v)
    if (covered > 1000) {
      const avg = charge / covered
      elAvg.textContent = fmtI(avg)
      elLife.textContent = fmtLife(avg)
    } else {
      elAvg.textContent = '—'
      elLife.textContent = '—'
    }
  })

  return { set }
}
