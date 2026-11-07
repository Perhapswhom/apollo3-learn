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
