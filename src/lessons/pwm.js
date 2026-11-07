// 第 6 课：呼吸灯
export default {
  id: 'pwm',
  no: 6,
  title: '呼吸灯',
  tag: 'PWM',
  stage: '外设',
  lede: 'LED 只有亮和灭两种状态，"半亮"是靠飞快地开关骗过眼睛：一个周期里亮的时间占比越大，看起来越亮。这叫 PWM。Apollo3 用 CTIMER 定时器硬件来开关，CPU 只负责隔一会儿改一下占比。',
  features: [
    '拖"呼吸周期"滑块，LED 呼吸变快或变慢',
    '代码高亮在"变亮"和"变暗"两个循环之间来回切',
    '换板子时注意：LED 引脚要能复用成 CTIMER 输出，查引脚复用表',
  ],
  pins: [
    ['LED0', 'AM_BSP_GPIO_LED0', '这里当 CTIMER0 A 段的 PWM 输出脚（示意）'],
  ],
  params: {
    breath: { label: '呼吸周期', value: 2000, min: 500, max: 5000, step: 100, unit: 'ms' },
  },
  callouts: [
    { part: 'led0', dx: 60, dy: 120 },
    { part: 'xtal', dx: -40, dy: -200 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

#define PERIOD  64          // 一个 PWM 周期 = 64 拍（32.768 kHz 时钟）

int main(void)
{
    am_bsp_low_power_init();

    // 用 CTIMER0 的 A 段做 PWM，输出到 LED0 的引脚
    am_hal_ctimer_config_single(0, AM_HAL_CTIMER_TIMERA,
        AM_HAL_CTIMER_FN_PWM_REPEAT | AM_HAL_CTIMER_XT_32_768KHZ);
    am_hal_ctimer_output_config(0, AM_HAL_CTIMER_TIMERA, AM_BSP_GPIO_LED0,
        AM_HAL_CTIMER_OUTPUT_NORMAL, AM_HAL_GPIO_PIN_DRIVESTRENGTH_2MA);
    am_hal_ctimer_start(0, AM_HAL_CTIMER_TIMERA);

    while (1)
    {
        for (int i = 1; i < PERIOD; i++)          // 慢慢变亮
        {
            am_hal_ctimer_period_set(0, AM_HAL_CTIMER_TIMERA, PERIOD, i);
            am_util_delay_ms({{breath}} / 2 / PERIOD);
        }
        for (int i = PERIOD - 1; i > 0; i--)      // 再慢慢变暗
        {
            am_hal_ctimer_period_set(0, AM_HAL_CTIMER_TIMERA, PERIOD, i);
            am_util_delay_ms({{breath}} / 2 / PERIOD);
        }
    }
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：用设备树别名 pwm-led0。apollo3_evb.dts 里它默认关着，接的是 GPIO30（LED1）
// app.overlay：&timer2 { status = "okay"; };  &pwm2 { status = "okay"; };  &pwmleds { status = "okay"; };
// prj.conf：CONFIG_PWM=y。PWM 周期用设备树里写的 20 ms，嫌闪就在 overlay 里改小
#include <zephyr/kernel.h>
#include <zephyr/drivers/pwm.h>

#define STEPS  64

static const struct pwm_dt_spec led = PWM_DT_SPEC_GET(DT_ALIAS(pwm_led0));

int main(void)
{
    while (1) {
        for (int i = 1; i < STEPS; i++) {          // 慢慢变亮
            pwm_set_pulse_dt(&led, led.period / STEPS * i);
            k_msleep({{breath}} / 2 / STEPS);
        }
        for (int i = STEPS - 1; i > 0; i--) {      // 再慢慢变暗
            pwm_set_pulse_dt(&led, led.period / STEPS * i);
            k_msleep({{breath}} / 2 / STEPS);
        }
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "ctimer_start": "PWM_DT_SPEC_GET",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Breathing LED",
    tag: "PWM",
    lede: "An LED is either on or off; \"half bright\" fools the eye by switching very fast. The larger the on-time share of each period, the brighter it looks. That is PWM. Apollo3 switches the pin with CTIMER hardware; the CPU only adjusts the share now and then.",
    features: [
      "Drag the \"Breath period\" slider to speed up or slow down the breathing",
      "The code highlight bounces between the \"brighter\" and \"dimmer\" loops",
      "On another board, check that the pin can be muxed to a CTIMER output",
    ],
    pins: [
      ["LED0", "AM_BSP_GPIO_LED0", "Used here as the CTIMER0 segment A PWM output (illustrative)"],
    ],
    params: { breath: "Breath period" },
  },

  // 剧本：亮度按三角波变化；delay_ms 是空转，CPU 一直醒着
  behavior(ctx, p) {
    ctx.power('active')
    ctx.line('ctimer_start')
    const t0 = ctx.now()
    let rising = null
    ctx.every(30, () => {
      const ph = ((ctx.now() - t0) % p.breath) / p.breath // 0~1
      const up = ph < 0.5
      ctx.led('led0', up ? ph * 2 : 2 - ph * 2)
      if (up !== rising) {
        rising = up
        ctx.line(up ? '慢慢变亮' : '慢慢变暗')
      }
    })
  },
}
