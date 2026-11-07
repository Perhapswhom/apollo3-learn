// 动画脚本引擎："运行"按钮背后的东西
// 它不编译代码，而是照着每节课写好的"剧本"（behavior），按时间点亮 LED、高亮代码、打印串口

export function createRunner({ stage, board, code, scope, onStart }) {
  const btn = document.querySelector('#run-btn')
  const serial = document.querySelector('#serial')
  let lesson = null
  let current = null // 正在跑的剧本：{ timers, cleanup }
  let now = 0

  function print(text) {
    serial.textContent += text + '\n'
    serial.scrollTop = serial.scrollHeight
  }

  // 每一帧检查"闹钟"：到点的就执行
  stage.onFrame((t) => {
    now = t
    if (!current) return
    for (const tm of [...current.timers]) {
      if (now - tm.at > 1000) tm.at = now // 页面切到后台再回来，不补跑积压的
      while (!tm.done && tm.at <= now) {
        tm.fn()
        if (tm.every) tm.at += tm.every
        else tm.done = true
      }
    }
    if (current) current.timers = current.timers.filter((tm) => !tm.done)
  })

  function start() {
    if (!lesson?.behavior) return
    stop()
    serial.textContent = ''
    const timers = []
    // ctx = 给剧本用的"遥控器"
    const ctx = {
      after: (ms, fn) => timers.push({ at: now + ms, fn }),           // ms 毫秒后做一次
      every: (ms, fn) => timers.push({ at: now + ms, every: ms, fn }), // 每隔 ms 毫秒做一次
      line: (text) => code.highlight(text),                           // 高亮含这段文字的代码行
      led: (id, on) => board.setLed(id, on),                          // 开关 LED
      print,                                                          // 串口打印
      power: (state, ms) => scope?.set(state, ms),                    // 告诉示波器：醒着/睡着
    }
    current = { timers, cleanup: null }
    current.cleanup = lesson.behavior(ctx, code.values()) || null
    btn.textContent = '■ 停止'
    btn.classList.add('running')
    onStart?.(lesson)
  }

  function stop() {
    if (!current) return
    current.cleanup?.()
    current = null
    ;['led0', 'led1', 'led2'].forEach((id) => board.setLed(id, false))
    code.highlight(null)
    scope?.set(null)
    btn.textContent = '▶ 运行'
    btn.classList.remove('running')
  }

  btn.addEventListener('click', () => (current ? stop() : start()))

  return {
    setLesson(l) { stop(); lesson = l; serial.textContent = '' },
    restart() { if (current) start() }, // 跑着的时候改了参数，就用新参数重来
    stop,
  }
}
