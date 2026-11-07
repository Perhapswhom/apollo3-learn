// 第 3 课：让芯片睡觉
export default {
  id: 'sleep',
  no: 3,
  title: '让芯片睡觉',
  tag: '低功耗',
  stage: '入门',
  lede: '同样是闪灯，这次不空转：设好一个"闹钟"（STIMER，靠 32.768 kHz 晶振计时）就去深睡，闹钟响了醒来翻转 LED，再接着睡。醒着的时间极短，平均电流掉到几 µA。',
  features: [
    '和第 2 课对比：同样闪灯，示波器的平均电流差 100 倍以上',
    '把"闹钟间隔"调大，平均电流更低、续航更长',
    '剧本假设每次醒来干活 1 ms（真实往往更短）',
  ],
  pins: [
    ['LED0', 'AM_BSP_GPIO_LED0', '板载 LED'],
    ['32.768 kHz', 'XT（晶振）', 'STIMER 的时钟源，深睡时也在走'],
  ],
  params: {
    period: { label: '闹钟间隔', value: 500, min: 100, max: 2000, step: 100, unit: 'ms' },
  },
  callouts: [
    { part: 'xtal', dx: -40, dy: -200 },
    { part: 'led0', dx: 60, dy: 120 },
    { part: 'jumper', dx: -170, dy: 40 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"

#define WAKE_MS  {{period}}
#define TICKS    (WAKE_MS * 32768 / 1000)   // 32.768 kHz 时钟走多少下

// 闹钟响了：清标志 → 定下一个闹钟 → 翻转 LED
void am_stimer_cmpr0_isr(void)
{
    am_hal_stimer_int_clear(AM_HAL_STIMER_INT_COMPAREA);
    am_hal_stimer_compare_delta_set(0, TICKS);
    am_hal_gpio_state_write(AM_BSP_GPIO_LED0, AM_HAL_GPIO_OUTPUT_TOGGLE);
}

int main(void)
{
    am_bsp_low_power_init();
    am_hal_gpio_pinconfig(AM_BSP_GPIO_LED0, g_AM_HAL_GPIO_OUTPUT);

    am_hal_stimer_int_enable(AM_HAL_STIMER_INT_COMPAREA);
    NVIC_EnableIRQ(STIMER_CMPR0_IRQn);
    am_hal_stimer_config(AM_HAL_STIMER_CFG_CLEAR | AM_HAL_STIMER_CFG_FREEZE);
    am_hal_stimer_compare_delta_set(0, TICKS);
    am_hal_stimer_config(AM_HAL_STIMER_XTAL_32KHZ | AM_HAL_STIMER_CFG_COMPARE_A_ENABLE);
    am_hal_interrupt_master_enable();

    while (1)
    {
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP); // 睡！等闹钟
    }
}`,

  // 剧本：大部分时间在睡，每个周期醒来 1 ms
  behavior(ctx, p) {
    let on = false
    ctx.power('sleep')
    ctx.line('SLEEP_DEEP')
    ctx.every(p.period, () => {
      on = !on
      ctx.power('active', 1) // 醒 1 ms 的尖峰
      ctx.led('led0', on)
      ctx.line('OUTPUT_TOGGLE')
      ctx.after(Math.min(250, p.period / 2), () => ctx.line('SLEEP_DEEP'))
    })
  },
}
