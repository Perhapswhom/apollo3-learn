// 第 5 课：串口命令
export default {
  id: 'uart',
  no: 5,
  title: '串口命令',
  tag: 'UART',
  stage: '入门',
  lede: '电脑通过 J-Link 的虚拟串口给板子发命令：输入 on 灯亮，输入 off 灯灭。板子一个字一个字地收，收到回车就当一条命令去执行。这是调试和产测最常用的"后门"。',
  features: [
    '点"运行"，在串口框下面的输入框里打 on 或 off，按回车',
    '打别的字，板子会回 unknown',
    '注意示波器：一直在等字，CPU 一直醒着。省电版本要用 UART 中断 + 深睡',
  ],
  pins: [
    ['串口 TX/RX', 'AM_BSP_GPIO_COM_UART_TX / RX', '经 J-Link 变成电脑上的 USB 串口'],
    ['LED0', 'AM_BSP_GPIO_LED0', '板载 LED'],
  ],
  serialInput: true,
  callouts: [
    { part: 'jlink', dx: -150, dy: -110 },
    { part: 'led0', dx: 60, dy: 120 },
  ],
  code: `#include <string.h>
#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "am_util.h"

// 执行一条命令
static void run_command(const char *cmd)
{
    if (strcmp(cmd, "on") == 0)
        am_hal_gpio_state_write(AM_BSP_GPIO_LED0, AM_HAL_GPIO_OUTPUT_SET);
    else if (strcmp(cmd, "off") == 0)
        am_hal_gpio_state_write(AM_BSP_GPIO_LED0, AM_HAL_GPIO_OUTPUT_CLEAR);
    else
        am_util_stdio_printf("unknown: %s\\n", cmd);
    am_util_stdio_printf("ok\\n");
}

int main(void)
{
    char line[32];
    uint32_t len = 0, got;
    uint8_t ch;
    am_hal_uart_transfer_t rx = {
        .ui32Direction = AM_HAL_UART_READ,
        .pui8Data = &ch,
        .ui32NumBytes = 1,
        .ui32TimeoutMs = AM_HAL_UART_WAIT_FOREVER,
        .pui32BytesTransferred = &got,
    };

    am_bsp_low_power_init();
    am_hal_gpio_pinconfig(AM_BSP_GPIO_LED0, g_AM_HAL_GPIO_OUTPUT);
    am_bsp_uart_printf_enable();
    am_util_stdio_printf("Type on / off\\n");

    while (1)
    {
        am_bsp_com_uart_transfer(&rx);        // 等一个字（等的时候 CPU 醒着）
        if (ch == '\\r' || ch == '\\n')        // 回车 = 一条命令结束
        {
            line[len] = 0;
            if (len) run_command(line);
            len = 0;
        }
        else if (len < sizeof(line) - 1)
        {
            line[len++] = ch;
        }
    }
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：用 console 子系统，一次读一整行
// prj.conf：CONFIG_CONSOLE_SUBSYS=y  CONFIG_CONSOLE_GETLINE=y
#include <string.h>
#include <zephyr/kernel.h>
#include <zephyr/console/console.h>
#include <zephyr/drivers/gpio.h>

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

// 执行一条命令。直接写电平，高 = 亮，和 HAL 版一致
// （设备树把 LED 标成 ACTIVE_LOW，用 gpio_pin_set_dt 亮灭会反过来）
static void run_command(const char *cmd)
{
    if (strcmp(cmd, "on") == 0)
        gpio_pin_set_raw(led.port, led.pin, 1);
    else if (strcmp(cmd, "off") == 0)
        gpio_pin_set_raw(led.port, led.pin, 0);
    else
        printk("unknown: %s\\n", cmd);
    printk("ok\\n");
}

int main(void)
{
    gpio_pin_configure_dt(&led, GPIO_OUTPUT);
    console_getline_init();
    printk("Type on / off\\n");

    while (1) {
        char *line = console_getline();   // 等一整行（线程睡着等，CPU 能歇）
        if (line[0]) run_command(line);
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "printf_enable": "console_getline_init",
    "com_uart_transfer": "console_getline()",
    "OUTPUT_SET": "set_raw(led.port, led.pin, 1)",
    "OUTPUT_CLEAR": "set_raw(led.port, led.pin, 0)",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Serial commands",
    tag: "UART",
    lede: "The PC sends commands to the board over the J-Link virtual serial port: type on and the LED lights, off and it goes out. The board receives one character at a time and runs a command when Enter arrives. This is the most common \"back door\" for debugging and production test.",
    features: [
      "Press \"Run\", type on or off in the box under the serial output, press Enter",
      "Type anything else and the board replies unknown",
      "Watch the scope: waiting for characters keeps the CPU awake. A low-power version uses UART interrupts + deep sleep",
    ],
    pins: [
      ["UART TX/RX", "AM_BSP_GPIO_COM_UART_TX / RX", "Becomes a USB serial port on the PC via J-Link"],
      ["LED0", "AM_BSP_GPIO_LED0", "On-board LED"],
    ],
  },

  // 剧本：打招呼，然后等用户在输入框里打命令
  behavior(ctx) {
    ctx.power('active')
    ctx.line('printf_enable')
    ctx.after(400, () => {
      ctx.line('Type on / off')
      ctx.print('Type on / off')
    })
    ctx.after(800, () => ctx.line('com_uart_transfer'))
    ctx.onInput((text) => {
      const cmd = text.trim()
      ctx.line('run_command(line)')
      ctx.after(250, () => {
        if (cmd === 'on') { ctx.led('led0', true); ctx.line('OUTPUT_SET') }
        else if (cmd === 'off') { ctx.led('led0', false); ctx.line('OUTPUT_CLEAR') }
        else { ctx.print(`unknown: ${cmd}`); ctx.line('unknown: %s') }
        ctx.print('ok')
      })
      ctx.after(800, () => ctx.line('com_uart_transfer'))
    })
  },
}
