/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  /**
   * parse 的目标是把 template 模板字符串转换成 AST 树（抽象语法树用 JavaScript 对象的形式来描述整个模板）
   * 整个 parse 的过程是利用正则表达式顺序解析模板，当解析到开始标签、闭合标签、文本的时候都会分别执行对应的回调函数，来达到构造 AST 树的目的
   */
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    /**
     * optimize 的过程，就是深度遍历这个 AST 树，去检测它的每一颗子树是不是静态节点
     * 如果是静态节点则它们生成 DOM 永远不需要改变，这对运行时对模板的更新起到极大的优化作用
     */
    optimize(ast, options)
  }
  /* 把优化后的 AST 树转换成可执行的代码 */
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
