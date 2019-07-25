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
* Compiler 模板编译
* Watcher 数据观察
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
    this.$el = el
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
// src/mvvm/index.js
import Observer from './observer'

export default class Mvvm {
  constructor(options = {}) {
    const { el, data } = options
    this.$options = options
    this.$el = el
    this.$data = data;
    new Observer(data)
  }
}
```

## 数据代理

我们知道在 Vue 中，可以直接通过实例来获取 data 属性，如 `this.a`， `this.b.c` 这样的写法

但是现在我们是这样使用的： `this.$data.a`，`this.$data.b.c`很不方便对吧，怎么办呢？

其实我们再加一层代理就可以解决了

```js
// src/mvvm/index.js
...
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
...
```

# Compiler

这一步主要对页面，也就是视图中每个元素节点的指令或者包含特定规则的字符串进行扫描、解析（编译过程），同时实现 DOM 的更新以及绑定相应的更新函数等操作

## 创建一个 Compiler 类

编译的步骤大致是这样的

1. 拿到根元素 #app
2. 使用文档碎片，循环将根元素里面的所有 DOM 元素节点放到内存中去（虚拟 DOM）
3. 在内存中将元素节点进行编译替换
4. 将所有节点还原到根元素中

compiler 类中
```js
// src/mvvm/compiler.js
export default class Compiler {
  constructor(el, vm) {
    this.$vm = vm
    // 拿到根元素
    this.$el = this.isElementNode(el) ? el : document.querySelector(el)
    // 转化为虚拟 DOM
    const vnode = this.node2Fragment(this.$el)
    // 模板编译替换
    this.compile(vnode)
    // 还原根元素
    this.$el.appendChild(vnode)
  }
  node2Fragment(node) {
    const fragment = document.createDocumentFragment()
    let firstChild
    while(firstChild = node.firstChild) {
      fragment.appendChild(firstChild)
    }
    return fragment
  }
  compile(node) {

  }
  isElementNode(node) {
    return node.nodeType === 1
  }
}
```
mvvm 中这样改为这样

```js
// src/mvvm/index.js
...
class Mvvm {
  constructor() {
    ...
    new Compiler(this.$el, this)
    ...
  }
  ...
}
```

## 区分编译类型

在 `compile()` 方法中，我们需要编译两种数据，一是`节点元素`，也就是 HTML 标签元素，还有一种是纯文本，我们需要分别为它们设置不同的`数据替换规则`

正好刚才写了一个 `isElementNode()` 方法，我们用它来做节点与文本元素的区分

详细的步骤分别对应到 `compileElement()` 和 `compileText()` 方法里

当然，我们还要考虑`节点元素内包含文本元素`这一个情形，所以在这做了一个递归处理 `this.compile(child)`

```js
// src/mvvm/compiler.js
class Compiler {
  ...
  compile(node) {
    Array.from(node.childNodes).forEach(child => {
      // 编译节点
      if (this.isElementNode(child)) {
        this.compileElement(child)
        // 递归处理
        this.compile(child)
      } else {
        // 编译文本
        this.compileText(child)
      }
    })
  }
  ...
}
```

## 编译节点

下面我们就先来编写 `compileElement()` 方法

首先我们先获取节点上的所有属性，遍历它们，再检查是否有 `v-` 开头的属性，即指令。

这里可以抽取一个方法 `isDirective()`

```js
// src/mvvm/compiler.js
class Compiler {
  ...
  isDirective(attr) {
    return attr.startsWith('v-')
  }
  ...
}
```

然后我们需要根据指令的类型，也就是 `v-` 后面的字符串对应的替换规则来对节点做处理

比如说，有 `v-model`, `v-html`, `v-text` 这三种指令

其中处理字符串的细节我们可以放到一个工具类 `CompileUtil` 里来做

```js
// src/mvvm/compile-util.js
export default class CompileUtil {}
CompileUtil.updater = {
  model() {

  },
  html() {

  },
  text() {

  }
}
```

可以看到有 `model()`, `html()`, `text()` 这三种方法

再来考虑传参的问题，要将指令 `v-` 或者模板 `{{}}` 替换为我们数据源中的字段

我们需要有的字段是

> 对应的节点 node
>
> 模板表达式 expression
>
> 数据源 vm (因为先前我们为 vm.$data 做了代理，所以可以直接取实例上的 data 数据)


所以这样使用 `CompileUtil.updater[directive](node, expression, this.$vm)`

`expression` 表示 `v-` 指令对应的值，默认为名字为 value，我们这里是为它起了一个别名

`directive` 表示的就是 `v-` 后面的字符串

```js
// src/mvvm/compiler.js
class Compiler {
  ...
  compileElement(node) {
    const attributes = node.attributes
    Array.from(attributes).forEach(attr => {
      const { name, value:expression } = attr
      if(this.isDirective(name)) {
        const [, directive] = name.split('-')
        // 根据对应指令编译相应的内容
        CompileUtil.updater[directive](node, expression, this.$vm)
      }
    })
  }
  ...
}
```

那么现在只需要根据模板表达式 expression 从 数据源 vm 中获取到数据，再将数据填充到节点 node 中就行了

我们将获取数据的操作抽离成一个方法 `getValueFromData()`

```js
// src/mvvm/compile-util.js
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
```

写到这里，我们看到，`v-model` 的数据成功渲染到了文本框里

好了，接下来该用 `compileText()` 处理文本元素了

## 编译文本元素

首先，我们需要匹配到文本元素中的双大括号 `{{}}`，这里用到了一个正则 `/{\{(.+?)\}\}/`

接着将每个文本元素中包含 `{{}}` 的字符串全部用从数据源 vm 中获取到的数据来替换，最后再填充到文本元素的 `textContent` 中

```js
// src/mvvm/compiler.js
class Compiler {
  ...
  compileText(node) {
    const text = node.textContent
    const reg = /{\{(.+?)\}\}/
    if (reg.test(text)) {
      CompileUtil.updater['textContent'](node, text, this.$vm)
    }
  }
  ...
}
```

在工具类 CompileUtil 中再加一个 `textContent()` 方法

```js
// src/mvvm/compile-util.js
export default class CompileUtil {}
CompileUtil.updater = {
  ...
  textContent(node, expression, vm) {
    const content = expression.replace(/{\{(.+?)\}\}/g, (...args) => {
      return this.getValueFromData(args[1], vm)
    })
    node.textContent = content
  }
  ...
}
```

到此，模板编译的阶段就完成了，但是数据是单向传递的（数据 Model -> 视图 View）, 只能数据驱动视图，还差从视图到数据这一步，要想实现这一步就该应用发布订阅模式来实现数据的观察了

# Watcher

充当数据的监视作用，当数据发生改变的时候，触发对应视图中节点状态的`更新回调`

我们已知要在数据发生改变的时候触发 watcher ，从而触发视图的数据更新

所以我们要在刚开始编译的时候就将`更新回调`加到每个动态节点上

即在 `CompileUtil.updater` 中的所有关于节点的更新方法内放置 watcher实例对吧，就像这样

```js
// src/mvvm/compile-util.js
CompileUtil.updater = {
  ...
  model(node, expression, vm) {
    const value = this.getValue(expression, vm)
    new Watcher(vm, expression, (newVal) => {
      // 更新节点
      node.value = newVal
    })
    node.value = value
  },
  html(node, expression, vm) {
    const value = this.getValue(expression, vm)
    new Watcher(vm, expression, (newVal) => {
      // 更新节点
      node.innerHTML = newVal
    })
    node.innerHTML = value
  },
  ...
}
```

watcher 类的构造函数传入了三个参数，分别是：mvvm 实例，模板表达式，更新回调

那么 watcher 就可以这样来实现，我们还可以看到有一个 `update()` 方法

它是在数据发生改变的时候被触发，也就意味着传入的回调被触发了

回调被触发也就代表了我们刚才实例化 watcher 时更新节点的操作被触发：`node.value = newVal`, `node.innerHTML = newVal`...

那么问题又有了，谁来驱动执行 `update()` 呢，我们只实例化 watcher 肯定是不行的，还需要有一个 `消息订阅` Dep 机制

```js
// src/mvvm/watcher.js
export default class Watcher {
  constructor(vm, expression, callback) {
    this.vm = vm
    this.expression = expression
    this.callback = callback
    this.oldValue = this.getValue()
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
```

# Dep

应用了发布订阅模式，本质上就是，Dep 包含了一个数组，用于收集所有注册过的 `watcher`（订阅），当数据发生变化时，触发 dep 中的 `notify()`（发布），也就是触发 `watcher` 上的 `update()` 方法，从而更新视图

Dep 代码比较简单，这里直接列出来

```js
export default class Dep {
  constructor() {
    this.subs = []
  }
  // 收集 watcher，相当于订阅
  addSub(watcher) {
    this.subs.push(watcher)
  }
  // 触发 watcher 上的 update(), 相当于发布
  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
}
```

在哪里使用 Dep 呢，有一点我们知道，那就是 Dep 中 subs 数组里存放的是一个个的 watcher 实例

在讨论 watcher 的时候，我们知道了，当数据发生改变时触发 Dep 的 `notify()`

`notify()` 会触发收集的 watcher 实例上的 `update()` 方法

我们可以在 `Object.defineProperty` 中的 `getter` 里收集 watcher

然后在 `setter` 里触发 `notify()`

不过有一点需要注意，getter 中囊括了全部数据的劫持，如果我们有一些数据没有用到的话，那么也就意味着这些数据没有对应的 watcher

也就是说劫持这些数据时就不需要被 Dep 订阅到了，这个该如何判断呢？

我们知道，js 是单线程的，代码依次从上到下执行，我们可以利用这个特点，修改 watcher

```js
// src/mvvm/watcher.js
export default class Watcher {
  constructor(vm, expression, callback) {
    this.vm = vm
    this.expression = expression
    this.callback = callback
    // 这里我们先在 Dep 上存一份 watcher 实例，然后根据模板表达式获取 data ，这样会触发 data 的 getter，我们在 getter 中做一个 Dep.target 的判断，如果有则收集到 Dep 中，完毕之后再将 Dep.target 置为空
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
```

我们注意到 `Dep.target` 会在 data 的 getter 中做出判断

```js
// src/mvvm/observer.js
class Observer {
  ...
  initData(data) {
    for(let key in data) {
      let value = data[key]
      this.observe(value)
       // 这里实例化 Dep
      const dep = new Dep()
      Object.defineProperty(data, key, {
        enumerable: true,
        get() {
          // 这里过滤掉没有 watcher 的 data（消息订阅）
          Dep.target && dep.addSub(Dep.target)
          return value
        },
        set: (newVal) => {
          if (newVal === value) {
            return;
          }
          value = newVal
          // 触发 watcher 的 update()（消息发布）
          dep.notify()
          this.observe(value)
        }
      })
    }
  }
  ...
}
```

好了，可以打开浏览器控制台执行 `mvvm.b.c = 'hello2'`测试 ，发现视图确实更新了，那么我们的数据驱动视图的功能就基本完成了，还差一些事件的绑定，计算属性等。 


