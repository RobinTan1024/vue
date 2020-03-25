/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 
 * 响应式数据是观察者模式的实现。被观察者存储着观察者的引用，当被观察者发生变更时，将主动告知观察者（一种松耦合）
 * dep 是被观察者保存的观察者的引用集合
 * 
 * ps：发布订阅模式与观察者模式非常相似，区别在于发布者与订阅者是完全不耦合的，发布的消息是由第三方实现来推送给订阅者。
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      /* 看起来是观察者收集了依赖，但实际上 addDep 的实现还是依赖于被观察者的 add/remove。本质上还是被观察者持有观察者的引用 */
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      /**
       * 排序是为了确保观察者能够按顺序更新
       * 因为被观察者是 props/data ，而观察者是 computed/watch ，并且 watch 也可以侦听 computed
       * 这就要求在 watch 更新前，computed 先完成更新
       * 由于在组件初始化时，是按照 computed > watch 的顺序初始化的，每个 Watcher 都有一个递增的 id
       * 下方排序的 id 就是 watcher.id，因此 watch 的 id 一定比 computed 的大
       * 因此可以根据大小来按顺序把被观察者的改动通知观察者
       */
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

/* 表示当前有观察者，要触发被观察者的 getter 并收集依赖 */
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
