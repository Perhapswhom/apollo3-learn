// 第 13 课：电池能撑多久
export default {
  id: 'battery',
  no: 13,
  title: '电池能撑多久',
  tag: '续航计算',
  stage: '低功耗',
  lede: '绝大多数电池设备都是同一个结构：醒一下、干点活、睡很久。续航只看两个数：每次醒多久、多久醒一次。平均电流 ≈ 1 µA + 288 µA × 醒的时间 ÷ 周期，续航 = 电池容量 ÷ 平均电流。',
  features: [
    '拖两个滑块，看示波器右边的"平均"和"续航"怎么变',
    '醒 5 ms、每秒一次：平均约 2.4 µA，220 mAh 的纽扣电池超过 10 年（实际受电池自放电限制）',
    '醒 100 ms、每 100 ms 一次（一直醒着）：288 µA，一个月左右就没电',
  ],
  pins: [
    ['CR2032', '—', '3 V 纽扣电池，标称约 220 mAh'],
  ],
  accessories: ['battery'],
  view: 9,
  params: {
    period: { label: '多久醒一次', value: 1000, min: 100, max: 2000, step: 100, unit: 'ms' },
    awake: { label: '每次醒多久', value: 5, min: 1, max: 100, step: 1, unit: 'ms' },
  },
  callouts: [
    { part: 'battery', dx: 170, dy: -60 },
    { part: 'soc', dx: 200, dy: -170 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"

// 绝大多数电池设备的骨架：醒一下 → 干活 → 睡很久
#define PERIOD_MS  {{period}}       // 多久醒一次
#define AWAKE_MS   {{awake}}        // 每次醒多久

void timer_init(uint32_t ms);       // 定时器每 ms 毫秒叫醒一次（写法见第 3 课）
void do_work(uint32_t ms);          // 醒来要干的活（读传感器、算一算、发数据）

int main(void)
{
    am_bsp_low_power_init();
    timer_init(PERIOD_MS);

    while (1)
    {
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP);   // 睡
        do_work(AWAKE_MS);                                  // 醒来干活
    }
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：骨架一样，"睡"交给内核
// prj.conf：CONFIG_PM=y
#include <zephyr/kernel.h>

#define PERIOD_MS  {{period}}       // 多久醒一次
#define AWAKE_MS   {{awake}}        // 每次醒多久

void do_work(uint32_t ms);          // 醒来要干的活（读传感器、算一算、发数据）

int main(void)
{
    while (1) {
        k_msleep(PERIOD_MS);         // 睡（内核空闲 → 深睡）
        do_work(AWAKE_MS);           // 醒来干活
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "SLEEP_DEEP": "k_msleep(PERIOD_MS)",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "How long will the battery last",
    tag: "Battery life",
    lede: "Nearly every battery device has the same structure: wake briefly, do some work, sleep for a long time. Battery life depends on just two numbers: how long each wake lasts and how often it happens. Average current ≈ 1 µA + 288 µA × awake time ÷ period; battery life = capacity ÷ average current.",
    features: [
      "Drag the two sliders and watch \"average\" and \"life\" on the right of the scope",
      "Awake 5 ms once a second: about 2.4 µA average, over 10 years on a 220 mAh coin cell (in practice limited by self-discharge)",
      "Awake 100 ms every 100 ms (always awake): 288 µA, flat in about a month",
    ],
    pins: [
      ["CR2032", "—", "3 V coin cell, about 220 mAh nominal"],
    ],
    params: { period: "Wake every", awake: "Awake for" },
  },

  // 剧本：按两个滑块的值，睡 / 醒交替
  behavior(ctx, p) {
    ctx.power('sleep')
    ctx.line('SLEEP_DEEP')
    ctx.every(p.period, () => {
      ctx.power('active', p.awake)
      ctx.led('led0', true)
      ctx.line('do_work(AWAKE_MS)')
      ctx.after(Math.min(p.period / 2, Math.max(120, p.awake)), () => {
        ctx.led('led0', false)
        ctx.line('SLEEP_DEEP')
      })
    })
  },
}
