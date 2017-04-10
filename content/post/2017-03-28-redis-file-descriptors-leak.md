---
date: 2017-03-28T16:18:52+08:00
title: Redis 的一个文件描述符泄露 Bug
---


最近遇到了 Redis 中的一个 fd 泄露的 Bug, 经过一番排查后终于找到了原因,
现将整个分析过程整理如下.
<!--more-->

# 1. 查找问题

一开始发现所有的服务都无法正常连接 Redis 后, 查看 Redis 日志, 发现大量如下错误:

``` text
# Error registering fd event for the new client: Numerical result out of range (fd=10247)
# Error registering fd event for the new client: Numerical result out of range (fd=10247)
# Error registering fd event for the new client: Numerical result out of range (fd=10247)
...
...
...
```

从错误信息来看, 应当是耗尽了 fd 资源, 导致无法为新连接分配 fd. 可实际上为  Redis
配置的 maxfd 有 10240, 而当时的连接数不过几百, 峰值连接数也不会超过 3000,
正常情况下是不可能耗尽 fd 的.

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

这条错误日志的记录原因是因为重写 AOF 时内存不足导致失败, 很有可能 fd
资源不足也是因为这个问题而并发产生的, 于是我在 Github 上查了一下 Issue,
果然有人遇到了类似的情况:
[Error opening /setting AOF rewrite IPC pipes: Numerical result out of range](https://github.com/antirez/redis/issues/2857).

通过这个 issue, 很容易就找到了问题发生的原因: Redis 在 fork 子进程失败时没有关闭
之前打开的管道, 导致 fd 泄露.

# 2. 分析源码

Redis 在 3 种情况下会进行重写 aof 文件的操作:
1. 发送 `BGREWRITEAOF` 命令主动发起重写.
2. 将配置文件中的 `appendonly` 选项由 no 改为 yes, 并且执行 `CONFIG` 命令重载配置时.
3. 当配置了 `auto-aof-rewrite-percentage` 选项时, 会在满足条件时自动触发.

这里只分析第 3 种情况. 在
[serverCron](https://github.com/antirez/redis/blob/db8a945cbb861045428d39f960ace2bd99916a0b/src/server.c#L1092)
这个事件回调函数中, 可以看到如下代码:

``` c
         /* Trigger an AOF rewrite if needed */
         if (server.rdb_child_pid == -1 &&
             server.aof_child_pid == -1 &&
             server.aof_rewrite_perc &&
             server.aof_current_size > server.aof_rewrite_min_size)
         {
            long long base = server.aof_rewrite_base_size ?
                            server.aof_rewrite_base_size : 1;
            long long growth = (server.aof_current_size*100/base) - 100;
            if (growth >= server.aof_rewrite_perc) {
                serverLog(LL_NOTICE,"Starting automatic rewriting of AOF on %lld%% growth",growth);
                /* NOTE: 此处调用处理函数 */
                rewriteAppendOnlyFileBackground();
            }
         }
```

当 aof 文件增长率达到指定百分比时, 会自动调用
[rewriteAppendOnlyFileBackground](https://github.com/antirez/redis/blob/db8a945cbb861045428d39f960ace2bd99916a0b/src/aof.c#L1263)
函数. 这里需要注意两点:
1. 在该函数中调用 `aofCreatePipes` 函数创建了 3 个管道用来与子进程通信.
2. 子进程创建成功后, 将其 pid 存入了 `server.aof_child_pid` 中.

``` c
int rewriteAppendOnlyFileBackground(void) {
    pid_t childpid;
    long long start;

    if (server.aof_child_pid != -1 || server.rdb_child_pid != -1) return C_ERR;
    /* NOTE: 调用 aofCreatePipes() 创建了 3 个管道. */
    if (aofCreatePipes() != C_OK) return C_ERR;
    start = ustime();
    if ((childpid = fork()) == 0) {
        /* hide */
    } else {
        /* Parent */
        server.stat_fork_time = ustime()-start;
        server.stat_fork_rate = (double) zmalloc_used_memory() * 1000000 / server.stat_fork_time / (1024*1024*1024); /* GB per second. */
        latencyAddSampleIfNeeded("fork",server.stat_fork_time/1000);
        /* NOTE: fork 失败直接退出. */
        if (childpid == -1) {
            serverLog(LL_WARNING,
                "Can't rewrite append only file in background: fork: %s",
                strerror(errno));
            return C_ERR;
        }
        serverLog(LL_NOTICE,
            "Background append only file rewriting started by pid %d",childpid);
        server.aof_rewrite_scheduled = 0;
        server.aof_rewrite_time_start = time(NULL);
        /* NOTE: 保存 pid. */
        server.aof_child_pid = childpid;
        updateDictResizePolicy();
        /* We set appendseldb to -1 in order to force the next call to the
         * feedAppendOnlyFile() to issue a SELECT command, so the differences
         * accumulated by the parent into server.aof_rewrite_buf will start
         * with a SELECT statement and it will be safe to merge. */
        server.aof_selected_db = -1;
        replicationScriptCacheFlush();
        return C_OK;
    }
    return C_OK; /* unreached */
}
```

而对于这 3 个管道的回收工作, 是在
[backgroundRewriteDoneHandler](https://github.com/antirez/redis/blob/db8a945cbb861045428d39f960ace2bd99916a0b/src/aof.c#L1358)
中进行的, 这个函数还是在 `serverCron` 函数中被调用:

``` c
        if ((pid = wait3(&statloc,WNOHANG,NULL)) != 0) {
            int exitcode = WEXITSTATUS(statloc);
            int bysignal = 0;

            if (WIFSIGNALED(statloc)) bysignal = WTERMSIG(statloc);

            if (pid == -1) {
                serverLog(LL_WARNING,"wait3() returned an error: %s. "
                    "rdb_child_pid = %d, aof_child_pid = %d",
                    strerror(errno),
                    (int) server.rdb_child_pid,
                    (int) server.aof_child_pid);
            } else if (pid == server.rdb_child_pid) {
                backgroundSaveDoneHandler(exitcode,bysignal);
            } else if (pid == server.aof_child_pid) {
                /* NOTE: 这里调用清理函数. */
                backgroundRewriteDoneHandler(exitcode,bysignal);
            } else {
                if (!ldbRemoveChild(pid)) {
                    serverLog(LL_WARNING,
                        "Warning, detected child with unmatched pid: %ld",
                        (long)pid);
                }
            }
            updateDictResizePolicy();
        }
```

注意到执行 `backgroundRewriteDoneHandler` 函数的条件是 `pid == server.aof_child_pid`,
而如果 fork 子进程失败 (如我们遇到的内存不足这种情况) 时, 之前创建的管道就不会被
关闭了.

由于 `serverCron` 函数默认配置下每秒会执行 10 次, 在出问题的情况下每次都会触发重
写 aof 的机制, 每次都会泄露 3 个管道, 即 6 个 fd. 以这样的速度, 即使配置了 10240
个 fd, 也只需要不到 3 分钟就能耗尽...

这个问题已经在 2 月 20 日修复并合并到 3.2 分支的代码中, 但还没有发布新版本,
也就是说在截止目前最新的 3.2.8 版本 Redis 中, 这个问题是仍未被修复的.
