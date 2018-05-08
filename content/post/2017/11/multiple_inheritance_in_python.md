---
title: Python 中的多重继承顺序
date: 2017-11-16T11:43:07+08:00
categories:
tags:

minimalism:
    cloudmusic:
    license: by-nc-sa/4.0
---

最近发现中文互联网中的很多文章对 Python 在多重继承时中基类查找顺序有如下说法:
old style class 使用深度优先遍历, new style class 使用广度优先遍历.
然而实际上 new style class 真的是使用广度优先遍历吗?
<!--more-->

# 广度优先?

有如下代码, 试问, 执行代码后会输出什么?

``` python
class A(object):
    def __init__(self):
        print('A.init')
        super(A, self).__init__()

    def func(self):
        print('A.func')


class B(A):
    def __init__(self):
        print('B.init')
        super(B, self).__init__()


class C(object):
    def __init__(self):
        print('C.init')
        super(C, self).__init__()

    def func(self):
        print('C.func')


class D(B, C):
    def __init__(self):
        print('D.init')
        super(D, self).__init__()


if __name__ == '__main__':
    d = D()
    d.func()
```

类的继承顺序是这样的.

```
  O
   \
    A       O
     \     /
      B   C
       \ /
        D
```

如果按照广度优先的查找顺序, class D 的 MRO 应该为 D -> B -> C -> A -> O, 因此 init
时的顺序也应当是这样. 而调用 func() 方法时, 由于广度优先, 会首先查找到 class C,
因此会调用 C.func(). 所以程序输出应该是:

```
D.init
B.init
C.init
A.init
C.func
```

然而执行程序后, 会发现实际的输出是这样的:

```
D.init
B.init
A.init
C.init
A.func
```

很明显查找顺序并不是广度优先的, 看起来倒像是深度优先了.

# 深度优先?

稍微改动一点代码, 让 class C 也继承自 class A:

``` python
class C(A):
    def __init__(self):
        print('C.init')
        super(C, self).__init__()

    def func(self):
        print('C.func')
```

此时, 继承结构变成这样.

```
  O
   \
    A
   / \
  B   C
   \ /
    D
```

按照深度优先的便利顺序, 应为 D -> B -> A -> O -> C. 调用 D.func 实际应调用到 A.func.
再次执行, 会得到这样的输出:

```
D.init
B.init
C.init
A.init
C.func
```

可以看到调用的是 C.func, 所以深度优先的查找顺序也不符合实际情况.

# C3 算法!

实际上, Python 在 new style class 中使用的是 C3 算法来计算多重继承顺序的. 所谓 C3
算法, 大致是这样一个流程.

1. object 类的继承顺序还是 object, 记为 `L[O] = O`.
2. 对于 `class A(object)`, 其继承顺序为 [A, O], 记为 `L[A] = AO`.
3. 对于 `class B(A)`, 其继承顺序为 `L[B] = B + merge(L[A], A)`.
4. 对于 `class C(A, B)`, 其继承顺序为 `L[C] = C + merge(L[A], L[B], AB)`.
5. 以上 `merge` 的处理逻辑如下: 对于其中所有序列, 依次从前往后取, 若当前第一个类只出现在所有其他序列的头部,
则认为这个类可以提出, 否则跳过到下一个序列继续, 直到全部类都被提出.

单看规则有点干巴巴的, 以这张图为例.

```
  O
   \
    A
   / \
  B   C
   \ /
    D
```

按照上述规则, 可得

- L[O] = O
- L[A] = AO
- L[B] = B + merge(AO, A) = BAO
- L[C] = C + merge(AO, A) = CAO
- L[D] = D + merge(BAO, CAO, BC) = DBCAO

因此, 在这个例子中, D.func 实际上会调用 C.func, 因为 C 的查找顺序在 A 之前.

# Reference
- [The Python 2.3 Method Resolution Order](https://www.python.org/download/releases/2.3/mro/)
