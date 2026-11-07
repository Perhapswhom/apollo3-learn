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

  // 第 18 步：Zephyr 写法（代码区可以切换）
  zephyr: `// Zephyr 版：内核定时器每秒叫醒一次；读传感器、计步、通知放进工作队列里做（不在中断里干重活）
// prj.conf：CONFIG_BT=y  CONFIG_BT_PERIPHERAL=y  CONFIG_SENSOR=y  CONFIG_LIS2DH=y  CONFIG_PM=y
#include <zephyr/kernel.h>
#include <zephyr/drivers/sensor.h>
#include <zephyr/bluetooth/bluetooth.h>

static uint32_t steps, sec;
static const struct device *imu = DEVICE_DT_GET_ONE(st_lis2dh);   // 第 9 课的 overlay

uint32_t step_detect(struct sensor_value *acc);   // 简单计步算法（略）
void notify_steps(uint32_t n);                    // bt_gatt_notify(...)：第 15 课的服务加一个 NOTIFY 特征

// 每 1 秒：读加速度、数步；每 5 秒：通知手机
static void tick(struct k_work *work)
{
    struct sensor_value acc[3];

    sensor_sample_fetch(imu);                             // 第 9 课：读加速度
    sensor_channel_get(imu, SENSOR_CHAN_ACCEL_XYZ, acc);
    steps += step_detect(acc);
    if (++sec % 5 == 0)
        notify_steps(steps);                              // 第 15 课：BLE 通知手机
}
K_WORK_DEFINE(tick_work, tick);

static void on_timer(struct k_timer *t) { k_work_submit(&tick_work); }
K_TIMER_DEFINE(tick_timer, on_timer, NULL);

int main(void)
{
    bt_enable(NULL);                                          // 第 14、15 课
    k_timer_start(&tick_timer, K_SECONDS(1), K_SECONDS(1));   // 第 3 课的"闹钟"，Zephyr 版
    k_sleep(K_FOREVER);                                       // 其余时间内核深睡
    return 0;
}`,
  // 剧本高亮 HAL 版某一行时，Zephyr 版改高亮哪一行（没列出的就找同样的字）
  zephyrLines: {
    "step_detect": "steps += step_detect",
    "notify_steps": "notify_steps(steps)",
    "SLEEP_DEEP": "K_FOREVER",
  },

  // 第 19 步：英文版（英文模式下盖掉上面的中文；没写的字段沿用中文）
  en: {
    title: "Smart ring prototype",
    tag: "Project",
    lede: "Put it all together: wake every second to read the accelerometer and count steps (lesson 9), send the step count to the phone over BLE every 5 s (lesson 15), deep-sleep the rest of the time (lesson 3). A ring only fits a battery of a few tens of mAh, so this lesson assumes 20 mAh.",
    batteryName: "20 mAh cell",
    features: [
      "Press \"Run\": the accelerometer sways as you walk and the step count on the phone updates every 5 s",
      "Scope: a small spike each second (sensor read), a radio spike every 5 s (notify), plus a connection event each second",
      "Average about 6 µA, roughly 4 months on 20 mAh. For longer: notify less often, or batch steps before sending",
    ],
    pins: [
      ["IOM1 (I2C)", "am_bsp_iom_pins_enable(1, …)", "Connects the accelerometer"],
      ["BLE", "—", "Connected; connection interval assumed to be 1 s"],
    ],
  },

  // 剧本：每秒读传感器（2 ms），每秒连接碰头（1 ms 射频），每 5 秒通知（3 ms 射频）
  behavior(ctx) {
    let steps = 0
    let sec = 0
    const draw = () => ctx.board.setPhone({
      title: ctx.tr('我的戒指', 'My ring'),
      lines: [ctx.tr('已连接', 'Connected'), ctx.tr(`今日步数 ${steps}`, `Steps today ${steps}`), ctx.tr(`第 ${sec} 秒`, `${sec} s`)],
      button: ctx.tr(`${steps} 步`, `${steps} steps`),
      on: true,
    })
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
