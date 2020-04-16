+++
date = 2014-07-21T19:20:07+08:00
title = "Autotools 简单使用教程"
categories = ["Programming"]
tags = ["GNU", "Autotools"]

[minimalism]
    license = "by-nc-sa/4.0"
+++

最近在学习 Autotools 的使用, 所以在网上找了一圈相关教程. 虽说也可以看官方文档, 但是内容实在是太多了...不适合初次学习用. 后来发现了一个非常不错的教程: [Autotools Tutorial for Beginners](http://markuskimius.wikidot.com/programming:tut:autotools). 这个教程非常简明地介绍了整套工具的使用流程, 但是编写的时间比较久了, 我在学习过程中发现 Autotools 工具已经做了一些修改, 使得这个教程已经不再适用. 因此将自己的学习过程做一记录.

## 0. Autotools 工具简单介绍

1. `autoscan` 生成 configure.scan.
2. 重命名 configure.scan 为 configure.ac, 并修改其中 AC_INIT MACRO 对应的参数.
3. 增加 `AM_INIT_AUTOMAKE` MACRO 及 `AC_CONFIG_FILES([Makefile])` MACRO.
4. `aclocal`
5. `autoheader` 生成 `config.h.in`.
6. 编写 `Makefile.am`, `automake` 生成 `Makefile.in` 及其他文件.
7. `./configure` 测试有无问题.

## 1. 简单的 Hello World 项目.

创建一个目录, 命名为 helloworld, 以此作为项目的根目录. 初始化项目结构如下:

```
helloworld/
├── Makefile
└── src
    └── main.c
```

其中 main.c 代码如下:

``` c
#include <stdio.h>

int main(int argc, char **argv) {
    printf("Hello World\n");
    return 0;
}
```

Makefile 代码如下:

```
main:
        cc -o main src/main.c

clean:
        rm -f main
```

非常简单的项目, 执行 `make` 就可以编译生成可执行文件 main, 执行 `./main` 就会打印出 "Hello World", 执行 `make clean` 就会删除编译好的 main 文件.

## 2. 使用 autoconf 生成 configure 文件

### 2.1 生成 configure.ac

configure 文件需要 autoconf 命令解析 configure.ac 文件生成, 而 configure.ac 文件可以使用 autoscan 命令来自动生成. 执行 `autoscan` 后, 项目结构如下:

```
helloworld/
├── Makefile
├── autoscan.log
├── configure.scan
└── src
    └── main.c
```

可以看到 autoscan 生成了 autoscan.log, configure.scan 两个文件, 而 configure.scan 实际上就是我们需要的 configure.ac 文件, 其内容如下:

```
#                                               -*- Autoconf -*-
# Process this file with autoconf to produce a configure script.

AC_PREREQ([2.69])
AC_INIT([FULL-PACKAGE-NAME], [VERSION], [BUG-REPORT-ADDRESS])
AC_CONFIG_SRCDIR([src/main.c])
AC_CONFIG_HEADERS([config.h])

# Checks for programs.
AC_PROG_CC

# Checks for libraries.

# Checks for header files.

# Checks for typedefs, structures, and compiler characteristics.

# Checks for library functions.

AC_CONFIG_FILES([Makefile])
AC_OUTPUT
```

执行 `mv configure.scan configure.ac` 将其重命名.

### 2.2 生成 configure 文件

执行 `autoconf`, 查看项目结构:

```
helloworld/
├── Makefile
├── autom4te.cache
│   ├── output.0
│   ├── requests
│   └── traces.0
├── autoscan.log
├── configure
├── configure.ac
└── src
    └── main.c
```

configure 文件已经成功生成.

## 3. 使用 autoheader 生成 config.h.

现在执行之前生成的 configure 文件, 会报如下错误:

```
checking for gcc... gcc
checking whether the C compiler works... yes
checking for C compiler default output file name... a.out
checking for suffix of executables...
checking whether we are cross compiling... no
checking for suffix of object files... o
checking whether we are using the GNU C compiler... yes
checking whether gcc accepts -g... yes
checking for gcc option to accept ISO C89... none needed
configure: creating ./config.status
config.status: error: cannot find input file: `Makefile.in'
```

提示缺少 Makefile.in 文件. 实际上 Makefile.in 文件就是 Makefile 文件, configure 执行时会将 Makefile.in 拷贝到 Makefile. 这里我们先简单地用自己的 Makefile 替代. 执行 `mv Makefile Makefile.in` 后, 再次执行 configure 文件. 这次的错误如下:

```
checking for gcc... gcc
checking whether the C compiler works... yes
checking for C compiler default output file name... a.out
checking for suffix of executables...
checking whether we are cross compiling... no
checking for suffix of object files... o
checking whether we are using the GNU C compiler... yes
checking whether gcc accepts -g... yes
checking for gcc option to accept ISO C89... none needed
configure: creating ./config.status
config.status: creating Makefile
config.status: error: cannot find input file: `config.h.in'
```

提示缺少 config.h.in, 这个文件可以通过执行 autoheader 来获得. 执行 autoheader 后, 项目结构如下:

```
helloworld/
├── Makefile
├── Makefile.in
├── autom4te.cache
│   ├── output.0
│   ├── requests
│   └── traces.0
├── autoscan.log
├── config.h.in
├── config.log
├── config.status
├── configure
├── configure.ac
└── src
    └── main.c
```

再次执行 `./configure`.
