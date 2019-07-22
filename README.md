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

到此，模板编译的阶段就完成了，下一步就该应用发布订阅模式来实现数据的观察了
