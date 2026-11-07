// 课程目录页：20 节课按阶段分组，一眼看全，点卡片就去那一课
// 打个比方：底部课程条像"书签"，只能一张张翻；目录页就是书的"目录"

import { t } from '../i18n/index.js'

// 简介只取第一句，卡片上放不下整段
// 中文按 。！？ 断句；英文要"句号 + 空格"才算一句结束（不然 32.768 kHz 会被切断）
const firstSentence = (s = '') => s.split(/(?<=[。！？])|(?<=[.!?])\s+/)[0]

export function createCatalog(lessons, { isDone }) {
  const el = document.querySelector('#catalog-page')
  const body = el.querySelector('.catalog-body')
  const countEl = el.querySelector('#catalog-count')
  const continueEl = el.querySelector('#catalog-continue')

  // 按 stage 分组，组的顺序 = 课程在 LESSONS 里第一次出现的顺序
  function groups() {
    const map = new Map()
    for (const l of lessons) {
      const key = l.stage ?? t('catalog.other')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(l)
    }
    return [...map]
  }

  function card(l, currentId) {
    const a = document.createElement('a')
    a.href = `#${l.id}`
    a.className = 'cat-card'
    a.classList.toggle('done', isDone(l.id))
    a.classList.toggle('active', l.id === currentId)
    a.innerHTML = `
      <span class="lesson-no"></span>
      <span class="cat-text">
        <span class="lesson-name"></span>
        <span class="lesson-tag"></span>
        <span class="cat-lede"></span>
      </span>`
    a.querySelector('.lesson-no').textContent = isDone(l.id) ? '✓' : l.no
    a.querySelector('.lesson-name').textContent = l.title
    a.querySelector('.lesson-tag').textContent = l.tag
    a.querySelector('.cat-lede').textContent = firstSentence(l.lede)
    return a
  }

  function render(currentId) {
    body.innerHTML = ''
    for (const [stage, list] of groups()) {
      const n = list.filter((l) => isDone(l.id)).length
      const sec = document.createElement('section')
      sec.className = 'cat-group'
      sec.innerHTML = `
        <div class="cat-group-head">
          <h3></h3>
          <span class="cat-count">${n}/${list.length}</span>
          <div class="cat-bar"><i style="width:${(n / list.length) * 100}%"></i></div>
        </div>
        <div class="cat-grid"></div>`
      sec.querySelector('h3').textContent = stage
      const grid = sec.querySelector('.cat-grid')
      for (const l of list) grid.appendChild(card(l, currentId))
      body.appendChild(sec)
    }

    // 顶部：一共学了几课 +"继续学习"（第一节还没学过的课）
    const done = lessons.filter((l) => isDone(l.id)).length
    countEl.textContent = t('catalog.count', { done, total: lessons.length })
    const next = lessons.find((l) => !isDone(l.id))
    continueEl.classList.toggle('hidden', !next)
    if (next) {
      continueEl.href = `#${next.id}`
      continueEl.textContent = t('catalog.continue', { no: next.no, title: next.title })
    }
  }

  return {
    show(currentId) {
      render(currentId)
      el.classList.remove('hidden')
      el.scrollTop = 0
      window.scrollTo(0, 0) // 手机上整页会滚动，回到顶上才看得到目录开头
    },
    hide() {
      el.classList.add('hidden')
    },
    isOpen: () => !el.classList.contains('hidden'),
  }
}
