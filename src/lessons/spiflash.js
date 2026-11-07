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

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：SPI Flash 用通用的 spi-nor 驱动，读 JEDEC ID 有现成函数
// app.overlay（apollo3_evb.dts 里 SPI 预留在 IOM0，片选是 GPIO11）：
//   &spi0 { status = "okay";
//     w25q32: flash@0 { compatible = "jedec,spi-nor"; reg = <0>; spi-max-frequency = <8000000>;
//       jedec-id = [ef 40 16]; size = <DT_SIZE_M(32)>; }; };      // size 的单位是 bit
// prj.conf：CONFIG_SPI=y  CONFIG_FLASH=y  CONFIG_SPI_NOR=y  CONFIG_FLASH_JESD216_API=y  CONFIG_PM_DEVICE=y
#include <zephyr/kernel.h>
#include <zephyr/drivers/flash.h>
#include <zephyr/pm/device.h>

int main(void)
{
    const struct device *flash = DEVICE_DT_GET(DT_NODELABEL(w25q32));
    uint8_t id[3];

    flash_read_jedec_id(flash, id);                   // 发 0x9F，收 3 个字节
    printk("JEDEC ID: %02X %02X %02X\\n", id[0], id[1], id[2]);

    pm_device_action_run(flash, PM_DEVICE_ACTION_SUSPEND);   // 用完就让 Flash 进掉电模式
    k_sleep(K_FOREVER);
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "iom_pins_enable": "DEVICE_DT_GET(DT_NODELABEL(w25q32))",
    "am_hal_iom_configure": "DEVICE_DT_GET(DT_NODELABEL(w25q32))",
    "blocking_transfer(g_iom, &rdid)": "flash_read_jedec_id",
    "am_hal_iom_disable": "PM_DEVICE_ACTION_SUSPEND",
    "SLEEP_DEEP": "K_FOREVER",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Read SPI flash",
    tag: "SPI",
    lede: "SPI is faster than I2C and uses 4 wires: clock SCK, MOSI (controller out), MISO (controller in) and chip select CS. Almost every SPI flash answers command 0x9F with a 3-byte JEDEC ID (maker, type, size). Read the right ID and you know the wiring and timing are right.",
    features: [
      "Press \"Run\": IOM0 becomes SPI, 0x9F goes out, the ID is printed, then IOM shuts down and the chip deep-sleeps",
      "EF 40 16 = Winbond, SPI NOR, 32 Mbit (4 MB)",
      "Powering peripherals off after use is basic low-power practice: watch the scope drop back to 1 µA",
    ],
    pins: [
      ["IOM0 SCK/MOSI/MISO/CS", "am_bsp_iom_pins_enable(0, …)", "The BSP sets up IOM0's 4 SPI wires for you"],
    ],
    callouts: [
      {},
      { title: "IOM0 (SPI)", text: "SCK, MOSI, MISO, CS" },
    ],
  },

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
