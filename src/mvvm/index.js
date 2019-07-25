import Observer from './observer'
import Compiler from './compiler';
export default class Mvvm {
  constructor(options = {}) {
    const { el, data } = options
    this.$options = options
    this.$el = el
    this.$data = data
    this.initObserver(data)
    this.initCompiler()
  }
  initObserver(data) {
    new Observer(data)
    this.proxyData(data)
  }
  initCompiler() {
    new Compiler(this.$el, this)
  }
  proxyData(data) {
    for(let key in data) {
      Object.defineProperty(this, key, {
        enumerable: true,
        get() {
          return data[key]
        },
        set(newVal) {
          data[key] = newVal
        }
      })
    }
  }
}
