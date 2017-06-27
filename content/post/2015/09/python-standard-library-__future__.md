---
cloudmusic:
date: 2015-09-11T22:42:40+08:00
license: by-nc-sa/4.0
title: Python 标准库笔记 —— __future__
---

\_\_future\_\_ 模块可以让一些老版本的 Python 使用新版本中的一些语法特性.
例如在 2.5 版本中是不支持 with...as... 这样的语法进行上下文管理的,
但是如果在代码中加入 `from __future__ import with_statement`, 就可以让 2.5
版本的 Python 也支持这个特性.

打开 \_\_future\_\_.py 文件, 可以看到其中支持 7 种这样的关键字特性, 分别是
nested\_scopes, generators, division, absolute\_import, with\_statement,
print\_function, unicode\_literals.
<!--more-->

# 1. nested\_scopes

从 PEP 227 的解释来看, nested\_scopes 特性允许从代码外层的命名空间中引用变量.
举例子而言, 有下面这段代码:

``` Python
# from __future__ import nested_scopes

def main():
    a = 1
    print 'outer\nglobals: %s\nlocals: %s\na=%s\n' % (globals(), locals(), a)
    func = lambda: 'inner\nglobals: %s\nlocals: %s\na=%s\n' % (
        globals(), locals(), a)
    print func()

if __name__ == '__main__':
    main()
```

使用 2.1 版本的 Python 运行, 会返回

``` Text
test_nested_scopes.py:3: SyntaxWarning: local name 'a' in 'main' shadows use of 'a' as global in nested scope 'lambda'
  def main():
outer
globals: {'__doc__': None, 'main': <function main at 0271351C>, '__name__': '__main__', '__builtins__': <module '__builtin__' (built-in)>}
locals: {}
a=1

Traceback (most recent call last):
  File "test_nested_scopes.py", line 11, in ?
    main()
  File "test_nested_scopes.py", line 8, in main
    print func()
  File "test_nested_scopes.py", line 6, in <lambda>
    func = lambda: 'inner\nglobals: %s\nlocals: %s\na=%s\n' % (
NameError: global name 'a' is not defined
```

执行时首先会报一个 SyntaxWarning, 并且在执行到 lambda 函数时, 会因为找不到变量 a
而抛出 NameError.

而把第一行的注释取消掉后, 再次执行, 会返回

``` Text
outer
globals: {'nested_scopes': Feature((2, 1, 0, 'beta', 1), (2, 2, 0, 'final', 0)), '__doc__': None, 'main': <function main at 02693F5C>, '__name__': '__main__', '__builtins__': <module '__builtin__' (built-in)>}
locals: {'a': 1}
a=1

inner
globals: {'nested_scopes': Feature((2, 1, 0, 'beta', 1), (2, 2, 0, 'final', 0)), '__doc__': None, 'main': <function main at 02693F5C>, '__name__': '__main__', '__builtins__': <module '__builtin__' (built-in)>}
locals: {}
a=1
```

可以看到, 在 lambda 函数内部, globals 和 locals 中都找不到变量 a, 然而却能取到 a
的值, 这就是因为从外层命名空间中引用了变量.

有一个奇怪的问题是, 在 Python 2.7 中执行同样的代码, 返回的内容为

``` Text
outer
globals: {'nested_scopes': _Feature((2, 1, 0, 'beta', 1), (2, 2, 0, 'alpha', 0), 16), '__builtins__': <module '__builtin__' (built-in)>, '__file__': 'test_nested_scopes.py', '__package__': None, '__name__': '__main__', 'main': <function main at 0x02A60C70>, '__doc__': None}
locals: {'a': 1}
a=1

inner
globals: {'nested_scopes': _Feature((2, 1, 0, 'beta', 1), (2, 2, 0, 'alpha', 0), 16), '__builtins__': <module '__builtin__' (built-in)>, '__file__': 'test_nested_scopes.py', '__package__': None, '__name__': '__main__', 'main': <function main at 0x02A60C70>, '__doc__': None}
locals: {'a': 1}
a=1
```

可以看到 lambda 函数内的 locals 中是有 a 的, 这与 2.1 版本的表现并不一致,
不清楚是在哪个版本开始做的改动. 不过毕竟 nested\_scopes 是一个老的特性, 就不去深究了...

# 2. generators

这个很简单, 加入了使用 yield 创建生成器的语法. 一个简单的例子:

``` Python
def fab(n):
    a = 1
    b = 1
    i = 0
    while i < n:
        yield b
        a, b = b, a + b
        i += 1


def main():
    result = fab(5)
    print type(result)
    for i in result:
        print i

if __name__ == '__main__':
    main()
```

运行它, 会输出

``` Text
<type 'generator'>
1
2
3
5
8
```

可以看到, 使用了 yield 关键词的函数, 会成为一个生成器.

# 3. division

这个也很简单. 2.x 版本的 Python 中, 除号 `/` 计算出的结果会是被除数和除数中精度更高的那一个类型,
举一些例子:

``` Text
>>> 10 / 3
3
>>> 10L / 3
3L
>>> 10.0 / 3
3.3333333333333335
```

因此, 除法结果的类型往往是难以预期的. 为了解决这个问题, 引入了新的计算符 `//`.
使用 `/` 得出的结果始终是精确的, 而使用 `//` 得出的结果始终是向下取整的(但类型仍然是两个数中相对高的那一个),
这样就很明确了. 还是举一些例子:

``` Text
>>> from \_\_future\_\_ import division
>>> 10 / 3
3.3333333333333335
>>> 10 // 3
3
>>> 10L // 3
3L
>>> 10.0 // 3
3.0
>>> -10.0 // 3
-4.0
```

# 4. absolute\_import

这个功能也很容易理解. 简单地说, 它是为了解决这样一个问题：当我们在代码中写下
`import sys` 时, 怎样确定实际导入的是标准库中的 sys 模块, 或是当前文件夹下的
sys.py 文件呢? 虽然几乎不会有人会起这样一个与标准库产生冲突的文件名,
但也不得不承认, 这种 import 方式是会产生混淆的. absolute\_import 绝对引用即是为了解决这个问题.
还是用一个简单的例子试一下. 创建一个自定义的 package, 结构如下:

``` Text
package
|-- __init__.py
|-- main.py
`-- sys.py
```

其中两个 Python 文件的内容都很简单:

``` Python
# filename: sys.py
print 'Just imported a custom sys module.'

# filename: main.py
# from \_\_future\_\_ import absolute_import
import sys
```

然后运行 main.py:

``` Bash
$ python -m package.main
Just imported custom sys module.
```

可以看到实际 import 的是自定义的 sys.py. 而当取消 main.py 中第一行的注释后再次执行

``` Bash
$ python -m package.main
$
```

并没有输出任何内容, 说明导入的是标准库中的 sys 模块.

那么, 使用 absolute\_import 后, 怎么样在 main.py 中导入自定义的 sys.py 呢? 有两种方法:

1. `from . import sys`, 这种引用方法就是所谓的相对引用(relative import),
在之前这种引用方法是被强烈不建议使用的, 但现在相对宽容一点, 因为相对引用还是有适合使用的场景,
当 package 更名时, 不需要大量修改代码.
2. `from package import sys`, 这种引用方法是新的绝对引用, 即 import 路径必须以
sys.path 里的路径为根路径开始寻找.

# 5. with\_statement

这个是让 Python 2.6 中正式加入的 with 语法在 2.5 中也能够使用. with
语法的作用就是可以让对象自动完成一些初始化和清理工作. PEP 343 中已经有很直白的解释了.

``` Python
with EXPR as VAR:
    BLOCK
```

相当于

``` Python
VAR = EXPR
VAR.__enter__()
try:
    BLOCK
finally:
    VAR.__exit__()
```

也就是在 BLOCK 执行前后分别自动执行了 \_\_enter\_\_ 和 \_\_exit\_\_ 方法.

另外, 标准库中的 contextlib 模块提供了 contextmanager 装饰器, 能够让函数也支持 with 语法.

# 6. print\_function

将 print 语句变为 Python 3 中的函数形式. 这个没有什么好说的, 不过将 print
语句改为函数形式调用这一点很赞, 因为 print 语句的语法很奇怪, 有时候很容易出问题.
比如需要在 print 后不换行, 就要在 print 语句后加一个逗号 (`print 'one',; print 'line'`);
而使用 print 函数就可以很明确地使用 end 参数来设置 (`print('one', end=' '); print('line')`).

# 7. unicode\_literals

同样是为了与 Python 3 的语法兼容而产生. 在 Python 2 中, 字符串默认为 str,
而在字符串前加 u 才会是 unicode; 而在 Python 3 中, 字符串默认为 unicode,
而在字符串前加 b 才会是 str. unicode\_literals 作用就是在 Python 2 中使用
Python 3 的这种风格.

小小吐槽一句, 在 Python 2 中 `bytes is str` 返回的是 True! bytes 类型就是 str...
