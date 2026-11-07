// Web Serial：插上 EVB，网页直接读写板子的串口（只有电脑版 Chrome / Edge 支持）
// 打个比方：以前看板子日志要另开一个"串口助手"软件；现在浏览器自己就是串口助手
// 连上以后是"真板模式"：串口框只显示板子发来的字，输入框里打的字发给板子

import { t } from '../i18n/index.js'

export function createSerialLink({ onLine, onChange }) {
  const btn = document.querySelector('#serial-connect')
  const baudEl = document.querySelector('#serial-baud')
  const statusEl = document.querySelector('#serial-status')
  const supported = 'serial' in navigator

  let port = null
  let reader = null
  let writer = null
  let loop = null // 正在跑的"读循环"，断开时要等它收尾
  let buf = ''    // 还没凑成一整行的字
  let flushTimer = 0

  function setStatus(text, live) {
    statusEl.textContent = text
    statusEl.classList.toggle('live', !!live)
    btn.textContent = t(live ? 'serial.disconnect' : 'serial.connect')
  }

  if (!supported) {
    btn.disabled = true
    btn.title = t('serial.unsupported')
    setStatus(t('serial.sim'), false)
  }

  // 收到的字凑成一行一行再交出去；有的提示符不带换行，停 300 ms 也交出去
  function feed(text) {
    buf += text.replace(/\r/g, '')
    const lines = buf.split('\n')
    buf = lines.pop()
    lines.forEach(onLine)
    clearTimeout(flushTimer)
    if (buf) flushTimer = setTimeout(() => { onLine(buf); buf = '' }, 300)
  }

  async function readLoop() {
    const decoder = new TextDecoder()
    let lost = false
    while (port?.readable && !lost) {
      reader = port.readable.getReader()
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break // 我们自己调了 cancel()：正常结束
          feed(decoder.decode(value, { stream: true }))
        }
      } catch (e) {
        // NetworkError = 设备没了（USB 线拔了）；别的（比如校验错）是小毛病，换个 reader 接着读
        if (e.name === 'NetworkError') {
          onLine(t('serial.lost'))
          lost = true
        }
      } finally {
        reader.releaseLock()
        reader = null
      }
    }
  }

  async function connect() {
    let p
    try {
      p = await navigator.serial.requestPort() // 弹出浏览器自带的选择框
    } catch {
      return // 用户点了"取消"，什么都不做
    }
    const baudRate = Number(baudEl.value)
    try {
      await p.open({ baudRate })
    } catch (e) {
      onLine(t('serial.openFail', { msg: e.message }))
      return
    }
    port = p
    writer = port.writable.getWriter()
    setStatus(t('serial.live', { baud: baudRate }), true)
    onChange(true, baudRate)
    loop = readLoop().then(() => { if (port) disconnect() }) // 线被拔掉时自动收尾
  }

  async function disconnect() {
    const p = port
    port = null // 先置空，读循环就知道该停了
    clearTimeout(flushTimer)
    if (buf) { onLine(buf); buf = '' }
    try { await reader?.cancel() } catch { /* 已经断了 */ }
    await loop?.catch(() => {})
    try { writer?.releaseLock() } catch { /* 同上 */ }
    try { await p?.close() } catch { /* 同上 */ }
    writer = null
    loop = null
    setStatus(t('serial.sim'), false)
    onChange(false)
  }

  btn.addEventListener('click', () => (port ? disconnect() : connect()))

  return {
    supported,
    connected: () => !!port,
    // 发一行字给板子：末尾加 \r\n，大多数固件按回车认一条命令
    async send(text) {
      if (!writer) return
      await writer.write(new TextEncoder().encode(text + '\r\n'))
    },
  }
}
