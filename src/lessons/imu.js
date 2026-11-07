// 第 9 课：I2C 读加速度计
export default {
  id: 'imu',
  no: 9,
  title: 'I2C 读加速度计',
  tag: 'I2C',
  stage: '外设',
  lede: 'I2C 只要两根线（SCL 时钟、SDA 数据），一条总线能挂很多个器件，靠"地址"区分。Apollo3 里管 I2C/SPI 的硬件叫 IOM。这课用 IOM1 读一颗 LIS2DH12 三轴加速度计：先写寄存器把它打开，再连续读 6 个字节拿到 X、Y、Z。',
  features: [
    '拖"倾斜角度"滑块（实时），3D 模块跟着倾斜，X 和 Z 读数此消彼长',
    '平放时 Z 约等于 1 g（≈ 250），竖起来 X 约等于 1 g',
    '寄存器地址和数值以 LIS2DH12 数据手册为准，换别的传感器要改',
  ],
  pins: [
    ['IOM1 SCL/SDA', 'am_bsp_iom_pins_enable(1, …)', 'BSP 帮你把 IOM1 的两根 I2C 线配好'],
    ['I2C 地址', '0x19', 'LIS2DH12 的 SA0 脚接高时是 0x19，接低是 0x18'],
  ],
  accessories: ['imu'],
  view: 9,
  params: {
    tilt: { label: '倾斜角度', value: 0, min: -90, max: 90, step: 1, unit: '°', live: true },
    rate: { label: '读取间隔', value: 200, min: 100, max: 1000, step: 50, unit: 'ms' },
  },
  callouts: [
    { part: 'imu', dx: 170, dy: -70 },
    { part: 'headers', title: 'IOM1（I2C）', text: 'SCL、SDA 两根线 + 电源地', dx: 140, dy: -150 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

#define IMU_ADDR  0x19          // LIS2DH12 的 I2C 地址（SA0 接高）
static void *g_iom;

// 写一个寄存器
static void imu_write(uint8_t reg, uint8_t val)
{
    uint32_t data = val;
    am_hal_iom_transfer_t t = {
        .uPeerInfo.ui32I2CDevAddr = IMU_ADDR,
        .ui32InstrLen = 1, .ui32Instr = reg,
        .ui32NumBytes = 1, .eDirection = AM_HAL_IOM_TX,
        .pui32TxBuffer = &data,
    };
    am_hal_iom_blocking_transfer(g_iom, &t);
}

// 从 reg 开始连续读 len 个字节
static void imu_read(uint8_t reg, uint32_t *buf, uint32_t len)
{
    am_hal_iom_transfer_t t = {
        .uPeerInfo.ui32I2CDevAddr = IMU_ADDR,
        .ui32InstrLen = 1, .ui32Instr = reg | 0x80,      // 最高位 1 = 地址自动加一
        .ui32NumBytes = len, .eDirection = AM_HAL_IOM_RX,
        .pui32RxBuffer = buf,
    };
    am_hal_iom_blocking_transfer(g_iom, &t);
}

int main(void)
{
    am_hal_iom_config_t cfg = {
        .eInterfaceMode = AM_HAL_IOM_I2C_MODE,
        .ui32ClockFreq = AM_HAL_IOM_400KHZ,
    };
    uint32_t buf[2];
    int16_t *xyz = (int16_t *)buf;

    am_bsp_low_power_init();
    am_bsp_uart_printf_enable();
    am_bsp_iom_pins_enable(1, AM_HAL_IOM_I2C_MODE);      // IOM1 的 SCL/SDA
    am_hal_iom_initialize(1, &g_iom);
    am_hal_iom_power_ctrl(g_iom, AM_HAL_SYSCTRL_WAKE, false);
    am_hal_iom_configure(g_iom, &cfg);
    am_hal_iom_enable(g_iom);

    imu_write(0x20, 0x57);                               // CTRL_REG1：100 Hz，打开 X/Y/Z

    while (1)
    {
        imu_read(0x28, buf, 6);                          // OUT_X_L 起连读 6 字节
        am_util_stdio_printf("x=%5d y=%5d z=%5d\\n",      // 普通模式 10 位，左对齐 → 右移 6
            xyz[0] >> 6, xyz[1] >> 6, xyz[2] >> 6);
        am_util_delay_ms({{rate}});
    }
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：LIS2DH12 有现成驱动，走 sensor API，不用自己读写寄存器
// app.overlay（apollo3_evb.dts 里的 I2C 预留在 IOM3：GPIO42 SCL / GPIO43 SDA）：
//   &i2c3 { status = "okay";
//     lis2dh12@19 { compatible = "st,lis2dh12", "st,lis2dh"; reg = <0x19>; }; };
// prj.conf：CONFIG_I2C=y  CONFIG_SENSOR=y  CONFIG_LIS2DH=y
#include <zephyr/kernel.h>
#include <zephyr/drivers/sensor.h>

int main(void)
{
    const struct device *imu = DEVICE_DT_GET_ONE(st_lis2dh);
    struct sensor_value acc[3];

    if (!device_is_ready(imu)) return 0;     // 驱动初始化时已经写好 CTRL_REG1（ODR 在 Kconfig 里配）

    while (1) {
        sensor_sample_fetch(imu);                              // 从 OUT_X_L 起连读 6 字节
        sensor_channel_get(imu, SENSOR_CHAN_ACCEL_XYZ, acc);   // 已换算成 m/s²
        printk("x=%6d y=%6d z=%6d mm/s2\\n", (int)sensor_value_to_milli(&acc[0]),
               (int)sensor_value_to_milli(&acc[1]), (int)sensor_value_to_milli(&acc[2]));
        k_msleep({{rate}});
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "imu_write(0x20": "device_is_ready(imu)",
    "imu_read(0x28": "sensor_sample_fetch",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Read an accelerometer over I2C",
    tag: "I2C",
    lede: "I2C needs just two wires (SCL clock, SDA data), and one bus can hold many devices told apart by address. Apollo3's I2C/SPI hardware is called IOM. This lesson uses IOM1 to read a LIS2DH12 3-axis accelerometer: write a register to turn it on, then read 6 bytes in a row to get X, Y and Z.",
    features: [
      "Drag the \"Tilt angle\" slider (live): the 3D module tilts and X and Z trade places",
      "Lying flat, Z is about 1 g (≈ 250); standing up, X is about 1 g",
      "Register addresses and values come from the LIS2DH12 datasheet; change them for other sensors",
    ],
    pins: [
      ["IOM1 SCL/SDA", "am_bsp_iom_pins_enable(1, …)", "The BSP sets up IOM1's two I2C wires for you"],
      ["I2C address", "0x19", "0x19 with the LIS2DH12 SA0 pin high, 0x18 when low"],
    ],
    params: { tilt: "Tilt angle", rate: "Read interval" },
    callouts: [
      {},
      { title: "IOM1 (I2C)", text: "SCL, SDA + power and ground" },
    ],
  },

  // 剧本：按倾斜角度算出 X/Z（1 g ≈ 250），模块在 3D 里跟着倾斜
  behavior(ctx, p) {
    ctx.power('active')
    ctx.line('imu_write(0x20')
    const noise = () => Math.round((Math.random() - 0.5) * 6)
    ctx.every(p.rate, () => {
      const a = (p.tilt * Math.PI) / 180
      ctx.board.setTilt(a)
      ctx.board.act('imu')
      const x = Math.round(250 * Math.sin(a)) + noise()
      const z = Math.round(250 * Math.cos(a)) + noise()
      ctx.line('imu_read(0x28')
      ctx.print(`x=${String(x).padStart(5)} y=${String(noise()).padStart(5)} z=${String(z).padStart(5)}`)
    })
  },
}
