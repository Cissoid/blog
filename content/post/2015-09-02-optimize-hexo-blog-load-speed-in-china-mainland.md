---
date: 2015-09-02T14:57:00+08:00
title: 优化 Hexo 博客在国内的访问速度
---


使用 Hexo + Github Pages 可以很方便地搭建起免费的静态博客站点. 然而 Github
在国内的访问速度往往不尽如人意, 因此可以在国内的 GitCafe 上部署一套镜像,
让国内的 IP 访问到 GitCafe Pages,  这样就 OK 了.
<!--more-->

大致的步骤如下:

1. 需要有一个自己的域名, 并且托管到 DNSPod 上.
2. 需要已经搭建好 Github Pages 站点, 并且设置好 CNAME 文件, 指向自己的域名.
3. 需要在 GitCafe 上建立一个支持 Pages 服务的 Repository, 因此 repo name
必须和用户名一致. 自定义域名设置中, 同样指向自己的域名.
4. 修改 Hexo 的 \_config.yml, 增加 deploy 项, 使得部署时会同时部署到 Github 和
GitCafe. 其中 GitCafe 的 branch 需要设置为 `gitcafe-pages`.
5. 修改完成后, 执行 `hexo deploy`, 应该就可以看到同时部署到了 Github 和 GitCafe 了.
此时通过 username.github.io 和 username.gitcafe.io 访问到的页面看起来应该是完全一样的.
6. 在 DNSPod 中增加如下记录:
	1. 新建一条 CNAME 记录, 主机记录为 blog （或其他需要的）, 线路类型为默认,
    记录值为 Github Pages 的域名, 如 cissoid.github.io.
	2. 再建一条 CNAME 记录, 主机记录与上一条一致, 线路类型为国内, 记录值为 gitcafe.io.

完成上述设置后, 测试一下.

在国内 dig blog.wxh.me, 可以看到

``` Text
;; ANSWER SECTION:
blog.wxh.me.		579	IN	CNAME	gitcafe.io.
gitcafe.io.		382	IN	A	103.56.54.5
```

而在海外的 VPS 上执行同样操作, 看到返回的内容是

``` Text
;; ANSWER SECTION:
blog.wxh.me.		599	IN	CNAME	cissoid.github.io.
cissoid.github.io.	3599	IN	CNAME	github.map.fastly.net.
github.map.fastly.net.	10	IN	A	199.27.79.133
```

无疑, 配置成功.
