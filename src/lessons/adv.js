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

  // 剧本：每秒一次 3 ms、3 mA 的射频尖峰，手机列表刷新
  behavior(ctx) {
    ctx.power('sleep')
    ctx.line('AppAdvStart')
    ctx.board.setPhone({ title: '扫描中…', lines: ['正在搜索附近设备'] })
    let n = 0
    ctx.every(1000, () => {
      n++
      ctx.power('radio', 3)
      ctx.board.wave()
      const rssi = -58 - Math.round(Math.random() * 6)
      ctx.board.setPhone({ title: '扫描结果', lines: ['Apollo3-Learn', `信号 ${rssi} dBm`, `收到广播 ${n} 次`, '', '其他设备…'] })
      ctx.line('{ 1600,')
      ctx.after(400, () => ctx.line('AppAdvStart'))
    })
  },
}
