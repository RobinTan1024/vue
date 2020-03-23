/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  /* children 指的是插槽内容 */
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    /* TODO child.data 是什么数据 */
    const data = child.data
    /**
     * TODO
     * data.attrs.slot 在何处定义？其作用是？
     * 不删除会导致什么问题吗？
     */
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    /**
     * TODO
     * 是否当 data.slot 存在时，child 就是一个 slot 节点？
     * 什么情况下会有 context 不一致的问题？
     * child.context / child.fnContext 定义和作用？
     * data.slot 是 v-slot 的字符串值，默认是 default
     * 
     * 此处代码的作用是得到 { slotName: slotContent, ... } 的键值对对象
     */
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      const name = data.slot
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      (slots.default || (slots.default = [])).push(child)
    }
  }
  /* 移除空白的插槽内容 */
  // ignore slots that contains only whitespace
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
