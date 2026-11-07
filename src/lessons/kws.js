// 第 19 课：关键词识别
export default {
  id: 'kws',
  no: 19,
  title: '听懂 yes / no',
  tag: '边缘 AI',
  stage: 'AI 与综合',
  lede: '用 TensorFlow Lite Micro 的 micro_speech 小模型，在芯片上直接听懂"yes"和"no"，不联网。做法：每隔一小段时间，把最近 1 秒的声音变成一张"声纹图"（频谱），喂给模型，模型打分说这是 yes、no 还是别的。',
  features: [
    '点"运行"，再点麦克风模块：等于对着它说了一个词（yes 和 no 轮流）',
    '听到 yes 绿灯（LED1）亮，听到 no 红灯（LED2）亮',
    '假设每 100 ms 推理一次、每次醒 20 ms。函数名以 TFLM 的 micro_speech 例程为准',
  ],
  pins: [
    ['LED1 / LED2', 'AM_BSP_GPIO_LED1 / LED2', '绿灯 = yes，红灯 = no'],
  ],
  accessories: ['mic'],
  view: 9,
  callouts: [
    { part: 'mic', title: 'PDM 麦克风（点我说话）', text: '点一次 = 说一个词', dx: 190, dy: 10 },
    { part: 'led1', dx: -60, dy: -170 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "recognize_commands.h"

// 每 100 ms 跑一次：声音 → 特征 → 模型 → 判断是哪个词
void loop(int32_t now_ms)
{
    feature_provider->PopulateFeatureData(now_ms);   // 最近 1 秒声音 → 频谱特征
    interpreter->Invoke();                            // 模型推理

    const char *found;
    uint8_t score;
    bool is_new;
    recognizer->ProcessLatestResults(output, now_ms, &found, &score, &is_new);

    if (is_new && strcmp(found, "yes") == 0)
        am_hal_gpio_state_write(AM_BSP_GPIO_LED1, AM_HAL_GPIO_OUTPUT_SET);   // 绿灯
    if (is_new && strcmp(found, "no") == 0)
        am_hal_gpio_state_write(AM_BSP_GPIO_LED2, AM_HAL_GPIO_OUTPUT_SET);   // 红灯
}`,

  // 剧本：每 100 ms 醒 20 ms 推理；点麦克风 = 说一个词
  behavior(ctx) {
    let say = 'yes'
    ctx.power('sleep')
    ctx.line('interpreter->Invoke()')
    ctx.every(100, () => {
      ctx.power('active', 20)
      ctx.board.setMic(0.08 + Math.random() * 0.06)
    })
    ctx.onPress('mic', () => {
      const word = say
      say = say === 'yes' ? 'no' : 'yes'
      ctx.board.setMic(0.9)
      ctx.line('PopulateFeatureData')
      ctx.after(400, () => ctx.line('interpreter->Invoke()'))
      ctx.after(800, () => {
        ctx.print(`heard: ${word}`)
        ctx.line(word === 'yes' ? 'LED1, AM_HAL' : 'LED2, AM_HAL')
        ctx.led(word === 'yes' ? 'led1' : 'led2', true)
        ctx.led(word === 'yes' ? 'led2' : 'led1', false)
      })
      ctx.after(2200, () => ctx.led(word === 'yes' ? 'led1' : 'led2', false))
    })
  },
}
