import './style.css'
import { createStage } from './stage/scene.js'
import { createBoard } from './stage/board.js'
import { addAccessories } from './stage/accessories.js'
import { addControls, enablePicking } from './stage/interact.js'
import { createCallouts } from './stage/callouts.js'
import { initTabs, showInfo } from './ui/info.js'
import { createCodePanel } from './ui/codePanel.js'
import { createRunner } from './ui/runner.js'
import { createScope } from './ui/scope.js'
import { createLessonBar } from './ui/lessonBar.js'
import { createCatalog } from './ui/catalog.js'
import { createSerialLink } from './ui/serial.js'
import { LESSONS as RAW_LESSONS } from './lessons/index.js'
import { applyStatic, localize, lang, setLang } from './i18n/index.js'

// 第 19 步：中英切换。先把页面上的固定文字换成当前语言，再把课程换成当前语言的版本
applyStatic()
const LESSONS = RAW_LESSONS.map(localize)
const langBtn = document.querySelector('#lang-btn')
langBtn.textContent = lang === 'zh' ? 'EN' : '中文' // 按钮上写的是"切过去"的那种语言
langBtn.addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh'))

initTabs()

// 舞台 + 板子 + 第 12 步：外接配件（每帧更新它们的小动画）
const stage = createStage(document.querySelector('#stage'))
const board = createBoard()
addAccessories(board)
stage.scene.add(board.group)
stage.onFrame((t) => board.update(t))

// 交互 + 标注：点 3D 零件或点标注卡片，都会"按"到这个零件（剧本可以响应）
addControls(stage)
let picker
const callouts = createCallouts(stage, board, (id) => {
  picker.select(id)
  callouts.focus(id)
  runner.press(id)
})
picker = enablePicking(stage, board, (info) => {
  callouts.focus(info?.id)
  if (info) runner.press(info.id)
})

// 课程条 + 进度（按过"运行"就算学过这一课）
const bar = createLessonBar(LESSONS)

// 代码面板（拖滑块时告诉剧本引擎是哪个参数）+ 剧本引擎 + 电流示波器
const code = createCodePanel((values, key) => runner.paramChanged(key, values))
const scope = createScope(stage)
// 第 16 步：Web Serial 连真板。板子发来一行就写进串口框；连上/断开时告诉剧本引擎
const link = createSerialLink({
  onLine: (text) => runner.write(text),
  onChange: (on, baud) => runner.setLive(on, baud),
})
const runner = createRunner({ stage, board, code, scope, link, onStart: (l) => bar.markDone(l.id) })

// 第 15 步：课程目录页（要用课程条里记的"学过哪几课"）
const catalog = createCatalog(LESSONS, { isDone: bar.isDone })
let current = null // 现在装着的是哪一课

// 把一节课"装"到页面上
function loadLesson(lesson) {
  current = lesson
  runner.setLesson(lesson)
  board.show(lesson.accessories ?? [])       // 只显示这节课要的配件
  stage.setView(lesson.view ?? 7)            // 有配件的课把镜头拉远一点
  scope.setBattery(lesson.battery ?? 220, lesson.batteryName ?? 'CR2032')
  showInfo(lesson)
  code.setLesson(lesson)
  callouts.show(lesson.callouts ?? [])
  picker.select(null)
  bar.setCurrent(lesson.id)
  document.title = `${lesson.title} · Learn Apollo3 Blue`
}

// 左侧导航：哪个按钮亮
function setNav(name) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.nav === name))
}

// 网址路由：#blink 打开第 2 课；#catalog 打开目录页；没有 # 或写错了就打开第 1 课
function route() {
  const id = location.hash.slice(1)
  if (id === 'catalog') {
    if (!current) loadLesson(LESSONS[0]) // 直接打开目录页网址时，底下也先装好第 1 课
    catalog.show(current.id)
    setNav('catalog')
    return
  }
  catalog.hide()
  setNav('home')
  const lesson = LESSONS.find((l) => l.id === id) ?? LESSONS[0]
  if (lesson !== current) loadLesson(lesson) // 从目录页回到同一课：不重装，正在运行的也不打断
}
window.addEventListener('hashchange', route)
route()

// 导航按钮、目录页的 ✕、Esc 键
const goHome = () => { location.hash = current.id }
document.querySelector('[data-nav="home"]').addEventListener('click', goHome)
document.querySelector('[data-nav="catalog"]').addEventListener('click', () => { location.hash = 'catalog' })
document.querySelector('#catalog-close').addEventListener('click', goHome)
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && catalog.isOpen()) goHome() })
