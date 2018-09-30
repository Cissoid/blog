+++
date = 2017-08-07T11:55:49+08:00
title = "使用 Netlify 自动部署支持 HTTPS 的 Hugo 博客"

[minimalism]
    license = "by-nc-sa/4.0"
+++

自动部署静态站点的方法有很多, 例如我之前使用过的 [Travis CI](https://travis-ci.org),
或是使用 github 原生支持的 [jekyll](https://jekyllrb.com/), 即使是通过 webhook
来自己实现也很简单. 今天要介绍的 Netlify 在自动部署这一块并没有什么特别之处,
它的优势在于: 支持自定义域名的 HTTPS.
<!--more-->

在知道 Netlify 之前, 我所了解的可以让静态站点使用 HTTPS 的方式有两种:
1. 托管到自己的服务器上. 这样当然想怎么折腾都可以, 但这样总感觉失去了静态博客的意义,
而且有一定的门槛: 需要有自己的服务器. 而且我并不想为此耗费自己服务器的带宽和资源,
也不想暴露服务器的 ip.
2. 使用 [Cloudflare](https://www.cloudflare.com) 的 NS 服务, 利用其提供的 `Universal SSL`
服务提供 HTTPS. 但是这样做需要把域名的 NS 服务迁到 Cloudflare, 也有点得不偿失了.
另外 Cloudflare CDN 连国内的速度貌似不怎么样, 也不知道 NS 服务又是什么情况.

而 Netlify 可以说是完美解决了以上两点, 首先, 站点是托管在 Netlify 的服务器上;
其次, 只需要加一条 CNAME 记录, 即可为站点加上 HTTPS 支持. 至少比较完美地满足了我的需求.

首先, 注册好 Netlify 账号后, 选择 `New site from Git`, 就可以通过 OAuth 的方式获取指定
repo 的访问权限, 同时也会向该 repo 增加一个 Deploy Key. 对于 Hugo 站点,
创建时的 Build command 应该填为 `pip install -U pygments; hugo -v`, 并且 Publish
directory 填为 `public`. 创建成功之后就会开始第一次构建.

在一开始的测试中, 我发现回报这样一个错误: `Unable to locate template for shortcode 'instagram'`,
按道理来说 `instagram` 这个 shortcode 是 hugo 内置的, 不应该找不到, 有可能是版本问题.
一查之下, 果然这个 shortcode 是在 Hugo 0.20 版本才加入的, 而 Netlify 默认使用的版本是 0.17.
解决方式是在项目 repo 中增加一个 `netlify.toml` 文件, 并加入以下内容:

``` ini
[context.production.environment]
    HUGO_VERSION = "0.25.1"
```

就可以指定使用的 Hugo 版本.

配置好自动部署后, 再将自定义的域名 CNAME 到对应的 Netlify 二级域名下, 并在 Netlify
中配置好 Let's Encrypt 证书就可以了.
