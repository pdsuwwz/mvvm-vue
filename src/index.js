import Mvvm from './mvvm'

const mvvm = new Mvvm({
  el: '#app',
  data: {
    a: 233,
    b: {
      c: 'hello'
    },
  }
})
console.log(mvvm)
window.mvvm = mvvm