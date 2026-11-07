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
