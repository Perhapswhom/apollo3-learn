// 第 1 课：认识 Apollo3 Blue
export default {
  id: 'meet',
  no: 1,
  title: '认识 Apollo3 Blue',
  tag: '入门',
  stage: '入门',
  lede: '板子中间那颗方形芯片就是主角：Cortex-M4F 内核、BLE 5 射频、1 MB Flash 都在里面。它最大的本事是省电：干完活马上睡，睡着只要约 1 µA。',
  features: [
    '点 3D 板子上的零件，看它是干什么的',
    '按"运行"：芯片开机、打一声招呼，然后去睡觉',
    '看下面的电流示波器：醒着和睡着差几百倍',
  ],
  pins: [
    ['串口 TX', 'AM_BSP_GPIO_COM_UART_TX', 'printf 的字从这里出去，经 J-Link 变成电脑上的 USB 串口'],
  ],
  callouts: [
    { part: 'soc', dx: 200, dy: -200 },
    { part: 'antenna', dx: 10, dy: 150 },
    { part: 'xtal', dx: -40, dy: -200 },
    { part: 'jlink', dx: -150, dy: -110 },
    { part: 'led0', dx: 60, dy: 120 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

int main(void)
{
    am_hal_clkgen_control(AM_HAL_CLKGEN_CONTROL_SYSCLK_MAX, 0); // 主频 48 MHz
    am_bsp_low_power_init();        // 关掉板子上用不到的东西
    am_bsp_uart_printf_enable();    // printf 走串口 → J-Link → 电脑

    am_util_stdio_printf("Hello, Apollo3 Blue!\\n");
    am_bsp_uart_printf_disable();   // 说完就关串口，省电

    while (1)
    {
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP); // 没事干就深睡
    }
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版 · west build -b apollo3_evb
// prj.conf：CONFIG_PM=y  CONFIG_PM_DEVICE=y
#include <zephyr/kernel.h>
#include <zephyr/pm/device.h>

int main(void)
{
    // 时钟和低功耗初始化：Zephyr 启动时 soc.c 已经做好，这里不用写
    const struct device *uart = DEVICE_DT_GET(DT_CHOSEN(zephyr_console));

    printk("Hello, Apollo3 Blue!\\n");                      // 控制台 = uart0 → J-Link → 电脑
    pm_device_action_run(uart, PM_DEVICE_ACTION_SUSPEND);  // 说完就关串口，省电

    while (1) {
        k_sleep(K_FOREVER);         // 没事干就睡：内核空闲时自动进深睡
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "clkgen_control": "时钟和低功耗初始化",
    "low_power_init": "时钟和低功耗初始化",
    "printf_enable": "DT_CHOSEN(zephyr_console)",
    "stdio_printf": "printk(",
    "printf_disable": "PM_DEVICE_ACTION_SUSPEND",
    "SLEEP_DEEP": "K_FOREVER",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Meet Apollo3 Blue",
    tag: "Basics",
    lede: "The square chip in the middle of the board is the star: Cortex-M4F core, BLE 5 radio and 1 MB of flash all live inside. Its biggest talent is saving power: it finishes its work, sleeps right away, and draws only about 1 µA while asleep.",
    features: [
      "Click parts on the 3D board to see what they do",
      "Press \"Run\": the chip boots, says hello, then goes to sleep",
      "Watch the current scope below: awake and asleep differ by hundreds of times",
    ],
    pins: [
      ["UART TX", "AM_BSP_GPIO_COM_UART_TX", "printf text leaves here and reaches the PC as a USB serial port via J-Link"],
    ],
  },

  // 剧本：真实开机只要几毫秒，这里放慢到每步 0.4 秒，方便看清
  behavior(ctx) {
    ctx.power('active')
    ctx.line('clkgen_control')
    ctx.after(400, () => ctx.line('low_power_init'))
    ctx.after(800, () => ctx.line('printf_enable'))
    ctx.after(1200, () => {
      ctx.line('stdio_printf')
      ctx.print('Hello, Apollo3 Blue!')
    })
    ctx.after(1600, () => ctx.line('printf_disable'))
    ctx.after(2000, () => {
      ctx.line('SLEEP_DEEP')
      ctx.power('sleep')
    })
  },
}
