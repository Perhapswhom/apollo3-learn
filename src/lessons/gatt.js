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

  // 剧本：已连接，每 100 ms 碰一次头；点手机 = 写特征值
  behavior(ctx) {
    let on = false
    const draw = () => ctx.board.setPhone({
      title: 'Apollo3-Learn',
      lines: ['已连接', 'LED 服务', '特征值：' + (on ? '01' : '00')],
      button: on ? 'LED：开' : 'LED：关',
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
