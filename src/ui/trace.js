// 读 PPK2 / Joulescope 导出的电流 CSV，变成示波器能"回放"的数据
// 打个比方：示波器原来是"照菜谱估算热量"，这里换成"直接放体重秤的称重记录"
//
// 认得的格式（看表头自动判断，单位写在括号里就按括号，没写就按 Joulescope 的习惯：秒、安培）
//   PPK2（nRF Connect Power Profiler）：Timestamp(ms),Current(uA),D0-D7,...
//   Joulescope 波形"导出可见数据"：     # time,JS220-xxxx.i,JS220-xxxx.v
//   Joulescope 统计记录：               #time,current,voltage,power,charge,energy

import { t as msg } from '../i18n/index.js' // 这个文件里 t 是时间数组，翻译函数改叫 msg

const T_UNIT = { s: 1000, ms: 1, us: 1e-3, 'µs': 1e-3, ns: 1e-6 } // 换算成毫秒
const I_UNIT = { a: 1e6, ma: 1e3, ua: 1, 'µa': 1, na: 1e-3 }      // 换算成微安

// 表头里括号/方括号中的单位：Timestamp(ms) → ms
const unitOf = (name) => name.match(/[([]\s*([^)\]]+?)\s*[)\]]/)?.[1].toLowerCase().replace('μ', 'µ') ?? null

// Joulescope 统计记录可以选 UTC 时间：20261107T061234.5Z
const UTC = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/
function parseTime(s) {
  const m = s.match(UTC)
  if (!m) return Number(s)
  return Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6]) / 1000 + Number(m[7] ?? 0) // 秒
}
const isData = (cell) => cell !== '' && (Number.isFinite(Number(cell)) || UTC.test(cell))

export function parseCurrentCsv(text, name = 'data.csv') {
  const lines = text.split(/\r?\n/)

  // 1) 找到第一行"数据"（第一格是数字），它上面最后一行有字的就是表头
  let first = -1
  let header = ''
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k].trim()
    if (!line) continue
    const cell = line.split(/[,;\t]/)[0].trim()
    if (isData(cell)) { first = k; break }
    header = line.replace(/^#\s*/, '')
  }
  if (first < 0) throw new Error(msg('trace.noNumbers'))

  // 2) 分隔符：大多数是逗号，有的地区版 Excel 存成分号或 Tab
  const sample = header || lines[first]
  const delim = sample.includes('\t') ? '\t' : sample.includes(';') && !sample.includes(',') ? ';' : ','

  // 3) 哪一列是时间、哪一列是电流
  const cols = header ? header.split(delim).map((c) => c.trim()) : ['time (s)', 'current (A)']
  let ti = cols.findIndex((c) => /^(time|timestamp)/i.test(c))
  let ii = cols.findIndex((c) => /current/i.test(c))
  if (ii < 0) ii = cols.findIndex((c) => /(^|\.)i(\s*[([].*)?$/i.test(c)) // Joulescope 波形：JS220-xxxx.i
  if (ti < 0 && ii < 0 && cols.length >= 2) { ti = 0; ii = 1 } // 没表头：第 1 列时间，第 2 列电流
  if (ii < 0) throw new Error(msg('trace.noCurrent', { cols: cols.join(' | ') }))
  if (ti < 0) throw new Error(msg('trace.noTime'))

  const tScale = T_UNIT[unitOf(cols[ti])] ?? 1000 // 没写单位 = 秒
  const iScale = I_UNIT[unitOf(cols[ii])] ?? 1e6  // 没写单位 = 安培

  // 4) 一行一行读数字
  const t = new Float64Array(lines.length - first)
  const i = new Float32Array(lines.length - first)
  let n = 0
  for (let k = first; k < lines.length; k++) {
    const line = lines[k]
    if (!line || line[0] === '#') continue
    const cells = line.split(delim)
    const tv = parseTime(cells[ti]?.trim() ?? '')
    const iv = Number(cells[ii])
    if (!Number.isFinite(tv) || !Number.isFinite(iv)) continue
    t[n] = tv * tScale
    i[n] = iv * iScale
    n++
  }
  if (n < 2) throw new Error(msg('trace.tooFew'))

  const t0 = t[0]
  for (let k = 0; k < n; k++) t[k] -= t0 // 从 0 开始计时
  const source = /Timestamp\(ms\)/i.test(header) ? 'PPK2' : /\.i\b|current,voltage/i.test(header) ? 'Joulescope' : 'CSV'
  return summarize({ name, source, t: t.subarray(0, n), i: i.subarray(0, n) })
}

// 算总时长、采样率、平均、峰值，再把数据"装桶"，画图时一个像素只看几个桶
export function summarize(trace) {
  const { t, i } = trace
  const n = t.length
  const dt = (t[n - 1] - t[0]) / (n - 1)       // 平均采样间隔（毫秒）
  const duration = t[n - 1] - t[0] + dt        // 最后一个点也占一个间隔
  let charge = 0
  let peak = -Infinity
  for (let k = 0; k < n; k++) {
    const w = k < n - 1 ? t[k + 1] - t[k] : dt // 每个点代表到下一个点之前这段时间
    charge += i[k] * w
    if (i[k] > peak) peak = i[k]
  }

  // 装桶：最多 20 万个桶，每个桶记最小、最大、平均
  const bw = Math.max(dt, duration / 200000)
  const nb = Math.ceil(duration / bw)
  const bmin = new Float32Array(nb).fill(Infinity)
  const bmax = new Float32Array(nb).fill(-Infinity)
  const bsum = new Float32Array(nb)
  const bcnt = new Uint32Array(nb)
  for (let k = 0; k < n; k++) {
    const b = Math.min(nb - 1, Math.floor(t[k] / bw))
    if (i[k] < bmin[b]) bmin[b] = i[k]
    if (i[k] > bmax[b]) bmax[b] = i[k]
    bsum[b] += i[k]
    bcnt[b]++
  }
  // 采样比桶稀（比如 Joulescope 统计记录 2 Hz）：空桶沿用前一个桶的值，台阶才连续
  for (let b = 1; b < nb; b++) {
    if (bcnt[b]) continue
    bmin[b] = bmax[b] = bsum[b] = bsum[b - 1] / bcnt[b - 1]
    bcnt[b] = 1
  }

  return {
    ...trace,
    n,
    duration,                   // 毫秒
    rate: 1000 / dt,            // 每秒多少个点
    avg: charge / duration,     // 微安
    peak,                       // 微安
    buckets: { bw, nb, bmin, bmax, bsum, bcnt },
  }
}
