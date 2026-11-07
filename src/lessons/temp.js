// 第 8 课：片上温度
export default {
  id: 'temp',
  no: 8,
  title: '片上温度',
  tag: '传感器',
  stage: '外设',
  lede: 'SoC 里自带一个温度传感器，不用外接任何零件：把 ADC 的通道换成 TEMP 就能量。产品简介写的精度是校正后约 ±3 °C，够做"太热就降频、报警"这类保护，不适合当精密温度计。',
  features: [
    '拖"环境温度"滑块（实时），串口读数跟着变',
    '超过"报警温度"，红色 LED2 亮起',
    '电压换算成摄氏度要用芯片里的出厂校准值，公式照 SDK 的 adc_vbatt 例程',
  ],
  pins: [
    ['TEMP', 'AM_HAL_ADC_SLOT_CHSEL_TEMP', 'ADC 的内部通道，接芯片里的温度传感器'],
    ['LED2', 'AM_BSP_GPIO_LED2', '过温报警灯'],
  ],
  params: {
    room: { label: '环境温度', value: 25, min: -10, max: 70, step: 1, unit: '°C', live: true },
    alarm: { label: '报警温度', value: 45, min: 30, max: 60, step: 1, unit: '°C' },
  },
  callouts: [
    { part: 'soc', title: '片上温度传感器', text: '在 SoC 里面，校正后精度约 ±3 °C', dx: 200, dy: -200 },
    { part: 'led2', dx: 60, dy: 120 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

static void *g_adc;
float temp_from_volts(float v);   // 电压 → 摄氏度（含出厂校准，见 SDK 的 adc_vbatt 例程）

// ADC 通道换成芯片内部的温度传感器，其余配置同第 7 课
static void adc_init_temp(void)
{
    am_hal_adc_slot_config_t slot = {
        .eMeasToAvg = AM_HAL_ADC_SLOT_AVG_128,           // 量 128 次取平均，读数更稳
        .ePrecisionMode = AM_HAL_ADC_SLOT_14BIT,
        .eChannel = AM_HAL_ADC_SLOT_CHSEL_TEMP,
        .bWindowCompare = false,
        .bEnabled = true,
    };
    // ……ADC 初始化和第 7 课一样，这里略
    am_hal_adc_configure_slot(g_adc, 0, &slot);
    am_hal_adc_enable(g_adc);
}

int main(void)
{
    uint32_t n = 1;
    am_hal_adc_sample_t s;

    am_bsp_low_power_init();
    am_bsp_uart_printf_enable();
    am_hal_gpio_pinconfig(AM_BSP_GPIO_LED2, g_AM_HAL_GPIO_OUTPUT);
    adc_init_temp();

    while (1)
    {
        am_hal_adc_sw_trigger(g_adc);
        am_util_delay_ms(1);
        am_hal_adc_samples_read(g_adc, false, NULL, &n, &s);

        float c = temp_from_volts(s.ui32Sample * 2.0f / 16383);
        am_util_stdio_printf("Temp = %.1f C\\n", c);
        am_hal_gpio_state_write(AM_BSP_GPIO_LED2,
            c > {{alarm}} ? AM_HAL_GPIO_OUTPUT_SET : AM_HAL_GPIO_OUTPUT_CLEAR);
        am_util_delay_ms(1000);
    }
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：Zephyr 主线还没有 Apollo3 片上温度传感器的驱动，这里直接调 Ambiq HAL
// adc0 在设备树里保持关闭（不然 Zephyr 的 ADC 驱动会先占住它），HAL 的 ADC 文件自己加进编译：
// CMakeLists.txt：target_sources(app PRIVATE \${ZEPHYR_HAL_AMBIQ_MODULE_DIR}/mcu/apollo3/hal/am_hal_adc.c)
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <am_mcu_apollo.h>

static const struct gpio_dt_spec led2 = GPIO_DT_SPEC_GET(DT_ALIAS(led2), gpios);
void *g_adc;                      // adc_init_temp() 里初始化
void adc_init_temp(void);         // 和 HAL 版完全一样（am_hal_adc_* 那一段）
float temp_from_volts(float v);   // 电压 → 摄氏度（含出厂校准，见 SDK 的 adc_vbatt 例程）

int main(void)
{
    uint32_t n = 1;
    am_hal_adc_sample_t s;

    gpio_pin_configure_dt(&led2, GPIO_OUTPUT);
    adc_init_temp();

    while (1) {
        am_hal_adc_sw_trigger(g_adc);
        k_msleep(1);
        am_hal_adc_samples_read(g_adc, false, NULL, &n, &s);

        float c = temp_from_volts(s.ui32Sample * 2.0f / 16383);
        printk("Temp = %d.%d C\\n", (int)c, (int)(c * 10) % 10);  // printk 不带浮点，拆成整数打印
        gpio_pin_set_raw(led2.port, led2.pin, c > {{alarm}});    // 超过报警温度：LED2 亮
        k_msleep(1000);
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "Temp = %.1f C": "Temp = %d.%d C",
    "state_write(AM_BSP_GPIO_LED2": "set_raw(led2.port",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "On-chip temperature",
    tag: "Sensor",
    lede: "The SoC has a built-in temperature sensor, no extra parts needed: switch the ADC channel to TEMP and measure. The product brief quotes about ±3 °C after calibration: good enough for \"too hot, slow down or alarm\" protection, not for a precision thermometer.",
    features: [
      "Drag the \"Ambient temperature\" slider (live) and the serial reading follows",
      "Above the \"Alarm temperature\", the red LED2 lights",
      "Converting volts to °C needs the chip's factory trim; follow the SDK adc_vbatt example",
    ],
    pins: [
      ["TEMP", "AM_HAL_ADC_SLOT_CHSEL_TEMP", "Internal ADC channel wired to the on-chip temperature sensor"],
      ["LED2", "AM_BSP_GPIO_LED2", "Over-temperature alarm LED"],
    ],
    params: { room: "Ambient temperature", alarm: "Alarm temperature" },
    callouts: [
      { title: "On-chip temperature sensor", text: "Inside the SoC, about ±3 °C after calibration" },
    ],
  },

  // 剧本：每秒按"环境温度"出一个读数（芯片比环境略热一点，再加 ±0.3 °C 的抖动）
  behavior(ctx, p) {
    ctx.power('active')
    ctx.line('adc_init_temp();')
    const tick = () => {
      const c = p.room + 1.5 + (Math.random() - 0.5) * 0.6
      ctx.line('Temp = %.1f C')
      ctx.print(`Temp = ${c.toFixed(1)} C`)
      ctx.led('led2', c > p.alarm)
      ctx.after(300, () => ctx.line('state_write(AM_BSP_GPIO_LED2'))
    }
    ctx.after(300, tick)
    ctx.every(1000, tick)
  },
}
