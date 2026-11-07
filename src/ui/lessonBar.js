// 底部课程条 + 顶部进度条。"学过哪几课"存在浏览器的 localStorage 里，关掉页面再开也还在

const KEY = 'apollo3-learn:done'

function loadDone() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set() // 有的浏览器（比如隐私模式）不让存，就当一课都没学
  }
}

export function createLessonBar(lessons) {
  const list = document.querySelector('#lesson-list')
  const done = loadDone()
  let currentId = null

  function render() {
    list.innerHTML = ''
    for (const l of lessons) {
      const a = document.createElement('a')
      a.href = `#${l.id}` // 点卡片 = 改网址的 # 部分，main.js 听到后换课
      a.className = 'lesson-card'
      a.classList.toggle('active', l.id === currentId)
      a.classList.toggle('done', done.has(l.id))
      const no = document.createElement('span')
      no.className = 'lesson-no'
      no.textContent = done.has(l.id) ? '✓' : l.no
      const text = document.createElement('span')
      text.innerHTML = '<div class="lesson-name"></div><div class="lesson-tag"></div>'
      text.querySelector('.lesson-name').textContent = l.title
      text.querySelector('.lesson-tag').textContent = l.tag
      a.append(no, text)
      list.appendChild(a)
    }
    // 顶部进度条
    const n = lessons.filter((l) => done.has(l.id)).length
    document.querySelector('#progress-text').textContent = `${n}/${lessons.length}`
    document.querySelector('#progress-fill').style.width = `${(n / lessons.length) * 100}%`
  }

  return {
    setCurrent(id) {
      currentId = id
      render()
      // 只横向滚动课程条，把当前课挪进视野（不让整页跟着跳）
      const card = list.querySelector('.active')
      if (card) list.scrollLeft += card.getBoundingClientRect().left - list.getBoundingClientRect().left - 12
    },
    markDone(id) {
      done.add(id)
      try { localStorage.setItem(KEY, JSON.stringify([...done])) } catch { /* 存不了也不影响使用 */ }
      render()
    },
  }
}
