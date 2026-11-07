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
import { LESSONS } from './lessons/index.js'

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
const runner = createRunner({ stage, board, code, scope, onStart: (l) => bar.markDone(l.id) })

// 把一节课"装"到页面上
function loadLesson(lesson) {
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

// 网址路由：#blink 就打开第 2 课；没有 # 或写错了就打开第 1 课
function route() {
  const id = location.hash.slice(1)
  loadLesson(LESSONS.find((l) => l.id === id) ?? LESSONS[0])
}
window.addEventListener('hashchange', route)
route()
