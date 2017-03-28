---
date: 2016-01-17T17:04:31+08:00
title: Cygwin 环境下 SSH 的权限配置问题
---


Windows 和 *nix 的权限系统有很大的差别, 所以虽然 Cygwin 移植了 *nix
系统中的一些程序到 Windows, 但实际使用过程中还是有一些坑需要注意,
这里把自己遇到的问题和解决方法做一简单记录.
<!--more-->

1. 刚安装好 Cygwin 的情况下, 输入 `ssh -T git@github.com`, 会提示如下信息:

``` Text
Could not create directory '/home/username/.ssh'.
The authenticity of host 'github.com (xxx.xxx.xxx.xxx)' can't be established.
RSA key fingerprint is xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.
Are you sure you want to continue connecting (yes/no)? yes
Failed to add the host to the list of known hosts (/home/username/.ssh/known_hosts).
Permission denied (publickey).
```

看错误提示, 可以知道 ssh 找不到并且无法创建 /home/username/.ssh/ 文件夹,
因此无法保存服务器公钥签名到 known_hosts 文件, 同时也无法读取 .ssh/config 配置文件.

出现这种情况的原因是因为 Cygwin 修改了 HOME 目录的路径. ssh 寻找的是 ~/.ssh/
目录, 在 Linux 系统中, 对应的是 /home/username/.ssh/, 然而 Cygwin
实际上并不会为用户创建这个目录, 因此它是不存在的.

解决方法: 将用户的 HOME 目录设置为 Windows 下的用户目录. C:\Users\ 目录在 Cygwin
中对应 /cygdrive/c/Users, 执行 `cygpath -H` 也可以确认这一点. 因此, 在 bash
环境下执行 `mkpasswd -l -p "$(cygpath -H)" > /etc/passwd` 即可.

2. 在处理完上述操作后, ssh -T 提示 “Bad owner or permissions”

默认情况下创建的文件夹权限是 770, ssh 认为这样的权限太开放了, 会存在安全隐患.
同时, 如果使用的 Windows 账户是 Administrator, 文件夹的所有者可能会是 Administrator
和 Administrators 两种, 因此也需要作修改.

解决方法: 执行如下语句

``` Text
chown -R username .ssh/
chmod -R 600 .ssh/
```

3. 权限修改成功后, ssh -T 提示 “Permission denied (publickey).”

由于 Git 仓库只能使用私钥进行使用, 因此需要配置 RSA 私钥.

解决方法: 将自己 Github 公钥对应的私钥放到 .ssh/ 目录下, 修改文件名为 id_rsa,
并且权限也要设为 600. 同时, 如果已经有另一个 id_rsa 并作他用的话, 也可以创建
config 文件来指定 Github 使用的私钥. 创建 .ssh/config 文件并写入以下内容:

``` Text
Host github.com
Hostname github.com
User git
IdentityFile ~/.ssh/key_name
```

然后现在再执行 `ssh -T git@github.com`, 可以看到验证成功的消息了:

``` Text
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```
