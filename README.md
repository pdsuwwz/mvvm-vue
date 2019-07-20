install packages

```
yarn
```

WDS server

```
yarn start
```

build server

```
yarn build
```
# 框架组成

* Observer 数据劫持
* Watcher 数据观察
* Compile 模板编译
* Dep 消息订阅

# 初始化

首先需要创建一个 mvvm 类，用于整合以上四个组成部分，这里可参考 `new Vue({})` 的实现写法

写入

```js
// src/mvvm/index.js
export default class Mvvm {
  constructor(options = {}) {
    const { el, data } = options
    this.$options = options
    this.$el = document.querySelector(el)
    this.$data = data;
  }
}
```

mvvm 的实例代码如下

```js
// src/index.js
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
```

我们知道 Vue 中主要是利用了 Object.defineProperty() 劫持各个属性的 `getter`, `setter` 来达到`数据监听`的目的。

在数据发生变动的时候会将消息给发布给订阅者，接着触发相应的监听回调。

了解了原理，那么我们首先来将 data 数据转化为 getter, setter 的形式

# Observer

创建一个 Observer 类，用于处理数据对象的监听，这里要注意，监听时需要对`对象`做深度递归处理，包括在 setter 中新赋的对象属性

```js
// src/mvvm/observer.js
export default class Observer {
  constructor(data) {
    for(let key in data) {
      // 这里需注意，要在劫持前将值保存到一个变量 value 中去，然后在 getter 中引用，切忌直接返回 data[key]，否则会爆栈
      let value = data[key]
       // 递归处理
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
           // 递归处理
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
```

对应 mvvm 中更新如下

```js
// mvvm/index.js
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

```
