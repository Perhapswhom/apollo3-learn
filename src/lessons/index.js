// 课程目录：以后加新课，就是在这里多 import 一行、数组里多放一个
import meet from './meet.js'
import blink from './blink.js'
import sleep from './sleep.js'
import button from './button.js'
import uart from './uart.js'
import pwm from './pwm.js'
import adc from './adc.js'
import temp from './temp.js'
import imu from './imu.js'
import spiflash from './spiflash.js'
import rtc from './rtc.js'
import turbo from './turbo.js'
import battery from './battery.js'
import adv from './adv.js'
import gatt from './gatt.js'
import bas from './bas.js'
import advint from './advint.js'
import pdm from './pdm.js'
import kws from './kws.js'
import ring from './ring.js'

export const LESSONS = [
  meet, blink, sleep, button, uart,       // 入门
  pwm, adc, temp, imu, spiflash,          // 外设
  rtc, turbo, battery,                    // 低功耗
  adv, gatt, bas, advint,                 // 蓝牙
  pdm, kws, ring,                         // AI 与综合
]
