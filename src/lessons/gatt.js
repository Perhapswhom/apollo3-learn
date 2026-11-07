// 第 15 课：手机遥控 LED
export default {
  id: 'gatt',
  no: 15,
  title: '手机遥控 LED',
  tag: 'BLE GATT',
  stage: '蓝牙',
  lede: '连上以后，手机和板子靠 GATT 说话：板子提供"服务"，服务里有"特征值"，像一排带编号的信箱。手机往 LED 特征值里写 1 或 0，协议栈就调用我们的回调函数，回调里开关 LED。',
  features: [
    '点"运行"，再点 3D 手机：每点一次，手机写一次特征值，LED0 翻转',
    '连着的时候，双方每个"连接间隔"碰一次头：示波器上是一串小尖峰',
    '假设连接间隔 100 ms、每次碰头 1 ms、射频 3 mA。间隔越长越省电，但响应越慢',
  ],
  pins: [
    ['LED0', 'AM_BSP_GPIO_LED0', '被手机遥控的灯'],
    ['LED 特征值', 'LED_HDL', '自定义服务里的一个可写特征值（句柄号示意）'],
  ],
  accessories: ['phone'],
  view: 9.5,
  callouts: [
    { part: 'phone', title: '手机（点我）', text: '每点一次 = 写一次 LED 特征值', dx: -40, dy: -230 },
    { part: 'led0', dx: 60, dy: 120 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"
#include "att_api.h"

#define LED_HDL  0x0030          // LED 特征值的句柄（服务定义略）

// 手机写特征值时，协议栈调用这个函数
static uint8_t ledWriteCback(dmConnId_t connId, uint16_t handle, uint8_t operation,
                             uint16_t offset, uint16_t len, uint8_t *pValue, attsAttr_t *pAttr)
{
    if (handle == LED_HDL && len >= 1)
    {
        am_hal_gpio_state_write(AM_BSP_GPIO_LED0,
            pValue[0] ? AM_HAL_GPIO_OUTPUT_SET : AM_HAL_GPIO_OUTPUT_CLEAR);
    }
    return ATT_SUCCESS;
}

// 把服务挂到协议栈上：属性表 ledList 的定义略
static attsGroup_t ledGroup = {
    NULL, (attsAttr_t *) ledList, NULL, ledWriteCback, LED_START_HDL, LED_END_HDL
};

void led_service_start(void)
{
    am_hal_gpio_pinconfig(AM_BSP_GPIO_LED0, g_AM_HAL_GPIO_OUTPUT);
    AttsAddGroup(&ledGroup);
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：用宏定义一个自定义服务，手机写特征值时调 led_write
// prj.conf：CONFIG_BT=y  CONFIG_BT_PERIPHERAL=y
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gatt.h>

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

// 自己的 128 位 UUID（随便生成一个，和手机 App 对上就行）
#define LED_SVC  BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0xa3b10001, 0x7c2e, 0x4b8f, 0x9d61, 0x2f5e8c1a0b3d))
#define LED_CHR  BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0xa3b10002, 0x7c2e, 0x4b8f, 0x9d61, 0x2f5e8c1a0b3d))

// 手机写特征值时，协议栈调用这个函数
static ssize_t led_write(struct bt_conn *conn, const struct bt_gatt_attr *attr,
                         const void *buf, uint16_t len, uint16_t offset, uint8_t flags)
{
    if (len >= 1) {
        gpio_pin_set_raw(led.port, led.pin, ((const uint8_t *)buf)[0] ? 1 : 0);
    }
    return len;
}

// 把服务登记进属性表：编译时就挂好，不用像 HAL 版那样手动 AttsAddGroup
BT_GATT_SERVICE_DEFINE(led_svc,
    BT_GATT_PRIMARY_SERVICE(LED_SVC),
    BT_GATT_CHARACTERISTIC(LED_CHR, BT_GATT_CHRC_WRITE, BT_GATT_PERM_WRITE, NULL, led_write, NULL),
);

static const struct bt_data ad[] = {
    BT_DATA_BYTES(BT_DATA_FLAGS, BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR),
    BT_DATA(BT_DATA_NAME_COMPLETE, "Apollo3-Learn", 13),
};

int main(void)
{
    gpio_pin_configure_dt(&led, GPIO_OUTPUT);
    bt_enable(NULL);
    bt_le_adv_start(BT_LE_ADV_CONN_FAST_1, ad, ARRAY_SIZE(ad), NULL, 0);   // 可连接的广播
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "static uint8_t ledWriteCback": "static ssize_t led_write",
    "pValue[0] ?": "[0] ? 1 : 0",
    "AttsAddGroup": "BT_GATT_SERVICE_DEFINE(",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Control the LED from a phone",
    tag: "BLE GATT",
    lede: "Once connected, the phone and the board talk GATT: the board offers \"services\" that contain \"characteristics\", like a row of numbered mailboxes. The phone writes 1 or 0 into the LED characteristic, the stack calls our callback, and the callback switches the LED.",
    features: [
      "Press \"Run\", then click the 3D phone: each click writes the characteristic once and LED0 toggles",
      "While connected, both sides meet once every \"connection interval\": a train of small spikes on the scope",
      "Assumes a 100 ms connection interval, 1 ms per meeting and 3 mA radio. Longer intervals save power but respond slower",
    ],
    pins: [
      ["LED0", "AM_BSP_GPIO_LED0", "The LED the phone controls"],
      ["LED characteristic", "LED_HDL", "A writable characteristic in a custom service (handle number illustrative)"],
    ],
    callouts: [
      { title: "Phone (click me)", text: "Each click = one write to the LED characteristic" },
    ],
  },

  // 剧本：已连接，每 100 ms 碰一次头；点手机 = 写特征值
  behavior(ctx) {
    let on = false
    const draw = () => ctx.board.setPhone({
      title: 'Apollo3-Learn',
      lines: [ctx.tr('已连接', 'Connected'), ctx.tr('LED 服务', 'LED service'), ctx.tr('特征值：', 'Value: ') + (on ? '01' : '00')],
      button: on ? ctx.tr('LED：开', 'LED: on') : ctx.tr('LED：关', 'LED: off'),
      on,
    })
    ctx.power('sleep')
    ctx.line('AttsAddGroup')
    draw()
    ctx.every(100, () => ctx.power('radio', 1))
    ctx.onPress('phone', () => {
      on = !on
      ctx.power('radio', 2)
      ctx.board.wave()
      ctx.line('static uint8_t ledWriteCback')
      ctx.after(250, () => {
        ctx.led('led0', on)
        ctx.line('pValue[0] ?')
        draw()
      })
    })
  },
}
