// 第 16 课：电池服务
export default {
  id: 'bas',
  no: 16,
  title: '标准电池服务',
  tag: 'BLE Profile',
  stage: '蓝牙',
  lede: '蓝牙联盟定义了很多"标准服务"，比如电池服务（Battery Service，UUID 0x180F）。用标准服务的好处是：手机系统和通用 App 不用为你写一行代码就认识它。协议栈带了现成的 BAS 模块，我们只要告诉它"电量怎么读"。',
  features: [
    '点"运行"，拖"电量"滑块（实时）：手机上的电量跟着变',
    '设备定时量电量、有变化就"通知"手机；动画把 30 秒压缩成 2 秒',
    '电量怎么量（ADC 量电池电压，再查放电曲线）这里略',
  ],
  pins: [
    ['电池服务', '0x180F', '蓝牙联盟定义的标准服务，特征值"电量"是 0x2A19'],
  ],
  accessories: ['phone'],
  view: 9.5,
  params: {
    level: { label: '电量', value: 87, min: 0, max: 100, step: 1, unit: '%', live: true },
  },
  callouts: [
    { part: 'phone', dx: -40, dy: -230 },
    { part: 'antenna', dx: 40, dy: -180 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "bas_api.h"
#include "app_hw.h"

uint8_t battery_percent(void);    // 用 ADC 量电池电压、换算成百分比（略）

// 标准电池服务（BAS）的配置
static const basCfg_t basCfg = {
    30,     // 定时器周期：30 秒
    1,      // 每 1 个周期量一次电量
    100     // 电量低于 100% 就通知（等于每次都通知）
};

// 协议栈要读电量时会调用它
void AppHwBattRead(uint8_t *pLevel)
{
    *pLevel = battery_percent();
}

void battery_service_start(wsfHandlerId_t handlerId)
{
    BasInit(handlerId, (basCfg_t *) &basCfg);
}

// 连上手机后：开始定时量电量并通知
void on_connected(dmConnId_t connId)
{
    BasMeasBattStart(connId, BATT_TIMER_IND, BATT_CCC_IDX);
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：电池服务（BAS）Zephyr 自带，打开配置就注册好了
// prj.conf：CONFIG_BT=y  CONFIG_BT_PERIPHERAL=y  CONFIG_BT_BAS=y
#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/uuid.h>
#include <zephyr/bluetooth/services/bas.h>

uint8_t battery_percent(void);    // 用 ADC 量电池电压、换算成百分比（略）

static const struct bt_data ad[] = {
    BT_DATA_BYTES(BT_DATA_FLAGS, BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR),
    BT_DATA_BYTES(BT_DATA_UUID16_ALL, BT_UUID_16_ENCODE(BT_UUID_BAS_VAL)),   // 告诉手机：我有电池服务
};

int main(void)
{
    bt_enable(NULL);
    bt_le_adv_start(BT_LE_ADV_CONN_FAST_1, ad, ARRAY_SIZE(ad), NULL, 0);

    while (1) {
        k_sleep(K_SECONDS(30));                         // 每 30 秒量一次
        bt_bas_set_battery_level(battery_percent());    // 电量变了，自动通知订阅了的手机
    }
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "BasMeasBattStart": "K_SECONDS(30)",
    "*pLevel = battery_percent()": "bt_bas_set_battery_level(battery_percent())",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Standard battery service",
    tag: "BLE Profile",
    lede: "The Bluetooth SIG defines many standard services, such as the Battery Service (UUID 0x180F). The benefit: phone operating systems and generic apps understand it without anyone writing code for your device. The stack ships a ready-made BAS module; we only tell it how to read the battery level.",
    features: [
      "Press \"Run\" and drag the \"Battery level\" slider (live): the level on the phone follows",
      "The device measures periodically and notifies the phone when it changes; the animation squeezes 30 s into 2 s",
      "How to measure the level (ADC on the battery voltage, then a discharge curve) is omitted here",
    ],
    pins: [
      ["Battery service", "0x180F", "A standard SIG service; the \"Battery Level\" characteristic is 0x2A19"],
    ],
    params: { level: "Battery level" },
  },

  // 剧本：已连接；每 2 秒（代表 30 秒）量一次电量并通知手机
  behavior(ctx, p) {
    const draw = (lvl) => ctx.board.setPhone({
      title: 'Apollo3-Learn',
      lines: [ctx.tr('已连接', 'Connected'), ctx.tr('电池服务 0x180F', 'Battery service 0x180F'), ctx.tr(`电量 ${lvl}%`, `Battery ${lvl}%`)],
      button: ctx.tr(`电量 ${lvl}%`, `Battery ${lvl}%`),
      on: lvl > 20,
    })
    ctx.power('sleep')
    ctx.line('BasMeasBattStart')
    draw(p.level)
    ctx.every(100, () => ctx.power('radio', 1))
    ctx.every(2000, () => {
      ctx.line('*pLevel = battery_percent()')
      ctx.power('active', 2)
      ctx.after(300, () => {
        ctx.power('radio', 2)
        ctx.board.wave()
        draw(p.level)
        ctx.line('BasMeasBattStart')
      })
    })
  },
}
