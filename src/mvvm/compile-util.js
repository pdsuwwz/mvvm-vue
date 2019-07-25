import Util from '../util'
import Watcher from "./watcher";

export default class CompileUtil {}
CompileUtil.updater = {
  model(node, expression, vm) {
    const value = this.getValue(expression, vm)
    new Watcher(vm, expression, (newVal) => {
      node.value = newVal
    })
    node.value = value
  },
  html(node, expression, vm) {
    const value = this.getValue(expression, vm)
    new Watcher(vm, expression, (newVal) => {
      node.innerHTML = newVal
    })
    node.innerHTML = value
  },
  text(node, expression, vm) {
    const value = this.getValue(expression, vm)
    new Watcher(vm, expression, (newVal) => {
      node.textContent = newVal
    })
    node.textContent = value
  },
  getTextContentWithExpression(vm, expression) {
    return expression.replace(/{\{(.+?)\}\}/g, (...args) => {
      return this.getValue(args[1], vm)
    })
  },
  // 这里要注意，当节点中存在多个双括号模板时，要单独处理
  textContent(node, expression, vm) {
    const content = expression.replace(/{\{(.+?)\}\}/g, (...args) => {
      new Watcher(vm, args[1], () => {
        node.textContent = this.getTextContentWithExpression(vm, expression)
      })
      return this.getValue(args[1], vm)
    })
    node.textContent = content
  },
  getValue(expression, vm) {
    return Util.getValueFromData(expression, vm)
  }
}