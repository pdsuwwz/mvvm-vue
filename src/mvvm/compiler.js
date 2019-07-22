import CompileUtil from './compile-util'
export default class Compiler {
  constructor(el, vm) {
    this.$vm = vm
    this.$el = this.isElementNode(el) ? el : document.querySelector(el)
    const vnode = this.node2Fragment(this.$el)
    this.compile(vnode)
    this.$el.appendChild(vnode)
  }
  node2Fragment(node) {
    const fragment = document.createDocumentFragment()
    let firstChild
    while(firstChild = node.firstChild) {
      fragment.appendChild(firstChild)
    }
    return fragment
  }
  compileElement(node) {
    const attributes = node.attributes
    Array.from(attributes).forEach(attr => {
      const { name, value:expression } = attr
      if(this.isDirective(name)) {
        // 根据对应指令编译相应的内容
        const [, directive] = name.split('-')
        CompileUtil.updater[directive](node, expression, this.$vm)
      }
    })
  }
  compileText(node) {
    const text = node.textContent
    const reg = /{\{(.+?)\}\}/
    if (reg.test(text)) {
      CompileUtil.updater['textContent'](node, text, this.$vm)
    }
  }
  compile(node) {
    Array.from(node.childNodes).forEach(child => {
      // 编译节点
      if (this.isElementNode(child)) {
        this.compileElement(child)
        this.compile(child)
      } else {
        // 编译文本
        this.compileText(child)
      }
    })
  }
  isDirective(attr) {
    return attr.startsWith('v-')
  }
  isElementNode(node) {
    return node.nodeType === 1
  }
}