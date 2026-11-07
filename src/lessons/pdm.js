// 第 18 课：PDM 麦克风
export default {
  id: 'pdm',
  no: 18,
  title: 'PDM 麦克风',
  tag: '音频',
  stage: 'AI 与综合',
  lede: '数字麦克风输出的是 PDM：一串飞快的 0 和 1，1 越密代表声音越大。Apollo3 Blue 有专门的 PDM 硬件，把这串 0/1 变成普通的声音采样（PCM），再用 DMA 搬进内存，CPU 不用一位一位地收。',
  features: [
    '点"运行"，拖"环境声音"滑块（实时），串口的音量条和麦克风光环跟着变',
    '麦克风只要两根线：CLK 由芯片给，DATA 由麦克风回',
    'pdm_read 和 level_bar 两个函数的写法见 SDK 的 pdm_fft 例程',
  ],
  pins: [
    ['PDM CLK', 'AM_BSP_PDM_CLOCK', '芯片给麦克风的时钟，这里配成 1.5 MHz'],
    ['PDM DATA', 'AM_BSP_PDM_DATA', '麦克风送回来的 0/1 数据流'],
  ],
  accessories: ['mic'],
  view: 9,
  params: {
    noise: { label: '环境声音', value: 40, min: 0, max: 100, step: 1, unit: '%', live: true },
  },
  callouts: [
    { part: 'mic', dx: 170, dy: -70 },
    { part: 'soc', title: 'PDM + DMA', text: '硬件把 0/1 变成声音采样，自己搬进内存', dx: 200, dy: -170 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

static void *g_pdm;
static uint32_t g_buf[256];

void pdm_read(uint32_t *buf, uint32_t n);         // 用 DMA 收 n 个采样（见 pdm_fft 例程）
const char *level_bar(uint32_t *buf, uint32_t n);  // 算音量，画成一根条（略）

static am_hal_pdm_config_t cfg = {
    .eClkDivider = AM_HAL_PDM_MCLKDIV_1,
    .eLeftGain = AM_HAL_PDM_GAIN_P225DB,
    .eRightGain = AM_HAL_PDM_GAIN_P225DB,
    .ui32DecimationRate = 64,                     // 1.5 MHz ÷ (64 × 2) ≈ 11.7 kHz 采样率
    .bHighPassEnable = 0,
    .ui32HighPassCutoff = 0xB,
    .ePDMClkSpeed = AM_HAL_PDM_CLK_1_5MHZ,
    .bInvertI2SBCLK = 0,
    .ePDMClkSource = AM_HAL_PDM_INTERNAL_CLK,
    .bPDMSampleDelay = 0,
    .bDataPacking = 1,
    .ePCMChannels = AM_HAL_PDM_CHANNEL_RIGHT,
    .ui32GainChangeDelay = 1,
    .bI2SEnable = 0,
    .bSoftMute = 0,
    .bLRSwap = 0,
};

int main(void)
{
    am_bsp_low_power_init();
    am_bsp_uart_printf_enable();
    am_hal_gpio_pinconfig(AM_BSP_PDM_CLOCK, g_AM_BSP_PDM_CLOCK);
    am_hal_gpio_pinconfig(AM_BSP_PDM_DATA, g_AM_BSP_PDM_DATA);

    am_hal_pdm_initialize(0, &g_pdm);
    am_hal_pdm_power_control(g_pdm, AM_HAL_PDM_POWER_ON, false);
    am_hal_pdm_configure(g_pdm, &cfg);
    am_hal_pdm_enable(g_pdm);

    while (1)
    {
        pdm_read(g_buf, 256);                             // 收一小段声音
        am_util_stdio_printf("%s\\n", level_bar(g_buf, 256));  // 打印音量条
    }
}`,

  // 剧本：每 150 ms 按"环境声音"算一个音量，画成串口里的条
  behavior(ctx, p) {
    ctx.power('active')
    ctx.line('am_hal_pdm_enable')
    ctx.every(150, () => {
      const level = Math.max(0, Math.min(1, p.noise / 100 + (Math.random() - 0.5) * 0.25 * (p.noise / 100 + 0.2)))
      const n = Math.round(level * 20)
      ctx.board.setMic(level)
      ctx.line('level_bar(g_buf')
      ctx.print('▮'.repeat(n) + '▯'.repeat(20 - n) + `  ${String(Math.round(level * 100)).padStart(3)}%`)
    })
  },
}
