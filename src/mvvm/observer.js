export default class Observer {
  constructor(data) {
    for(let key in data) {
      let value = data[key]
      this.observe(value)
      Object.defineProperty(data, key, {
        enumerable: true,
        get() {
          return value
        },
        set: (newVal) => {
          if (newVal === value) {
            return;
          }
          value = newVal
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