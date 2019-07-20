import Observer from './observer'

export default class Mvvm {
  constructor(options = {}) {
    const { el, data } = options
    this.$options = options
    this.$el = document.querySelector(el)
    this.$data = data;
    new Observer(data)
  }
}
