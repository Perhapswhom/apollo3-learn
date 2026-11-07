// 中英切换：界面上的字都从这里取
// 打个比方：一本书印了中、英两版，读者选哪版，整本书就换哪版
// 用法：t('run.start') → "▶ 运行" 或 "▶ Run"；t('catalog.count', { done: 3, total: 20 }) 会把 {done}、{total} 换掉

const KEY = 'apollo3-learn:lang'

// 第一次来：浏览器是中文就用中文，否则用英文；手动切过就记住
function detect() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch { /* 不让存就看浏览器语言 */ }
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const lang = detect()
export const isEn = lang === 'en'
document.documentElement.lang = isEn ? 'en' : 'zh-CN'

// 每条：[中文, English]
const UI = {
  'brand.sub': ['低功耗 · 蓝牙 · 边缘 AI', 'LOW POWER · BLE · EDGE AI'],
  'progress.title': ['打开课程目录', 'Open the lesson catalog'],
  'lang.title': ['切换语言', 'Switch language'],
  'nav.home': ['首页', 'Home'],
  'nav.catalog': ['课程', 'Lessons'],
  'nav.parts': ['元件', 'Parts'],
  'nav.ref': ['参考', 'Docs'],
  'nav.soon': ['还没做', 'Coming soon'],
  'stage.hint': ['拖动旋转 · 滚轮缩放 · 点击零件', 'Drag to rotate · scroll to zoom · click a part'],

  'scope.title': ['电流示波器', 'Current'],
  'scope.mode.est': ['SoC 电流估算', 'Estimate'],
  'scope.mode.replay': ['实测回放', 'Measured'],
  'scope.mode.sample': ['示例回放', 'Sample'],
  'scope.import': ['导入实测', 'Import CSV'],
  'scope.import.title': ['选一个 PPK2 / Joulescope 导出的 CSV，也可以直接拖进来', 'Pick a CSV exported from PPK2 or Joulescope, or drop it here'],
  'scope.back': ['✕ 回到估算', '✕ Back to estimate'],
  'scope.note': [
    '按 datasheet 典型值估算：醒着 6 µA/MHz × 48 MHz ≈ 288 µA，深睡 1 µA，BLE 射频收发 3 mA。不含 LED 和外设。',
    'Estimated from datasheet typicals: active 6 µA/MHz × 48 MHz ≈ 288 µA, deep sleep 1 µA, BLE radio TX/RX 3 mA. LEDs and peripherals not included.',
  ],
  'scope.sample': ['没有仪器？用合成示例试试导入', 'No instrument? Try the synthetic sample'],
  'scope.fail': ['导入失败：{msg}', 'Import failed: {msg}'],
  'scope.noteSynthetic': ['合成示例，不是实测', 'Synthetic sample, not a measurement'],
  'scope.noteReplay': ['实测回放：{name}（{source}）', 'Measured replay: {name} ({source})'],
  'scope.noteStats': [
    ' · 时长 {dur} s · {rate} · 峰值 {peak}。平均按整份文件算；回放到头自动从头再来。',
    ' · {dur} s · {rate} · peak {peak}. Average covers the whole file; the replay loops.',
  ],
  'stat.now': ['此刻', 'Now'],
  'stat.avg': ['运行以来平均', 'Avg since start'],
  'stat.avgFile': ['文件平均', 'File average'],
  'stat.life': ['{name} 续航', '{name} life'],
  'life.hours': ['{n} 小时', '{n} h'],
  'life.days': ['{n} 天', '{n} days'],
  'life.years': ['{n} 年', '{n} years'],
  'life.over10': ['> 10 年', '> 10 years'],

  'tab.overview': ['概览', 'Overview'],
  'tab.pins': ['引脚', 'Pins'],
  'code.title': ['动手试试', 'Try it'],
  'code.noZephyr': ['这节课还没有 Zephyr 版', 'No Zephyr version for this lesson yet'],
  'code.missing': ['[剧本] 代码里找不到含 "{text}" 的行', '[script] No code line contains "{text}"'],
  'run.start': ['▶ 运行', '▶ Run'],
  'run.stop': ['■ 停止', '■ Stop'],
  'run.needStart': ['（先点"运行"，板子才会收）', '(Press "Run" first so the board is listening)'],

  'serial.title': ['串口', 'Serial'],
  'serial.sim': ['模拟', 'Sim'],
  'serial.live': ['真板 · {baud}', 'Board · {baud}'],
  'serial.connect': ['连真板', 'Connect board'],
  'serial.disconnect': ['断开', 'Disconnect'],
  'serial.baudTitle': ['波特率（AmbiqSuite 例程默认 115200）', 'Baud rate (AmbiqSuite examples use 115200)'],
  'serial.unsupported': [
    '需要电脑版 Chrome 或 Edge（Safari、Firefox、手机浏览器都不支持 Web Serial）',
    "Needs desktop Chrome or Edge (Safari, Firefox and mobile browsers don't support Web Serial)",
  ],
  'serial.lost': ['—— 串口断了：USB 线拔掉了？ ——', '—— Serial port lost: was the USB cable unplugged? ——'],
  'serial.openFail': [
    '—— 打不开串口：{msg}。多半是被别的软件占着（串口助手、J-Link RTT Viewer），关掉再试 ——',
    "—— Can't open the port: {msg}. Another app (a serial terminal, J-Link RTT Viewer) probably has it; close it and retry ——",
  ],
  'serial.connected': ['—— 已连上真板（{baud}），下面是板子发来的字 ——', '—— Connected to the board ({baud}); everything below comes from the board ——'],
  'serial.disconnected': ['—— 已断开真板，回到模拟 ——', '—— Disconnected; back to simulation ——'],
  'serial.placeholder': ['在这里输入，按回车发给板子', 'Type here; Enter sends it to the board'],
  'serial.empty': ['串口输出会显示在这里', 'Serial output shows up here'],

  'lessonbar.title': ['课程', 'Lessons'],
  'catalog.title': ['全部课程', 'All lessons'],
  'catalog.count': ['已学 {done}/{total}', '{done}/{total} done'],
  'catalog.continue': ['继续学习：{no}. {title} →', 'Continue: {no}. {title} →'],
  'catalog.close': ['关闭（Esc）', 'Close (Esc)'],
  'catalog.other': ['其他', 'Other'],

  'trace.noNumbers': ['文件里找不到数字，是不是导出成了别的格式？', 'No numbers found. Was it exported in another format?'],
  'trace.noCurrent': ['没认出电流列。表头是：{cols}', "Couldn't find the current column. Header: {cols}"],
  'trace.noTime': ['没有时间列。Joulescope 统计记录请把时间格式选成 relative 或 UTC', 'No time column. In Joulescope statistics recording, set the time format to relative or UTC'],
  'trace.tooFew': ['数据少于 2 行，画不出来', 'Fewer than 2 rows of data; nothing to draw'],

  'board.silk': ['示意模型', 'demo model'],
  'phone.title': ['手机', 'Phone'],
  'phone.waiting': ['等待中…', 'Waiting…'],
}

// 课程阶段的名字（课程文件里写中文，英文模式下换掉）
const STAGES = {
  '入门': 'Basics',
  '外设': 'Peripherals',
  '低功耗': 'Low power',
  '蓝牙': 'Bluetooth',
  'AI 与综合': 'AI & projects',
}

export function t(key, vars = {}) {
  const pair = UI[key]
  if (!pair) return key
  let s = pair[isEn ? 1 : 0]
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
  return s
}

// 剧本里临时的几个字，中英各写一遍：ctx.tr('已连接', 'Connected')
export const tr = (zh, en) => (isEn ? en : zh)

// 切换语言：存起来，刷新页面（每个模块重新按新语言画一遍，最不容易漏）
export function setLang(next) {
  try { localStorage.setItem(KEY, next) } catch { /* 存不了就只换这一次 */ }
  location.reload()
}

// 把 index.html 里标了 data-i18n 的元素换成当前语言
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n) })
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle) })
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder) })
  root.querySelectorAll('[data-i18n-empty]').forEach((el) => { el.dataset.empty = t(el.dataset.i18nEmpty) })
}

// 课程：英文模式下，用课程文件里 en 那一块盖掉中文；没写的字段保留中文
export function localize(lesson) {
  if (!isEn) return lesson
  const e = lesson.en ?? {}
  return {
    ...lesson,
    title: e.title ?? lesson.title,
    tag: e.tag ?? lesson.tag,
    stage: STAGES[lesson.stage] ?? lesson.stage,
    lede: e.lede ?? lesson.lede,
    features: e.features ?? lesson.features,
    pins: lesson.pins?.map((p, i) => e.pins?.[i] ?? p),
    params: lesson.params && Object.fromEntries(
      Object.entries(lesson.params).map(([k, p]) => [k, { ...p, label: e.params?.[k] ?? p.label }]),
    ),
    callouts: lesson.callouts?.map((c, i) => ({ ...c, ...(e.callouts?.[i] ?? {}) })),
    batteryName: e.batteryName ?? lesson.batteryName,
  }
}
