// 代码面板：显示代码、上色、高亮某一行、把 {{参数}} 换成滑块的值

// 一条"正则表达式"认出 7 种东西：注释 / 字符串 / #预处理 / {{参数}} / 关键字 / 数字 / am_ 开头的 SDK 名字
const TOKENS =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(#\w+)|(\{\{\w+\}\})|\b(int|void|while|if|else|return|const|static|volatile|bool|for|uint32_t)\b|\b(0x[\da-fA-F]+|\d+)\b|\b(am_\w+|AM_\w+|g_AM_\w+|NVIC_\w+|\w+_IRQn)\b/g
const CLASS = ['', 't-com', 't-str', 't-pre', 't-param', 't-kw', 't-num', 't-fn']

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// 给一行代码上色，返回 HTML
function paint(line, values) {
  let out = ''
  let last = 0
  for (const m of line.matchAll(TOKENS)) {
    out += esc(line.slice(last, m.index))
    const kind = m.findIndex((g, i) => i > 0 && g !== undefined)
    if (kind === 4) {
      const key = m[0].slice(2, -2)
      out += `<span class="t-param">${esc(String(values[key] ?? m[0]))}</span>`
    } else {
      out += `<span class="${CLASS[kind]}">${esc(m[0])}</span>`
    }
    last = m.index + m[0].length
  }
  return out + esc(line.slice(last))
}

export function createCodePanel(onParamChange) {
  const view = document.querySelector('#code-view')
  const paramsEl = document.querySelector('#params')
  let lesson = null
  let values = {}

  function render() {
    view.innerHTML = lesson.code
      .split('\n')
      .map((line, i) => `<span class="ln" data-n="${i + 1}">${paint(line, values) || ' '}</span>`)
      .join('')
  }

  // 每个参数一行：名字 + 滑块 + 当前值
  function renderParams() {
    paramsEl.innerHTML = ''
    for (const [key, p] of Object.entries(lesson.params ?? {})) {
      const row = document.createElement('label')
      row.className = 'param'
      row.innerHTML = `<span>${esc(p.label)}</span><input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${values[key]}"><output></output>`
      const input = row.querySelector('input')
      const output = row.querySelector('output')
      output.textContent = `${values[key]} ${p.unit}`
      input.addEventListener('input', () => {
        values[key] = Number(input.value)
        output.textContent = `${values[key]} ${p.unit}`
        render()
        onParamChange?.(values, key)
      })
      paramsEl.appendChild(row)
    }
  }

  function setLesson(l) {
    lesson = l
    values = {}
    for (const [key, p] of Object.entries(l.params ?? {})) values[key] = p.value
    renderParams()
    render()
  }

  // 高亮"第一行包含这段文字"的代码；传 null 取消高亮
  function highlight(text) {
    const lines = [...view.querySelectorAll('.ln')]
    const idx = text ? lesson.code.split('\n').findIndex((l) => l.includes(text)) : -1
    if (text && idx === -1) console.warn(`[剧本] 代码里找不到含 "${text}" 的行`)
    lines.forEach((el, i) => el.classList.toggle('hot', i === idx))
    const hot = lines[idx]
    if (hot) {
      // 只滚动代码框自己，不让整页跳
      const top = hot.offsetTop - view.clientHeight / 2
      view.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return { setLesson, highlight, values: () => ({ ...values }) }
}
