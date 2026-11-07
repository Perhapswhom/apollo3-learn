// 第 2 课：点亮 LED
export default {
  id: 'blink',
  no: 2,
  title: '点亮 LED',
  tag: 'GPIO',
  stage: '入门',
  lede: '把 LED0 所在的 GPIO 设成输出，每隔一段时间翻转一次。注意 am_util_delay_ms 是"原地空转"：等待的时候芯片一直醒着，电一直在用。',
  features: [
    '拖动"闪烁间隔"滑块，代码里的数字跟着变',
    '运行后看示波器：电流一直停在高位',
    '第 3 课会用"睡觉 + 闹钟"把它降下来',
  ],
  pins: [
    ['LED0', 'AM_BSP_GPIO_LED0', '板载 LED，输出高电平点亮'],
  ],
  params: {
    period: { label: '闪烁间隔', value: 500, min: 100, max: 2000, step: 100, unit: 'ms' },
  },
  callouts: [
    { part: 'led0', dx: 60, dy: 120 },
    { part: 'soc', dx: 200, dy: -200 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

int main(void)
{
    am_hal_clkgen_control(AM_HAL_CLKGEN_CONTROL_SYSCLK_MAX, 0);
    am_bsp_low_power_init();
    am_hal_gpio_pinconfig(AM_BSP_GPIO_LED0, g_AM_HAL_GPIO_OUTPUT);

    while (1)
    {
        am_hal_gpio_state_write(AM_BSP_GPIO_LED0, AM_HAL_GPIO_OUTPUT_TOGGLE);
        am_util_delay_ms({{period}});   // 空转等待：芯片一直醒着
    }
}`,

  // 剧本：p.period 就是滑块的值
  behavior(ctx, p) {
    let on = false
    ctx.power('active') // delay_ms 是空转，芯片从头到尾都醒着
    ctx.line('pinconfig')
    ctx.every(p.period, () => {
      on = !on
      ctx.led('led0', on)
      ctx.line('state_write')
      ctx.after(Math.min(150, p.period / 2), () => ctx.line('delay_ms'))
    })
  },
}
