// 第 4 课：按键唤醒
export default {
  id: 'button',
  no: 4,
  title: '按键唤醒',
  tag: 'GPIO 中断',
  stage: '入门',
  lede: '芯片一直深睡，有人按 BTN0 才醒。按键接在 GPIO 上，配成"中断"：电平一变，硬件自动把芯片叫醒，跑一下中断函数翻转 LED，再接着睡。整个过程 CPU 只醒一眨眼。',
  features: [
    '点"运行"，再点 3D 板子上的 BTN0 按键',
    '每按一次，示波器上冒一根尖峰，LED0 翻转一次',
    '不按的时候电流贴着 1 µA，这就是"事件驱动"的省电写法',
  ],
  pins: [
    ['BTN0', 'AM_BSP_GPIO_BUTTON0', '板载按键，用 BSP 里预设的输入 + 中断配置'],
    ['LED0', 'AM_BSP_GPIO_LED0', '板载 LED'],
  ],
  callouts: [
    { part: 'btn0', dx: -60, dy: -170 },
    { part: 'led0', dx: 60, dy: 120 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"

// 按键中断：BTN0 一动就进这里
void am_gpio_isr(void)
{
    uint64_t status;
    am_hal_gpio_interrupt_status_get(false, &status);
    am_hal_gpio_interrupt_clear(status);
    am_hal_gpio_state_write(AM_BSP_GPIO_LED0, AM_HAL_GPIO_OUTPUT_TOGGLE);
}

int main(void)
{
    am_bsp_low_power_init();
    am_hal_gpio_pinconfig(AM_BSP_GPIO_LED0, g_AM_HAL_GPIO_OUTPUT);

    // BTN0：按 BSP 里预设的方式配成输入 + 中断
    am_hal_gpio_pinconfig(AM_BSP_GPIO_BUTTON0, g_AM_BSP_GPIO_BUTTON0);
    am_hal_gpio_interrupt_clear(AM_HAL_GPIO_BIT(AM_BSP_GPIO_BUTTON0));
    am_hal_gpio_interrupt_enable(AM_HAL_GPIO_BIT(AM_BSP_GPIO_BUTTON0));
    NVIC_EnableIRQ(GPIO_IRQn);
    am_hal_interrupt_master_enable();

    while (1)
    {
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP); // 睡到有人按键
    }
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：按键用设备树别名 sw0（BTN0）
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>

static const struct gpio_dt_spec btn = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);
static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);
static struct gpio_callback btn_cb;

// 按键中断：BTN0 一按就进这里（中断标志 Zephyr 已经替你清了）
static void on_press(const struct device *dev, struct gpio_callback *cb, uint32_t pins)
{
    gpio_pin_toggle_dt(&led);
}

int main(void)
{
    gpio_pin_configure_dt(&led, GPIO_OUTPUT);
    gpio_pin_configure_dt(&btn, GPIO_INPUT);
    gpio_pin_interrupt_configure_dt(&btn, GPIO_INT_EDGE_TO_ACTIVE);
    gpio_init_callback(&btn_cb, on_press, BIT(btn.pin));
    gpio_add_callback(btn.port, &btn_cb);

    k_sleep(K_FOREVER);             // 睡到有人按键
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "am_gpio_isr": "static void on_press",
    "OUTPUT_TOGGLE": "gpio_pin_toggle_dt",
    "SLEEP_DEEP": "K_FOREVER",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Wake on button",
    tag: "GPIO interrupt",
    lede: "The chip deep-sleeps until someone presses BTN0. The button sits on a GPIO set up as an interrupt: when the level changes, hardware wakes the chip, the interrupt handler toggles the LED, and it goes back to sleep. The CPU is awake for only a blink.",
    features: [
      "Press \"Run\", then click the BTN0 button on the 3D board",
      "Each press makes a spike on the scope and toggles LED0",
      "Between presses the current hugs 1 µA: this is the power-saving \"event-driven\" style",
    ],
    pins: [
      ["BTN0", "AM_BSP_GPIO_BUTTON0", "On-board button, using the BSP preset input + interrupt config"],
      ["LED0", "AM_BSP_GPIO_LED0", "On-board LED"],
    ],
  },

  // 剧本：一直睡；用户点 BTN0 就醒 1 ms、翻转 LED
  behavior(ctx) {
    let on = false
    ctx.power('sleep')
    ctx.line('SLEEP_DEEP')
    ctx.onPress('btn0', () => {
      on = !on
      ctx.power('active', 1)
      ctx.led('led0', on)
      ctx.line('am_gpio_isr')
      ctx.after(200, () => ctx.line('OUTPUT_TOGGLE'))
      ctx.after(500, () => ctx.line('SLEEP_DEEP'))
    })
  },
}
