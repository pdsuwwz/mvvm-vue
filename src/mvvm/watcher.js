import Util from '../util'
import Dep from './dep'

export default class Watcher {
  constructor(vm, expression, callback) {
    this.vm = vm
    this.expression = expression
    this.callback = callback
    Dep.target = this
    this.oldValue = this.getValue()
    Dep.target = null
  }
  update() {
    const newVal = this.getValue()
    if (this.oldValue !== newVal) {
      this.oldValue = newVal
      this.callback(newVal)
    }
  }
  getValue() {
    const value = Util.getValueFromData(this.expression, this.vm)
    return value
  }
}