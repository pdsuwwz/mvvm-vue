import Dep from "./dep";

export default class Observer {
  constructor(data) {
    this.initData(data)
  }
  initData(data) {
    for(let key in data) {
      let value = data[key]
      this.observe(value)
      const dep = new Dep()
      Object.defineProperty(data, key, {
        enumerable: true,
        get() {
          Dep.target && dep.addSub(Dep.target)
          return value
        },
        set: (newVal) => {
          if (newVal === value) {
            return;
          }
          value = newVal
          dep.notify()
          this.observe(value)
        }
      })
    }
  }
  observe(data) {
    if (Object.prototype.toString.call(data) === '[object Object]') {
      new Observer(data)
    }
  }
}