import * as THREE from 'three'
import { partBox } from './board.js'

// 标注气泡：HTML 小卡片 + 一根虚线，钉在 3D 零件上
// 原理：每一帧把零件的 3D 坐标"投影"成屏幕坐标（Vector3.project），再把卡片挪过去
export function createCallouts(stage, board, onClick) {
  const layer = document.querySelector('#callouts')
  const svg = document.querySelector('#callout-lines')
  const NS = 'http://www.w3.org/2000/svg'
  let items = []

  function clear() {
    layer.innerHTML = ''
    svg.innerHTML = ''
    items = []
  }

  function make({ part, title, text, dx = 0, dy = -90 }, temp = false) {
    const g = board.parts.get(part)
    if (!g) return
    // 卡片
    const el = document.createElement('div')
    el.className = 'callout'
    const b = document.createElement('b')
    b.textContent = title ?? g.userData.title
    const s = document.createElement('span')
    s.textContent = text ?? g.userData.desc
    el.append(b, s)
    el.addEventListener('click', () => onClick(part))
    layer.appendChild(el)
    // 虚线 + 圆点
    const line = document.createElementNS(NS, 'line')
    line.setAttribute('stroke', '#0e9384')
    line.setAttribute('stroke-width', '1.5')
    line.setAttribute('stroke-dasharray', '4 3')
    const dot = document.createElementNS(NS, 'circle')
    dot.setAttribute('r', '4.5')
    dot.setAttribute('fill', '#0e9384')
    dot.setAttribute('stroke', '#fff')
    dot.setAttribute('stroke-width', '2')
    svg.append(line, dot)
    // 钉在哪：零件包围盒的"顶面中心"
    const box = partBox(g)
    const anchor = box.getCenter(new THREE.Vector3())
    anchor.y = box.max.y
    items.push({ part, el, line, dot, anchor, dx, dy, temp })
  }

  // 显示一组标注（换课时调用）
  function show(list) {
    clear()
    list.forEach((c) => make(c))
  }

  // 高亮某个零件的标注；这节课没有它的标注，就临时加一个
  function focus(id) {
    items.filter((it) => it.temp && it.part !== id).forEach((it) => {
      it.el.remove(); it.line.remove(); it.dot.remove()
    })
    items = items.filter((it) => !it.temp || it.part === id)
    if (id && !items.some((it) => it.part === id)) make({ part: id, dx: 0, dy: -110 }, true)
    items.forEach((it) => it.el.classList.toggle('active', it.part === id))
  }

  // 每一帧：3D 坐标 → 屏幕坐标
  const v = new THREE.Vector3()
  stage.onFrame(() => {
    const w = layer.clientWidth
    const h = layer.clientHeight
    const k = Math.min(1, h / 680) // 舞台变矮时，卡片离零件近一点，免得跑出画面
    for (const it of items) {
      v.copy(it.anchor).project(stage.camera) // 得到 -1~1 的"标准坐标"
      const x = ((v.x + 1) / 2) * w
      const y = ((1 - v.y) / 2) * h
      const lx = x + it.dx * k
      const ly = y + it.dy * k
      it.el.style.left = `${lx}px`
      it.el.style.top = `${ly}px`
      it.line.setAttribute('x1', x); it.line.setAttribute('y1', y)
      it.line.setAttribute('x2', lx); it.line.setAttribute('y2', ly)
      it.dot.setAttribute('cx', x); it.dot.setAttribute('cy', y)
    }
  })

  return { show, focus }
}
