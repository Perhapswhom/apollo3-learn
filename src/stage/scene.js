import * as THREE from 'three'

// 3D 舞台 = 场景（摆东西的桌面）+ 相机（看的角度）+ 灯光 + 渲染器（把画面画到网页上）
export function createStage(container) {
  // 1) 场景：所有 3D 物体都放进这里
  const scene = new THREE.Scene()

  // 2) 渲染器：负责把 3D 场景画到 <canvas> 上
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true                 // 打开阴影
  renderer.shadowMap.type = THREE.PCFShadowMap      // 柔和阴影（配合下面的 shadow.radius）
  container.appendChild(renderer.domElement)

  // 3) 正交相机：没有"近大远小"，像工程图纸，看起来就是等轴测风格
  const VIEW = 7 // 画面竖直方向能看到 7 个单位（1 单位 ≈ 1 cm）
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  camera.position.set(8, 9, 10)   // 从右上前方斜着看
  camera.lookAt(0, 0, 0)

  // 4) 灯光：一盏"天光"打底 + 一盏"太阳"负责投影子
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9ccb6, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 2.4)
  sun.position.set(4, 10, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 })
  sun.shadow.radius = 4
  scene.add(sun)

  // 5) 地面：本身透明，只接收影子；再铺一张浅色网格当"方格纸"
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.12 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  const grid = new THREE.GridHelper(60, 120, 0xe6dac6, 0xeee5d6)
  grid.position.y = 0.001
  scene.add(grid)

  // 6) 窗口大小变了，画布和相机跟着变
  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h)
    const aspect = w / h
    const view = Math.max(VIEW, 8.5 / aspect) // 竖屏（手机）时多看一点，保证板子横向放得下
    camera.left = (-view * aspect) / 2
    camera.right = (view * aspect) / 2
    camera.top = view / 2
    camera.bottom = -view / 2
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(container)
  resize()

  // 7) 渲染循环：每秒约 60 次，先让别的模块更新，再画一帧
  const frameJobs = []
  const onFrame = (fn) => frameJobs.push(fn)
  renderer.setAnimationLoop((time) => {
    frameJobs.forEach((fn) => fn(time))
    renderer.render(scene, camera)
  })

  return { scene, camera, renderer, onFrame }
}
