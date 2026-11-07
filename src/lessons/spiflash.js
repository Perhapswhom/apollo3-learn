// 第 10 课：SPI 读 Flash
export default {
  id: 'spiflash',
  no: 10,
  title: 'SPI 读 Flash',
  tag: 'SPI',
  stage: '外设',
  lede: 'SPI 比 I2C 快，用 4 根线：时钟 SCK、主发从收 MOSI、主收从发 MISO、片选 CS。几乎所有 SPI Flash 都认 0x9F 这条命令：回 3 个字节的 JEDEC ID（厂商、类型、容量）。读对了 ID，就说明线接对了、时序对了。',
  features: [
    '点"运行"：配 IOM0 成 SPI，发 0x9F，打印 ID，然后关掉 IOM 去深睡',
    'EF 40 16 = Winbond、SPI NOR、32 Mbit（4 MB）',
    '用完外设就关电，是低功耗设计的基本功：看示波器最后掉回 1 µA',
  ],
  pins: [
    ['IOM0 SCK/MOSI/MISO/CS', 'am_bsp_iom_pins_enable(0, …)', 'BSP 帮你把 IOM0 的 4 根 SPI 线配好'],
  ],
  accessories: ['flash'],
  view: 9,
  callouts: [
    { part: 'flash', dx: 170, dy: -70 },
    { part: 'headers', title: 'IOM0（SPI）', text: 'SCK、MOSI、MISO、CS', dx: 140, dy: -150 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

static void *g_iom;

int main(void)
{
    am_hal_iom_config_t cfg = {
        .eInterfaceMode = AM_HAL_IOM_SPI_MODE,
        .ui32ClockFreq = AM_HAL_IOM_8MHZ,
        .eSpiMode = AM_HAL_IOM_SPI_MODE_0,
    };
    uint32_t id = 0;
    am_hal_iom_transfer_t rdid = {
        .uPeerInfo.ui32SpiChipSelect = 0,          // 片选 CS0
        .ui32InstrLen = 1, .ui32Instr = 0x9F,      // 0x9F = 读 JEDEC ID
        .ui32NumBytes = 3, .eDirection = AM_HAL_IOM_RX,
        .pui32RxBuffer = &id,
    };

    am_bsp_low_power_init();
    am_bsp_uart_printf_enable();
    am_bsp_iom_pins_enable(0, AM_HAL_IOM_SPI_MODE);     // IOM0 的 4 根 SPI 线
    am_hal_iom_initialize(0, &g_iom);
    am_hal_iom_power_ctrl(g_iom, AM_HAL_SYSCTRL_WAKE, false);
    am_hal_iom_configure(g_iom, &cfg);
    am_hal_iom_enable(g_iom);

    am_hal_iom_blocking_transfer(g_iom, &rdid);
    am_util_stdio_printf("JEDEC ID: %02X %02X %02X\\n",
        id & 0xFF, (id >> 8) & 0xFF, (id >> 16) & 0xFF);

    am_hal_iom_disable(g_iom);                           // 用完就关，省电
    am_hal_iom_power_ctrl(g_iom, AM_HAL_SYSCTRL_DEEPSLEEP, false);
    am_bsp_uart_printf_disable();

    while (1)
    {
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP);
    }
}`,

  // 剧本：一步步配 SPI → 发 0x9F → 打印 → 关电 → 深睡
  behavior(ctx) {
    ctx.power('active')
    ctx.line('iom_pins_enable')
    ctx.after(400, () => ctx.line('am_hal_iom_configure'))
    ctx.after(800, () => {
      ctx.line('blocking_transfer(g_iom, &rdid)')
      ctx.board.act('flash')
    })
    ctx.after(1200, () => {
      ctx.line('JEDEC ID: %02X')
      ctx.print('JEDEC ID: EF 40 16')
    })
    ctx.after(1600, () => ctx.line('am_hal_iom_disable'))
    ctx.after(2000, () => {
      ctx.line('SLEEP_DEEP')
      ctx.power('sleep')
    })
  },
}
