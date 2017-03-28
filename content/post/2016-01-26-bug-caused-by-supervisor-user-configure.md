---
date: 2016-01-26T23:02:05+08:00
title: Supervisor 切换用户所引起的一个 Bug.
---


前两天在服务器上修改 supervisor 配置时遇到了一个很奇怪的 Bug,
在这里将解决过程记录下来, 以作备忘.

<!--more-->

# 1. 问题产生

业务的部署方式是使用 gunicorn 做 wsgi 容器, 并托管在 supervisor 中执行.
在之前为图方便, **supervisor 和 gunicorn 都是以 root 权限执行的**.
现在为了安全起见, 需要将 gunicorn 的执行权限改为普通用户, 在这里用户名以 cissoid
代替. 具体的操作如下:

1. 切换代码及日志目录的所有者

``` Text
chown -R cissoid:cissoid path/to/project
chown -R cissoid:cissoid path/to/log
```

2. 修改 supervisord.conf, 将 `user=root` 修改为 `user=cissoid`, 并在 supervisor 中重启进程.

结果在执行第二步时, 发现进程无法启动, 改回 user 参数后又能正常启动.

# 2. 错误排查

在 supervisor 中提示 `ERROR (abnormal termination)`, 查看 supervisor 日志, 发现有如下日志:

``` Text
2016-01-25 21:10:42,206 INFO spawned: 'test_server' with pid 27726
2016-01-25 21:10:42,765 INFO exited: test_server (exit status 3; not expected)
2016-01-25 21:10:43,773 INFO spawned: 'test_server' with pid 27732
2016-01-25 21:10:44,270 INFO exited: test_server (exit status 3; not expected)
2016-01-25 21:10:46,278 INFO spawned: 'test_server' with pid 27738
2016-01-25 21:10:46,771 INFO exited: test_server (exit status 3; not expected)
2016-01-25 21:10:49,781 INFO spawned: 'test_server' with pid 27745
2016-01-25 21:10:50,264 INFO exited: test_server (exit status 3; not expected)
2016-01-25 21:10:51,266 INFO gave up: test_server entered FATAL state, too many start retries too quickly
```

可以看出 supervisor 多次尝试重启进程均失败, 初步推断为 gunicorn 因为权限问题导致
import 失败. 打开 gunicorn 的 debug 日志, 得到如下错误日志:

``` Text
2016-01-25 21:26:22 [11299] [INFO] Starting gunicorn 19.1.0
2016-01-25 21:26:22 [11299] [DEBUG] Arbiter booted
2016-01-25 21:26:22 [11299] [INFO] Listening at: http://0.0.0.0:8080 (27886)
2016-01-25 21:26:22 [11299] [INFO] Using worker: gevent
2016-01-25 21:26:22 [11304] [INFO] Booting worker with pid: 27887
2016-01-25 21:26:22 [11299] [INFO] 1 workers
2016-01-25 21:26:23 [11299] [INFO] Shutting down: Master
2016-01-25 21:26:23 [11299] [INFO] Reason: Worker failed to boot.
```

可以看到 gunicorn 并没有记录任何异常! Worker 在创建后马上就退出了. 此时判断问题可能出在
gevent 上, 于是用同样的参数手动执行 gunicorn, 结果代码正常地运行起来了......

由于是使用同样的用户运行的代码, 能正常跑起来, 应该就可以排除权限的问题, 剩下最大的可能性是环境变量的问题.
因此在代码中增加打印 os.environ 环境变量的语句后, 再次执行, 这次果然发现了问题:
我是以 cissoid 用户在运行, 但是 HOME 的值是 /root/, USER 的值是 root, 也就是说运行时使用的是
root 用户的环境变量. 于是我去查了下 supervisor 的文档, 发现果然如此:

> The user will be changed using setuid only. This does not start a login shell
> and does not change environment variables like USER or HOME.
> ([http://supervisord.org/configuration.html](http://supervisord.org/configuration.html))

出错的原因找到了, 确实是因为环境变量引起的,
那么环境变量不同为什么会造成这种现象呢? 继续在代码里增加一个全局的 try-catch,
发现在 import MySQLdb 时抛了异常:

``` Text
ExtractionError: Can't extract file(s) to egg cache

The following error occurred while trying to extract file(s) to the Python egg cache:

  [Errno 13] Permission denied: '/root/.python-eggs'

The Python egg cache directory is currently set to:

  /root/.python-eggs

Perhaps your account does not have write access to this directory?  You can change the cache directory by setting the PYTHON_EGG_CACHE environment variable to point to an accessible directory.
```

原因已经说得很明显了...

# 3. 结论
Python eggs 安装时会有一些 zip 压缩包, 这些压缩包在使用时会被解压到一个本地缓存目录,
这个目录在默认的情况下是 ~/.python-eggs, 因此环境变量没有改变, 使得在 supervisor
中切换用户后, 使用的缓存目录仍然是 /root/.python-eggs, 普通用户当然是没有这个目录的访问权限的.

不过很奇怪的地方在于, 异常没有在 gunicorn 中记录, 这个原因就需要有空再继续追查下去了.
