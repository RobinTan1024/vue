/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    /**
     * 组件性能监测
     * 
     * 在开发者模式下，利用 window.performace 来记录每一个组件实例的性能表现
     * 在 vue-devtool 中可以看到每个组件的各个生命周期所耗费的时间
     */
    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true

    /**
     * 标准化并且合并构造函数与组件的配置项
     * 
     * 标准化的内容包括：名称驼峰化，数据格式标准化。标准化的对象是 props / inject / directives
     * 
     * 构造函数包括 Vue 和通过 Vue.extend 拓展的子构造函数（子类）
     * _isComponent 属性是内部组件如 vnode 的属性
     * 
     */
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    /**
     * 对不存在属性和内部属性的访问警告
     * 
     * TODO _renderProxy的作用是什么？
     */
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    
    // expose real self
    vm._self = vm
    initLifecycle(vm) // 建立组件树关系
    initEvents(vm) // 实例事件函数：1.把 this 绑定为 vm；2.捕获函数或者 Promise 中的运行时异常；3.实现组件树的事件冒泡
    /**
     * initRender 的作用
     * 1. 处理 slot 插槽内容（而非插槽的容器，插槽内容在父组件作用域中编译，插槽容器在子组件中定义位置）
     * 2. 将 vm.$listeners 和 vm.$attrs 属性设置为响应式属性
     */
    initRender(vm)
    callHook(vm, 'beforeCreate')
    /* 在初始化 data/props 前沿着组件树找到依赖注入 */
    initInjections(vm) // resolve injections before data/props
    /**
     * initState 的作用
     * 1. 对 props 进行了类型校验，初始化初值，设置响应式，代理到 vm 上
     * 2. 直接设置 methods 在 vm 上（而非代理），设置 this = vm
     * 3. 初始化 data 初值，与 props/methods 同名冲突检测，代理到 vm，应用为响应式数据
     * 4. 将 computed 属性设置为观察者对象，依赖收集
     * 5. 将 watch 属性设置为观察者对象，依赖收集
     */
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
