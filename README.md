# Learn Apollo3 Blue（20 课版）

用 3D 板子 + 动画剧本学 Ambiq Apollo3 Blue。Vite + three.js，纯静态网站。

## 跑起来

    npm install
    npm run dev      # 本地预览，改代码自动刷新
    npm run build    # 打包到 dist/，部署用

## 文件地图

    index.html              页面骨架
    src/style.css           全部样式（颜色在最上面的 :root 里改）
    src/main.js             总装：把下面各模块接起来
    src/stage/scene.js      3D 舞台：场景、相机、灯光、渲染循环、setView
    src/stage/board.js      用代码拼的评估板（示意模型）+ 零件说明 PARTS
    src/stage/accessories.js 外接配件：电位器、加速度计、Flash、麦克风、手机、纽扣电池
    src/stage/interact.js   拖动旋转 + 点击零件
    src/stage/callouts.js   标注气泡
    src/ui/info.js          课程标题、简介、引脚表
    src/ui/codePanel.js     代码显示、上色、高亮、参数滑块
    src/ui/runner.js        "运行"按钮背后的剧本引擎
    src/ui/scope.js         电流示波器 + 续航估算
    src/ui/lessonBar.js     底部课程条 + 进度
    src/lessons/*.js        每节课一个文件：文字 + 代码 + 剧本

## 加一节新课

1. 复制一个最像的课程文件，比如要接外设就复制 imu.js
2. 改 id、no、title、stage、lede、code、callouts、behavior
3. 在 src/lessons/index.js 里 import 它，放进 LESSONS 数组

剧本里能用的：ctx.after / every / now / line / led / print / power / onPress / onInput / board

注意：页面上的"运行"是动画演示，不是真的编译。每课代码都要在真板上跑通再上线。
电流数字是按 datasheet 典型值和课程里写明的假设估算的，做对外材料前请换成实测值。
