export default class CompileUtil {}
CompileUtil.updater = {
  model(node, expression, vm) {
    const value = this.getValueFromData(expression, vm)
    node.value = value
  },
  html(node, expression, vm) {
    const value = this.getValueFromData(expression, vm)
    node.innerHTML = value
  },
  text(node, expression, vm) {
    const value = this.getValueFromData(expression, vm)
    node.textContent = value
  },
  textContent(node, expression, vm) {
    const content = expression.replace(/{\{(.+?)\}\}/g, (...args) => {
      return this.getValueFromData(args[1], vm)
    })
    node.textContent = content
  },
  getValueFromData(expression, target) {
    const keys = expression.split('.')
    let result = target
    for(let i = 0; i < keys.length; i++) {
      if (!result) {
        break;
      }
      result = result[keys[i]]
    }
    return result
  }
}