// 第 11 课：RTC 时钟
export default {
  id: 'rtc',
  no: 11,
  title: 'RTC 时钟',
  tag: '低功耗',
  stage: '低功耗',
  lede: 'RTC 是芯片里的"电子表"：靠 32.768 kHz 晶振走时，深睡也不停。设好时间，再设一个"每秒闹一次"，芯片就能每秒醒来看一眼时间、打印一行，然后马上接着睡。手表、记录仪都是这个套路。',
  features: [
    '点"运行"：串口每秒打印一次时间，示波器每秒一根尖峰',
    '剧本假设每次醒来打印要 2 ms（串口发 9 个字大约 1 ms）',
    '平均电流约 1.6 µA：比第 3 课多一点，因为每次醒的时间更长',
  ],
  pins: [
    ['32.768 kHz', 'AM_HAL_RTC_OSC_XT', 'RTC 用外部晶振，比内部 RC 振荡器准得多'],
  ],
  callouts: [
    { part: 'xtal', title: 'RTC 的"心跳"', text: '32.768 kHz 晶振，深睡也在走', dx: -40, dy: -200 },
    { part: 'jlink', dx: -150, dy: -110 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

am_hal_rtc_time_t t;

// 每秒闹一次：醒来打印时间，然后接着睡
void am_rtc_isr(void)
{
    am_hal_rtc_int_clear(AM_HAL_RTC_INT_ALM);
    am_hal_rtc_time_get(&t);
    am_bsp_uart_printf_enable();
    am_util_stdio_printf("%02d:%02d:%02d\\n", t.ui32Hour, t.ui32Minute, t.ui32Second);
    am_bsp_uart_printf_disable();
}

int main(void)
{
    am_bsp_low_power_init();
    am_hal_clkgen_control(AM_HAL_CLKGEN_CONTROL_XTAL_START, 0);
    am_hal_rtc_osc_select(AM_HAL_RTC_OSC_XT);            // RTC 用 32.768 kHz 晶振
    am_hal_rtc_osc_enable();

    t.ui32Hour = 9;  t.ui32Minute = 30;  t.ui32Second = 0;  // 先对个时
    t.ui32Hundredths = 0;
    am_hal_rtc_time_set(&t);                              // （日期字段略）

    am_hal_rtc_alarm_interval_set(AM_HAL_RTC_ALM_RPT_SEC);  // 每秒闹一次
    am_hal_rtc_int_clear(AM_HAL_RTC_INT_ALM);
    am_hal_rtc_int_enable(AM_HAL_RTC_INT_ALM);
    NVIC_EnableIRQ(RTC_IRQn);
    am_hal_interrupt_master_enable();

    while (1)
    {
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP);
    }
}`,

  // 剧本：从 09:30:00 开始，每秒醒 2 ms 打印一次
  behavior(ctx) {
    let sec = 9 * 3600 + 30 * 60
    const two = (n) => String(n).padStart(2, '0')
    ctx.power('sleep')
    ctx.line('SLEEP_DEEP')
    ctx.every(1000, () => {
      sec++
      ctx.power('active', 2)
      ctx.line('am_hal_rtc_time_get')
      ctx.print(`${two(Math.floor(sec / 3600) % 24)}:${two(Math.floor(sec / 60) % 60)}:${two(sec % 60)}`)
      ctx.after(300, () => ctx.line('SLEEP_DEEP'))
    })
  },
}
