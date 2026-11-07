// 第 12 课：48 vs 96 MHz
export default {
  id: 'turbo',
  no: 12,
  title: '48 还是 96 MHz',
  tag: 'TurboSPOT',
  stage: '低功耗',
  lede: 'Apollo3 Blue 平时跑 48 MHz，需要时可以打开 TurboSPOT 冲到 96 MHz。直觉是"跑得快 = 更费电"，但按 µA/MHz 算：频率翻倍，电流也翻倍，干活时间减半，同一件事耗的电差不多。好处是活干得快一倍、早一点回去睡。',
  features: [
    '把 TurboSPOT 滑块在 0 和 1 之间切换，对比示波器',
    '假设每秒做一次 480 万周期的计算：48 MHz 要 100 ms，96 MHz 只要 50 ms',
    '这里按 6 µA/MHz 线性估算，两种平均电流几乎一样。真实芯片以实测为准',
  ],
  pins: [
    ['LED1', 'AM_BSP_GPIO_LED1', '剧本里用它表示"正在计算"'],
  ],
  params: {
    turbo: { label: 'TurboSPOT', value: 0, min: 0, max: 1, step: 1, unit: '' },
  },
  callouts: [
    { part: 'soc', title: 'TurboSPOT', text: '48 MHz ↔ 96 MHz，按需切换', dx: 200, dy: -200 },
    { part: 'led1', dx: 60, dy: 120 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"

#define USE_TURBO  {{turbo}}        // 1 = 96 MHz TurboSPOT，0 = 48 MHz

void do_work(void);                  // 一段固定的计算，比如一次 FFT（略）

int main(void)
{
    am_hal_burst_avail_e avail;
    am_hal_burst_mode_e  mode;

    am_bsp_low_power_init();
    am_hal_burst_mode_initialize(&avail);

    while (1)
    {
        if (USE_TURBO) am_hal_burst_mode_enable(&mode);    // 切到 96 MHz
        do_work();                                          // 干活
        if (USE_TURBO) am_hal_burst_mode_disable(&mode);   // 回到 48 MHz
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP);   // 睡到下一秒（定时器唤醒写法见第 3 课）
    }
}`,

  // 剧本：每秒干一次活；48 MHz 干 100 ms，96 MHz 干 50 ms
  behavior(ctx, p) {
    const turbo = p.turbo === 1
    const ms = turbo ? 50 : 100
    ctx.power('sleep')
    ctx.line('SLEEP_DEEP')
    ctx.every(1000, () => {
      ctx.power(turbo ? 'turbo' : 'active', ms)
      ctx.led('led1', true)
      ctx.line(turbo ? 'burst_mode_enable' : 'do_work();')
      ctx.after(ms, () => {
        ctx.led('led1', false)
        ctx.line(turbo ? 'burst_mode_disable' : 'SLEEP_DEEP')
      })
      if (turbo) ctx.after(ms + 150, () => ctx.line('SLEEP_DEEP'))
    })
  },
}
