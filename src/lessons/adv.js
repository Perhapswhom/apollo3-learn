// 第 14 课：BLE 广播
export default {
  id: 'adv',
  no: 14,
  title: 'BLE 广播',
  tag: 'BLE',
  stage: '蓝牙',
  lede: '广播就是隔一段时间"喊一嗓子"：把设备名之类的几十个字节，在 3 个广播信道上各发一遍。手机扫描时听到了，就会在列表里显示。Apollo3 Blue 的 BLE 由片上一颗专门的内核管，应用这边只要配好广播内容和间隔，交给协议栈。',
  features: [
    '点"运行"：天线每秒冒一圈波纹，手机列表里出现 Apollo3-Learn',
    '示波器上每秒一根约 3 mA 的高尖峰：这就是射频在发',
    '假设每次广播事件约 3 ms（3 个信道）。射频 3 mA 是 datasheet 值，不含 MCU，实际以实测为准',
  ],
  pins: [
    ['天线', '—', 'BLE 射频直接从 SoC 出，经匹配电路到陶瓷天线'],
  ],
  accessories: ['phone'],
  view: 9.5,
  callouts: [
    { part: 'antenna', dx: 40, dy: -180 },
    { part: 'phone', dx: -40, dy: -230 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "dm_api.h"
#include "app_api.h"

// 协议栈初始化（WSF、HCI、DM……）照 SDK 里的 BLE 例程，这里略

// 广播内容：标志 + 设备名 "Apollo3-Learn"
static const uint8_t advData[] = {
    2,  DM_ADV_TYPE_FLAGS, DM_FLAG_LE_GENERAL_DISC | DM_FLAG_LE_BREDR_NOT_SUP,
    14, DM_ADV_TYPE_LOCAL_NAME, 'A','p','o','l','l','o','3','-','L','e','a','r','n'
};

// 广播间隔：单位 0.625 ms，1600 × 0.625 = 1000 ms
static const appAdvCfg_t advCfg = {
    {    0,    0,    0 },        // 广播持续时间：0 = 一直广播
    { 1600,    0,    0 }         // 广播间隔
};

void adv_start(void)
{
    pAppAdvCfg = (appAdvCfg_t *) &advCfg;
    AppAdvSetData(APP_ADV_DATA_DISCOVERABLE, sizeof(advData), (uint8_t *) advData);
    AppAdvStart(APP_MODE_DISCOVERABLE);
    // 接下来什么都不用管：协议栈每秒自己醒来广播一次，其余时间深睡
}`,

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：用 Zephyr 自己的蓝牙协议栈（Host），控制器是 Apollo3 里的 BLE 内核，中间走 HCI
// prj.conf：CONFIG_BT=y  CONFIG_PM=y
#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>

// 广播内容：标志 + 设备名 "Apollo3-Learn"
static const struct bt_data ad[] = {
    BT_DATA_BYTES(BT_DATA_FLAGS, BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR),
    BT_DATA(BT_DATA_NAME_COMPLETE, "Apollo3-Learn", 13),
};

int main(void)
{
    bt_enable(NULL);                // 打开蓝牙（HCI、控制器初始化都在里面）

    // 广播间隔：单位 0.625 ms，1600 × 0.625 = 1000 ms；第一个参数 0 = 不可连接
    bt_le_adv_start(BT_LE_ADV_PARAM(0, 1600, 1600, NULL), ad, ARRAY_SIZE(ad), NULL, 0);
    // 接下来什么都不用管：控制器每秒自己广播一次，其余时间内核深睡
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "{ 1600,": "1600 × 0.625",
    "AppAdvStart": "bt_le_adv_start",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "BLE advertising",
    tag: "BLE",
    lede: "Advertising means shouting every so often: a few dozen bytes such as the device name, sent once on each of the 3 advertising channels. A scanning phone hears it and lists the device. On Apollo3 Blue a dedicated on-chip core runs BLE; the application only sets the advertising data and interval and hands them to the stack.",
    features: [
      "Press \"Run\": the antenna sends a ripple each second and Apollo3-Learn appears in the phone list",
      "A tall spike of about 3 mA on the scope each second: that's the radio transmitting",
      "Assumes about 3 ms per advertising event (3 channels). The 3 mA radio current is the datasheet value without the MCU; measure the real thing",
    ],
    pins: [
      ["Antenna", "—", "BLE RF comes straight out of the SoC, through the matching network to the ceramic antenna"],
    ],
  },

  // 剧本：每秒一次 3 ms、3 mA 的射频尖峰，手机列表刷新
  behavior(ctx) {
    ctx.power('sleep')
    ctx.line('AppAdvStart')
    ctx.board.setPhone({ title: ctx.tr('扫描中…', 'Scanning…'), lines: [ctx.tr('正在搜索附近设备', 'Looking for devices')] })
    let n = 0
    ctx.every(1000, () => {
      n++
      ctx.power('radio', 3)
      ctx.board.wave()
      const rssi = -58 - Math.round(Math.random() * 6)
      ctx.board.setPhone({
        title: ctx.tr('扫描结果', 'Scan results'),
        lines: ['Apollo3-Learn', ctx.tr(`信号 ${rssi} dBm`, `RSSI ${rssi} dBm`), ctx.tr(`收到广播 ${n} 次`, `${n} adverts heard`), '', ctx.tr('其他设备…', 'Other devices…')],
      })
      ctx.line('{ 1600,')
      ctx.after(400, () => ctx.line('AppAdvStart'))
    })
  },
}
