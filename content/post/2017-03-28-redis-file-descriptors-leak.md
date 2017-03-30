---
date: 2017-03-28T16:18:52+08:00
title: Redis 的一个文件描述符泄露 Bug
---

最近遇到了 Redis 中的一个 fd 泄露的 Bug, 经过一番排查后终于找到了原因,
现将整个分析过程整理如下.
<!--more-->

# 1. 发现问题

一开始发现所有的服务都无法正常连接 Redis 后, 查看 Redis 日志, 发现大量如下错误:

``` text
# Error registering fd event for the new client: Numerical result out of range (fd=10247)
# Error registering fd event for the new client: Numerical result out of range (fd=10247)
# Error registering fd event for the new client: Numerical result out of range (fd=10247)
...
...
...
```

从错误信息来看, 应当是耗尽了 fd 资源, 导致无法为新连接分配新的 fd. 可实际上为 
Redis 配置的 maxfd 有 10240, 而当时的连接数不过几百, 峰值连接数也不会超过 3000,
正常情况下是不可能耗尽 fd 的, 应当是其他原因导致.

# 2. 查询原因

继续查找最早出现问题的日志, 发现在 fd 异常的日志之前, 还有许多这样的错误日志:

``` text
* Starting automatic rewriting of AOF on 100% growth
# Can't rewrite append only file in background: fork: Cannot allocate memory
* Starting automatic rewriting of AOF on 100% growth
# Can't rewrite append only file in background: fork: Cannot allocate memory
* Starting automatic rewriting of AOF on 100% growth
# Can't rewrite append only file in background: fork: Cannot allocate memory
...
...
...
```

重写 AOF 时内存不足导致失败, 很有可能 fd 资源不足也是因为这个问题而并发产生的,
于是我在 Github 上查了一下 Issue, 果然有人遇到了类似的情况:
[Error opening /setting AOF rewrite IPC pipes: Numerical result out of range](https://github.com/antirez/redis/issues/2857).

通过这个 issue, 很容易就找到了问题发生的原因: Redis 在 fork 子进程失败后没有关闭
之前打开的管道, 导致 fd 泄露.

# 3. 复盘源码

Redis 会在内部的 event loop 中注册 [serverCron](https://github.com/antirez/redis/blob/94751543b0a15ea333dab3121fa32747cf59de8f/src/server.c#L947)
函数的时间回调, 每秒执行 hz 次 (默认为 10), 重写 AOF 的操作也是在这个函数中执行, 调用的是
[rewriteAppendOnlyFileBackground](https://github.com/antirez/redis/blob/94751543b0a15ea333dab3121fa32747cf59de8f/src/aof.c#L1320)
函数, 该函数会调用 [aofCreatePipes](https://github.com/antirez/redis/blob/94751543b0a15ea333dab3121fa32747cf59de8f/src/aof.c#L1265)
创建 3 个管道, 即 6 个 fd 与子进程进行通信, 但只有在子进程中才会做清理工作. 因此当
fork 子进程失败时, 每秒会泄露 10 * 6 个 fd, 以这样的速度, 即使配置了 10240 个 fd,
也只需要不到 3 分钟就能耗尽...

这个问题已经在 2 月 20 日修复并合并到 3.2 分支的代码中, 但还没有发布新版本,
也就是说在截止目前最新的 3.2.8 版本 Redis 中, 这个问题是仍未被修复的.
