// 第 20 课：智能戒指原型
export default {
  id: 'ring',
  no: 20,
  title: '智能戒指原型',
  tag: '综合项目',
  stage: 'AI 与综合',
  lede: '把前面学的拼起来：每秒醒一次读加速度计数步（第 9 课），每 5 秒用 BLE 把步数通知手机（第 15 课），其余时间深睡（第 3 课）。戒指里只塞得下几十 mAh 的小电池，这课的续航按 20 mAh 算。',
  features: [
    '点"运行"：加速度计模块随走路晃动，手机上的步数每 5 秒更新',
    '示波器：每秒一根小尖峰（读传感器），每 5 秒一根射频尖峰（通知），加上每秒一次连接碰头',
    '平均约 6 µA，20 mAh 大约能撑 4 个多月。想更久：把通知间隔拉长，或步数攒多了再发',
  ],
  pins: [
    ['IOM1（I2C）', 'am_bsp_iom_pins_enable(1, …)', '接加速度计'],
    ['BLE', '—', '已连接，连接间隔按 1 秒假设'],
  ],
  accessories: ['imu', 'phone'],
  view: 9.5,
  battery: 20,
  batteryName: '20 mAh 电池',
  callouts: [
    { part: 'imu', dx: 0, dy: 100 },
    { part: 'phone', dx: 60, dy: -250 },
    { part: 'soc', dx: -60, dy: -230 },
  ],
  code: `#include "am_mcu_apollo.h"
#include "am_bsp.h"

static uint32_t steps, sec;
static uint32_t xyz[2];

// 每 1 秒：读加速度、数步；每 5 秒：通知手机
void am_stimer_cmpr0_isr(void)
{
    am_hal_stimer_int_clear(AM_HAL_STIMER_INT_COMPAREA);
    am_hal_stimer_compare_delta_set(0, 32768);   // 下一秒再叫我
    imu_read(0x28, xyz, 6);                      // 第 9 课：读加速度
    steps += step_detect(xyz);                   // 简单计步算法（略）
    if (++sec % 5 == 0)
        notify_steps(steps);                     // 第 15 课：BLE 通知手机
}

int main(void)
{
    am_bsp_low_power_init();
    imu_init();                                  // 第 9 课
    ble_init();                                  // 第 14、15 课
    stimer_init_1s();                            // 第 3 课
    am_hal_interrupt_master_enable();

    while (1)
    {
        am_hal_sysctrl_sleep(AM_HAL_SYSCTRL_SLEEP_DEEP);
    }
}`,

  // 剧本：每秒读传感器（2 ms），每秒连接碰头（1 ms 射频），每 5 秒通知（3 ms 射频）
  behavior(ctx) {
    let steps = 0
    let sec = 0
    const draw = () => ctx.board.setPhone({ title: '我的戒指', lines: ['已连接', `今日步数 ${steps}`, `第 ${sec} 秒`], button: `${steps} 步`, on: true })
    ctx.power('sleep')
    ctx.line('SLEEP_DEEP')
    draw()
    const t0 = ctx.now()
    ctx.every(60, () => ctx.board.setTilt(0.35 * Math.sin((ctx.now() - t0) / 180))) // 走路时手在晃
    ctx.every(1000, () => {
      sec++
      steps += 1 + Math.round(Math.random())
      ctx.power('active', 2)
      ctx.power('radio', 1)
      ctx.board.act('imu')
      ctx.line('step_detect')
      if (sec % 5 === 0) {
        ctx.after(200, () => {
          ctx.power('radio', 3)
          ctx.board.wave()
          ctx.line('notify_steps')
          draw()
        })
      }
      ctx.after(500, () => ctx.line('SLEEP_DEEP'))
    })
  },
}
