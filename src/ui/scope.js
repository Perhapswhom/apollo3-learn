// 电流示波器：像汽车的"油耗表"，告诉你芯片此刻耗多少电、平均多少、一块电池能撑多久
// 第 17 步新增：可以导入 PPK2 / Joulescope 的实测 CSV，示波器改成"回放真实波形"

import { parseCurrentCsv } from './trace.js'
import { t } from '../i18n/index.js'

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
  const elAvgLabel = document.querySelector('#stat-avg-label')
  const elMode = document.querySelector('#scope-mode')
  const elNote = document.querySelector('.scope-note')
  const card = document.querySelector('.scope')
  const btnImport = document.querySelector('#scope-import')
  const fileInput = document.querySelector('#scope-file')
  const NOTE = t('scope.note') // 估算模式的说明，回放结束后换回来

  let battery = { mAh: 220, name: 'CR2032' }
  let points = [] // 底线的变化点：{ t, uA }，uA 为 null 表示没在运行
  let pulses = [] // 叠在底线上的尖峰：{ t0, t1, uA }
  let base = null
  let acc = { charge: 0, covered: 0, last: null } // 运行以来的累计：电荷 µA·ms、时长 ms
  let trace = null   // 第 17 步：导入的实测数据（null = 估算模式）
  let traceStart = 0 // 从什么时候开始回放

  // set('sleep')：底线切到深睡
  // set('active', 1)：在底线上叠一个 1 ms 的尖峰（醒来干一下活）
  // set('radio', 3)：叠一个 3 ms 的 BLE 射频尖峰
  // set(null)：停止
  function set(state, ms) {
    const now = performance.now()
    if (state != null && ms) {
      pulses.push({ t0: now, t1: now + ms, uA: toUA(state) })
      return
    }
    if (base == null && state != null) acc = { charge: 0, covered: 0, last: now } // 从停止到运行：重新累计
    base = state
    points.push({ t: now, uA: state != null ? toUA(state) : null })
    if (state == null) pulses = []
  }

  // 换课时调用：设置电池（智能戒指只有几十 mAh），并清空上一课的读数
  function setBattery(mAh = 220, name = 'CR2032') {
    battery = { mAh, name }
    elLifeLabel.textContent = t('stat.life', { name })
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
  // 顶端默认 10 mA；实测数据的峰值更高，就往上加一档（100 mA、1 A）
  const LOG_MIN = Math.log10(0.5)
  let LOG_MAX = Math.log10(10000)
  const yOf = (uA, h) => h - 4 - ((Math.log10(Math.max(uA, 0.5)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (h - 8)

  const fmtI = (uA) => (uA >= 1000 ? `${(uA / 1000).toFixed(1)} mA` : uA >= 100 ? `${uA.toFixed(0)} µA` : `${uA.toFixed(1)} µA`)
  function fmtLife(avgUA) {
    const hours = battery.mAh / (avgUA / 1000)
    if (hours < 48) return t('life.hours', { n: hours.toFixed(0) })
    if (hours < 24 * 365) return t('life.days', { n: (hours / 24).toFixed(0) })
    const years = hours / 24 / 365
    return years > 10 ? t('life.over10') : t('life.years', { n: years.toFixed(1) })
  }

  // 画布跟着显示尺寸走（高清屏要乘 devicePixelRatio，不然发糊），再画背景刻度线
  function prepareCanvas() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)
    g.font = '10px ui-monospace, monospace'
    g.textBaseline = 'middle'
    for (let uA = 1; uA <= 10 ** LOG_MAX + 1; uA *= 10) {
      const y = yOf(uA, h)
      g.strokeStyle = '#ece2d0'
      g.beginPath(); g.moveTo(34, y); g.lineTo(w, y); g.stroke()
      g.fillStyle = '#9a9184'
      g.fillText(uA >= 1e6 ? `${uA / 1e6} A` : uA >= 1000 ? `${uA / 1000} mA` : `${uA} µA`, 0, y)
    }
    return { w, h }
  }

  // 第 17 步：回放实测数据。每个像素看它对应的那几个"桶"，画出最小到最大的竖线
  // （像 PPK2 软件那样：尖峰再窄也看得见）
  function drawTrace(now) {
    const { w, h } = prepareCanvas()
    const { bw, nb, bmin, bmax, bsum, bcnt } = trace.buckets
    const span = Math.min(WINDOW, trace.duration)    // 文件比 5 秒短：一屏就是整份文件
    const play = (now - traceStart) % trace.duration // 回放到文件的第几毫秒了（放完从头再来）
    const pw = w - 34
    const wrap = (b) => ((b % nb) + nb) % nb
    g.strokeStyle = '#0e9384'
    g.lineWidth = 1
    g.beginPath()
    let prev = null
    for (let px = 0; px < pw; px++) {
      const ta = play - span + (px / pw) * span
      const b0 = Math.floor(ta / bw)
      const b1 = Math.max(b0, Math.floor((ta + span / pw) / bw) - 1)
      let lo = Infinity
      let hi = -Infinity
      for (let b = b0; b <= b1; b++) {
        const k = wrap(b)
        if (bmin[k] < lo) lo = bmin[k]
        if (bmax[k] > hi) hi = bmax[k]
      }
      if (prev != null) { lo = Math.min(lo, prev); hi = Math.max(hi, prev) } // 和左边一列连起来
      const y1 = yOf(lo, h)
      const y2 = Math.min(yOf(hi, h), y1 - 1) // 至少 1 像素高
      g.moveTo(34 + px + 0.5, y1)
      g.lineTo(34 + px + 0.5, y2)
      const k = wrap(b1)
      prev = bsum[k] / bcnt[k]
    }
    g.stroke()
    // 回放头：一条竖线，表示"此刻"
    g.strokeStyle = 'rgba(194, 65, 12, .5)'
    g.beginPath(); g.moveTo(w - 0.5, 0); g.lineTo(w - 0.5, h); g.stroke()

    const k = wrap(Math.floor(play / bw))
    elNow.textContent = fmtI(bsum[k] / bcnt[k])
    elAvg.textContent = fmtI(trace.avg)
    elLife.textContent = fmtLife(trace.avg)
  }

  stage.onFrame(() => {
    const now = performance.now()
    const t0 = now - WINDOW
    if (trace) { drawTrace(now); return }

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

    // 3) 画布 + 背景刻度线：1 µA / 10 µA / 100 µA / 1 mA / 10 mA
    const { w, h } = prepareCanvas()

    // 4) 电流曲线：一段一段"台阶"，太窄的尖峰至少画 2 像素宽
    const xOf = (time) => 34 + ((time - t0) / WINDOW) * (w - 34)
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

    // 5) 三个读数
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

  // —— 第 17 步：导入实测 CSV ——
  function showError(msg) {
    elNote.textContent = t('scope.fail', { msg })
    elNote.classList.add('error')
    setTimeout(() => { elNote.classList.remove('error'); elNote.textContent = trace ? noteOf(trace) : NOTE }, 6000)
  }
  const noteOf = (tr) =>
    (tr.synthetic ? t('scope.noteSynthetic') : t('scope.noteReplay', { name: tr.name, source: tr.source })) +
    t('scope.noteStats', {
      dur: (tr.duration / 1000).toFixed(1),
      rate: tr.rate >= 1000 ? `${(tr.rate / 1000).toFixed(0)} kS/s` : `${tr.rate.toFixed(0)} S/s`,
      peak: fmtI(tr.peak),
    })

  function loadTrace(tr) {
    trace = tr
    traceStart = performance.now()
    LOG_MAX = Math.max(4, Math.ceil(Math.log10(Math.max(tr.peak, 1)))) // 峰值超过 10 mA 就把顶端往上提
    elMode.textContent = t(tr.synthetic ? 'scope.mode.sample' : 'scope.mode.replay')
    elAvgLabel.textContent = t('stat.avgFile')
    btnImport.textContent = t('scope.back')
    card.classList.add('replay')
    elNote.textContent = noteOf(tr)
  }

  function clearTrace() {
    trace = null
    LOG_MAX = Math.log10(10000)
    elMode.textContent = t('scope.mode.est')
    elAvgLabel.textContent = t('stat.avg')
    btnImport.textContent = t('scope.import')
    card.classList.remove('replay')
    elNote.textContent = NOTE
  }

  async function importFile(file) {
    try {
      loadTrace(parseCurrentCsv(await file.text(), file.name))
    } catch (e) {
      showError(e.message)
    }
  }

  // 按钮：没在回放就选文件；在回放就退出
  btnImport.addEventListener('click', () => (trace ? clearTrace() : fileInput.click()))
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) importFile(fileInput.files[0])
    fileInput.value = '' // 同一个文件再选一次也能触发
  })
  // 也可以直接把 CSV 拖到示波器上
  card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drop') })
  card.addEventListener('dragleave', () => card.classList.remove('drop'))
  card.addEventListener('drop', (e) => {
    e.preventDefault()
    card.classList.remove('drop')
    if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0])
  })
  // "示例"链接：网站自带一份合成数据，没有仪器也能先试试
  document.querySelector('#scope-sample')?.addEventListener('click', async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(e.currentTarget.getAttribute('href'))
      loadTrace({ ...parseCurrentCsv(await res.text(), 'synthetic-ble-adv.csv'), synthetic: true })
    } catch (err) {
      showError(err.message)
    }
  })

  return { set, setBattery, loadTrace, clearTrace }
}
