/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'

const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  function invoker () {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  invoker.fns = fns
  return invoker
}

export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name) // 标准化事件修饰符
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {
      /**
       * 方法函数的处理，包括：
       * 1. 函数中的 this 绑定为 vm
       * 2. 函数或者 Promsie 运行时错误的捕获
       */
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm) // 将函数中的 this 绑定为 vm
      }
      /* 把函数变为一次性的 */
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      /* 将函数绑定为事件 */
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      /**
       * 在此条件下，parentListeners 中有一个与当前组件同名的事件
       * 
       * TODO 但是为什么要执行以下2条语句？
       * old 是 createFnInvoker 返回的闭包函数，其 vm 也是得到 old 的时候的 vm，不是当前 vm ，所以把它赋值给 on[name] 的意义？？
       */
      old.fns = cur
      on[name] = old
    }
  }
  /* 只保留同名的，用于事件冒泡。不同名的不需要 */
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
