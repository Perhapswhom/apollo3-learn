// 第 7 课：读电位器
export default {
  id: 'adc',
  no: 7,
  title: '读电位器',
  tag: 'ADC',
  stage: '外设',
  lede: 'ADC 把电压变成数字：Apollo3 Blue 的 ADC 是 14 位，0 V 读成 0，参考电压读成 16383。电位器就是一个能拧的分压器，拧到哪，送进来的电压就是多少。',
  features: [
    '点"运行"，拖"旋钮位置"滑块，3D 旋钮跟着转，串口读数跟着变',
    '这个滑块是"实时"的：拖动时剧本不重启',
    '内部参考 2.0 V：电位器两端接 GND 和 2.0 V，超过的电压读不出来',
  ],
  pins: [
    ['ADC SE0', 'AM_HAL_ADC_SLOT_CHSEL_SE0', '单端输入通道 0，引脚要先复用成模拟输入（见 SDK 的 adc 例程）'],
  ],
  accessories: ['pot'],
  view: 9,
  params: {
    pos: { label: '旋钮位置', value: 30, min: 0, max: 100, step: 1, unit: '%', live: true },
  },
  callouts: [
    { part: 'pot', dx: 170, dy: -60 },
    { part: 'soc', dx: 200, dy: -170 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

static void *g_adc;

// 把 ADC 配成：单端输入 SE0、14 位精度、软件触发
static void adc_init(void)
{
    am_hal_adc_config_t cfg = {
        .eClock = AM_HAL_ADC_CLKSEL_HFRC,
        .ePolarity = AM_HAL_ADC_TRIGPOL_RISING,
        .eTrigger = AM_HAL_ADC_TRIGSEL_SOFTWARE,
        .eReference = AM_HAL_ADC_REFSEL_INT_2P0,
        .eClockMode = AM_HAL_ADC_CLKMODE_LOW_LATENCY,
        .ePowerMode = AM_HAL_ADC_LPMODE0,
        .eRepeat = AM_HAL_ADC_SINGLE_SCAN,
    };
    am_hal_adc_slot_config_t slot = {
        .eMeasToAvg = AM_HAL_ADC_SLOT_AVG_1,
        .ePrecisionMode = AM_HAL_ADC_SLOT_14BIT,
        .eChannel = AM_HAL_ADC_SLOT_CHSEL_SE0,
        .bWindowCompare = false,
        .bEnabled = true,
    };
    am_hal_adc_initialize(0, &g_adc);
    am_hal_adc_power_control(g_adc, AM_HAL_SYSCTRL_WAKE, false);
    am_hal_adc_configure(g_adc, &cfg);
    am_hal_adc_configure_slot(g_adc, 0, &slot);
    am_hal_adc_enable(g_adc);
}

int main(void)
{
    uint32_t n = 1;
    am_hal_adc_sample_t s;

    am_bsp_low_power_init();
    am_bsp_uart_printf_enable();
    adc_init();

    while (1)
    {
        am_hal_adc_sw_trigger(g_adc);                         // 量一次
        am_util_delay_ms(1);
        am_hal_adc_samples_read(g_adc, false, NULL, &n, &s);  // 取结果
        uint32_t raw = s.ui32Sample;                          // 0 ~ 16383（细节以 SDK 例程为准）
        uint32_t mv = raw * 2000 / 16383;                     // 内部参考 2.0 V
        am_util_stdio_printf("ADC=%5u  %4u mV\\n", raw, mv);
        am_util_delay_ms(200);
    }
}`,

  // 剧本：每 200 ms 按旋钮位置算一个读数（加一点点噪声，像真的一样）
  behavior(ctx, p) {
    ctx.power('active')
    ctx.line('adc_init();')
    ctx.every(200, () => {
      ctx.board.setKnob(p.pos / 100)
      const raw = Math.max(0, Math.min(16383, Math.round((p.pos / 100) * 16383 + (Math.random() - 0.5) * 8)))
      const mv = Math.round((raw * 2000) / 16383)
      ctx.line('samples_read')
      ctx.print(`ADC=${String(raw).padStart(5)}  ${String(mv).padStart(4)} mV`)
    })
  },
}
