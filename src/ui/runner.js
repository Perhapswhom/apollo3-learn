// 动画脚本引擎："运行"按钮背后的东西
// 它不编译代码，而是照着每节课写好的"剧本"（behavior），按时间点亮 LED、高亮代码、打印串口
// 第 12 步新增：剧本能响应"点 3D 零件"和"串口输入"，滑块可以不重启就生效
// 第 16 步新增：连上真板（link）后，串口框只显示板子发来的字，输入框的字发给板子
// 第 19 步新增：按钮文字走 t()；剧本里可以用 ctx.tr('中文', 'English')

import { t, tr } from '../i18n/index.js'

export function createRunner({ stage, board, code, scope, link, onStart }) {
  const btn = document.querySelector('#run-btn')
  const serial = document.querySelector('#serial')
  const input = document.querySelector('#serial-input')
  let lesson = null
  let current = null // 正在跑的剧本：{ timers, cleanup, presses, inputs, p }
  let now = 0

  const live = () => !!link?.connected() // 现在是不是"真板模式"

  // 往串口框里写一行（真板发来的字也走这里）
  function write(text) {
    serial.textContent += text + '\n'
    if (serial.textContent.length > 6000) serial.textContent = serial.textContent.slice(-4000) // 别无限变长
    serial.scrollTop = serial.scrollHeight
  }
  // 剧本打印：真板模式下不打印，免得模拟的字和板子的字混在一起
  function print(text) {
    if (!live()) write(text)
  }

  // 每一帧检查"闹钟"：到点的就执行
  stage.onFrame((time) => {
    now = time
    if (!current) return
    for (const tm of [...current.timers]) {
      if (now - tm.at > 1000) tm.at = now // 页面切到后台再回来，不补跑积压的
      while (!tm.done && tm.at <= now) {
        tm.fn()
        if (tm.every) tm.at += tm.every
        else tm.done = true
      }
    }
    // 删掉跑完的（原地删，不换新数组：剧本里的 ctx.after 一直往同一个数组里加）
    if (current) for (let i = current.timers.length - 1; i >= 0; i--) if (current.timers[i].done) current.timers.splice(i, 1)
  })

  function start() {
    if (!lesson?.behavior) return
    stop()
    if (!live()) serial.textContent = ''
    const timers = []
    const presses = {} // 零件 id → 被点时要做的事
    const inputs = []  // 串口收到一行字时要做的事
    const p = code.values()
    // ctx = 给剧本用的"遥控器"
    const ctx = {
      after: (ms, fn) => timers.push({ at: now + ms, fn }),           // ms 毫秒后做一次
      every: (ms, fn) => timers.push({ at: now + ms, every: ms, fn }), // 每隔 ms 毫秒做一次
      now: () => now,                                                 // 现在的时间（毫秒）
      line: (text) => code.highlight(text),                           // 高亮含这段文字的代码行
      led: (id, on) => board.setLed(id, on),                          // 开关 LED，也可以给 0~1 的亮度
      print,                                                          // 串口打印
      power: (state, ms) => scope?.set(state, ms),                    // 告诉示波器：醒着/睡着/射频
      onPress: (id, fn) => { presses[id] = fn },                      // 用户点了某个 3D 零件
      onInput: (fn) => inputs.push(fn),                               // 用户在串口输入框里按了回车
      board,                                                          // 配件遥控器：setKnob、setPhone、wave…
      tr,                                                             // 中英各写一遍：ctx.tr('已连接', 'Connected')
    }
    current = { timers, cleanup: null, presses, inputs, p }
    board.reset?.()
    current.cleanup = lesson.behavior(ctx, p) || null
    btn.textContent = t('run.stop')
    btn.classList.add('running')
    onStart?.(lesson)
  }

  function stop() {
    if (!current) return
    current.cleanup?.()
    current = null
    ;['led0', 'led1', 'led2'].forEach((id) => board.setLed(id, false))
    board.reset?.()
    code.highlight(null)
    scope?.set(null)
    btn.textContent = t('run.start')
    btn.classList.remove('running')
  }

  btn.addEventListener('click', () => (current ? stop() : start()))

  // 串口输入框：回车就把这一行"发给板子"
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !input.value.trim()) return
    const text = input.value
    input.value = ''
    if (live()) { write(`> ${text}`); link.send(text); return } // 真板模式：直接发给板子
    if (!current) { print(t('run.needStart')); return }
    print(`> ${text}`)
    current.inputs.forEach((fn) => fn(text))
  })

  return {
    setLesson(l) {
      stop()
      lesson = l
      if (!live()) serial.textContent = ''
      input.classList.toggle('hidden', !l.serialInput && !live()) // 这节课要输入、或连着真板，才显示输入框
    },
    restart() { if (current) start() }, // 跑着的时候改了参数，就用新参数重来
    // 滑块变了：标了 live 的参数直接生效（剧本下次读 p.xxx 就是新值），其余的重跑
    paramChanged(key, values) {
      if (!current) return
      if (lesson.params?.[key]?.live) Object.assign(current.p, values)
      else start()
    },
    // 用户点了 3D 零件：按键先做个"按下去"的动作，再交给剧本
    press(id) {
      board.press?.(id)
      current?.presses[id]?.()
    },
    stop,
    write,
    // 第 16 步：连上 / 断开真板
    setLive(on, baud) {
      serial.classList.toggle('live', on)
      input.classList.toggle('hidden', !on && !lesson?.serialInput)
      write(on ? t('serial.connected', { baud }) : t('serial.disconnected'))
    },
  }
}
