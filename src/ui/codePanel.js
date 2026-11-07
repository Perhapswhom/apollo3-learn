// 代码面板：显示代码、上色、高亮某一行、把 {{参数}} 换成滑块的值
// 第 18 步新增：AmbiqSuite HAL / Zephyr 两个标签页，选了哪个记在浏览器里
// 第 19 步新增：英文模式下，注释换成 comments.en.js 里的英文

import { t, isEn } from '../i18n/index.js'
import COMMENTS_EN from '../i18n/comments.en.js'

// 一条"正则表达式"认出 7 种东西：注释 / 字符串 / #预处理 / {{参数}} / 关键字 / 数字 / SDK 里的名字
// SDK 名字：AmbiqSuite 的 am_、AM_……，Zephyr 的 k_、gpio_、bt_、DT_……
const TOKENS =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(#\w+)|(\{\{\w+\}\})|\b(int|void|while|if|else|return|const|static|volatile|bool|for|struct|char|float|uint8_t|uint16_t|uint32_t|int16_t|int32_t|ssize_t)\b|\b(0x[\da-fA-F]+|\d+)\b|\b(am_\w+|AM_\w+|g_AM_\w+|NVIC_\w+|\w+_IRQn|IRQ_\w+|irq_\w+|k_\w+|K_\w+|DT_\w+|DEVICE_DT_\w+|GPIO_\w+|gpio_\w+|BT_\w+|bt_\w+|PWM_\w+|pwm_\w+|ADC_\w+|adc_\w+|SENSOR_\w+|sensor_\w+|rtc_\w+|flash_\w+|PM_\w+|pm_\w+|console_\w+|printk)\b/g
const CLASS = ['', 't-com', 't-str', 't-pre', 't-param', 't-kw', 't-num', 't-fn']

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// 英文模式：// 后面的中文换成英文（字典里没有就原样留着）
function translateComment(c) {
  if (!isEn) return c
  const [, gap, text] = c.match(/^\/\/(\s*)(.*)$/)
  const en = COMMENTS_EN[text.trim()]
  return en ? `//${gap}${en}` : c
}

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
    } else if (kind === 1) {
      out += `<span class="t-com">${esc(translateComment(m[0]))}</span>`
    } else {
      out += `<span class="${CLASS[kind]}">${esc(m[0])}</span>`
    }
    last = m.index + m[0].length
  }
  return out + esc(line.slice(last))
}

const SDK_KEY = 'apollo3-learn:sdk'

export function createCodePanel(onParamChange) {
  const view = document.querySelector('#code-view')
  const paramsEl = document.querySelector('#params')
  const tabs = [...document.querySelectorAll('.code-tab')]
  let lesson = null
  let values = {}
  let sdk = 'hal'        // 'hal' 或 'zephyr'
  let hotText = null     // 剧本最后一次要高亮的字（切标签页时用它重新高亮）
  try { sdk = localStorage.getItem(SDK_KEY) || 'hal' } catch { /* 不让存就用默认 */ }

  // 现在显示的是哪份代码：选了 Zephyr、而且这节课有 Zephyr 版，才用 Zephyr 版
  const showingZephyr = () => sdk === 'zephyr' && !!lesson?.zephyr
  const source = () => (showingZephyr() ? lesson.zephyr : lesson.code)

  function render() {
    view.innerHTML = source()
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

  // 标签页：哪个亮、这节课没有 Zephyr 版就把 Zephyr 那页变灰
  function renderTabs() {
    for (const tab of tabs) {
      const off = tab.dataset.sdk === 'zephyr' && !lesson?.zephyr
      tab.disabled = off
      tab.title = off ? t('code.noZephyr') : ''
      tab.classList.toggle('active', tab.dataset.sdk === (showingZephyr() ? 'zephyr' : 'hal'))
    }
  }

  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      sdk = tab.dataset.sdk
      try { localStorage.setItem(SDK_KEY, sdk) } catch { /* 存不了也能用 */ }
      renderTabs()
      render()
      highlight(hotText) // 切过去以后，高亮还在对应的那一行
    }),
  )

  function setLesson(l) {
    lesson = l
    values = {}
    hotText = null
    for (const [key, p] of Object.entries(l.params ?? {})) values[key] = p.value
    renderParams()
    renderTabs()
    render()
  }

  // 高亮"第一行包含这段文字"的代码；传 null 取消高亮
  // 剧本里写的是 HAL 版的字；显示 Zephyr 版时，先查课程里的 zephyrLines 换成 Zephyr 版对应的字
  function highlight(text) {
    hotText = text
    const lines = [...view.querySelectorAll('.ln')]
    const want = text && showingZephyr() ? (lesson.zephyrLines?.[text] ?? text) : text
    const idx = want ? source().split('\n').findIndex((l) => l.includes(want)) : -1
    if (want && idx === -1) console.warn(t('code.missing', { text: want }))
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
