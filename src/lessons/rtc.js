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

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：RTC 有通用 API；"每秒醒一次"交给内核定时器最省事
// app.overlay：&rtc0 { status = "okay"; };   prj.conf：CONFIG_RTC=y  CONFIG_PM=y
// 想严格对齐整秒：用 rtc_alarm_set_time + rtc_alarm_set_callback（CONFIG_RTC_ALARM=y）
#include <zephyr/kernel.h>
#include <zephyr/drivers/rtc.h>

static const struct device *rtc = DEVICE_DT_GET(DT_NODELABEL(rtc0));

int main(void)
{
    struct rtc_time t = { .tm_year = 126, .tm_mon = 10, .tm_mday = 7,   // 先对个时：2026-11-07
                          .tm_hour = 9, .tm_min = 30, .tm_sec = 0 };   // （年从 1900 起，月从 0 起）
    rtc_set_time(rtc, &t);

    while (1) {
        k_sleep(K_SECONDS(1));                    // 睡 1 秒（内核用 STIMER 叫醒）
        rtc_get_time(rtc, &t);
        printk("%02d:%02d:%02d\\n", t.tm_hour, t.tm_min, t.tm_sec);
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "am_hal_rtc_time_get": "rtc_get_time",
    "SLEEP_DEEP": "K_SECONDS(1)",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "RTC clock",
    tag: "Low power",
    lede: "The RTC is the chip's wristwatch: it keeps time from the 32.768 kHz crystal and never stops, even in deep sleep. Set the time, then an alarm that repeats every second, and the chip can wake each second, glance at the time, print a line and go straight back to sleep. Watches and data loggers all work this way.",
    features: [
      "Press \"Run\": the time prints every second and the scope shows a spike each second",
      "The script assumes each print wake takes 2 ms (sending 9 characters takes about 1 ms)",
      "Average about 1.6 µA: a bit more than lesson 3 because each wake is longer",
    ],
    pins: [
      ["32.768 kHz", "AM_HAL_RTC_OSC_XT", "The RTC uses the external crystal, far more accurate than the internal RC oscillator"],
    ],
    callouts: [
      { title: "The RTC's \"heartbeat\"", text: "32.768 kHz crystal, keeps ticking in deep sleep" },
    ],
  },

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
