import Observer from './observer'

export default class Mvvm {
  constructor(options = {}) {
    const { el, data } = options
    this.$options = options
    this.$el = document.querySelector(el)
    this.$data = data
    this.initObserver(data)
  }
  initObserver(data) {
    new Observer(data)
    this.proxyData(data)
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
