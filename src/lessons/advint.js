// 第 17 课：广播间隔和功耗
export default {
  id: 'advint',
  no: 17,
  title: '广播间隔 vs 续航',
  tag: 'BLE 功耗',
  stage: '蓝牙',
  lede: '广播的平均电流几乎全由"多久喊一次"决定：间隔减半，射频尖峰翻倍，平均电流也差不多翻倍。产品定义时要在"手机多快能发现我"和"电池能用多久"之间取舍，这课让你拖着滑块直接看结果。',
  features: [
    '拖"广播间隔"滑块，看示波器的平均电流和续航',
    '20 ms：手机几乎秒发现，但平均约 450 µA，纽扣电池撑不过一个月',
    '1000 ms：发现慢一点，平均约 10 µA，能用两年多。数字基于"每次 3 ms、3 mA"的假设',
  ],
  pins: [
    ['广播间隔', 'advInterval', '单位 0.625 ms；BLE 规定最小 20 ms'],
  ],
  accessories: ['phone'],
  view: 9.5,
  params: {
    interval: { label: '广播间隔', value: 1000, min: 20, max: 2000, step: 10, unit: 'ms' },
  },
  callouts: [
    { part: 'antenna', dx: 40, dy: -180 },
    { part: 'phone', dx: -40, dy: -230 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "app_api.h"

#define ADV_INTERVAL_MS  {{interval}}

// 广播间隔换成协议栈的单位：1 个单位 = 0.625 ms，所以乘 8/5
static const appAdvCfg_t advCfg = {
    { 0,                         0, 0 },
    { ADV_INTERVAL_MS * 8 / 5,   0, 0 }
};

void adv_start(void)
{
    pAppAdvCfg = (appAdvCfg_t *) &advCfg;
    AppAdvStart(APP_MODE_DISCOVERABLE);
}`,

  // 剧本：按间隔发射频尖峰（每次 3 ms），手机显示"多久能发现"
  behavior(ctx, p) {
    ctx.power('sleep')
    ctx.line('AppAdvStart')
    let n = 0
    ctx.board.setPhone({ title: '扫描中…', lines: ['正在搜索附近设备'] })
    ctx.every(p.interval, () => {
      n++
      ctx.power('radio', 3)
      if (p.interval >= 200 || n % Math.round(200 / p.interval) === 0) ctx.board.wave() // 太快的不每次都画波纹
      if (n === 1 || n % Math.max(1, Math.round(500 / p.interval)) === 0) {
        ctx.board.setPhone({ title: '扫描结果', lines: ['Apollo3-Learn', `广播间隔 ${p.interval} ms`, `已收到 ${n} 次`] })
      }
    })
  },
}
