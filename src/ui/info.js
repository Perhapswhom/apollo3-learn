// 右上角信息卡：标题、简介、要点、引脚表

// "概览 / 引脚"标签切换（原来写在 main.js 里，现在搬到这里）
export function initTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn))
      document.querySelector('#tab-overview').classList.toggle('hidden', btn.dataset.tab !== 'overview')
      document.querySelector('#tab-pins').classList.toggle('hidden', btn.dataset.tab !== 'pins')
    })
  })
}

export function showInfo(lesson) {
  document.querySelector('#lesson-title').textContent = `${lesson.no}. ${lesson.title}`
  document.querySelector('#lesson-lede').textContent = lesson.lede

  const ul = document.querySelector('#lesson-features')
  ul.innerHTML = ''
  for (const f of lesson.features ?? []) {
    const li = document.createElement('li')
    li.textContent = f
    ul.appendChild(li)
  }

  const table = document.querySelector('#lesson-pins')
  table.innerHTML = ''
  for (const [name, macro, note] of lesson.pins ?? []) {
    const tr = table.insertRow()
    tr.insertCell().textContent = name
    const code = document.createElement('code')
    code.textContent = macro
    tr.insertCell().appendChild(code)
    tr.insertCell().textContent = note
  }
}
