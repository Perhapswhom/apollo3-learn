// 第 1 课：认识 Apollo3 Blue
export default {
  id: 'meet',
  no: 1,
  title: '认识 Apollo3 Blue',
  tag: '入门',
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
