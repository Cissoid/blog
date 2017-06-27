---
cloudmusic:
date: 2017-05-25T15:40:11+08:00
license: by-nc-sa/4.0
title: Let's Encrypt 证书在 Nginx 上的配置方法
---

在现如今运营商劫持已变得司空见惯, 同时网络安全形势愈发严峻的大环境下, 为自己的网站上全站
HTTPS 是很有必要的. 然而个人小站用每年 N 美刀的付费证书似乎又没有必要, 如果有免费的解决方案当然最好不过.

曾经有一个还不错的免费证书提供商 [StartSSL](https://www.startssl.com), 但后来,
该公司被中国公司沃通 (WoSign) 收购, 并且做出了一些比较龌龊的事, 导致 Mozilla 和 Google
都相继宣布不再信任该公司签发的证书, 所以现在还是放弃这家吧...

Let's Encrypt 算是最近几年比较流行的免费 HTTPS 证书方案了,
但它的证书申请方式和其他一手交钱一手交货的证书分发机构不太一样, 因此在这里记录一下自己的申请过程.
<!--more-->

# 申请 Let's Encrypt 证书
### 1. 安装 certbot.
[Let's Encrypt 官网](https://letsencrypt.org) 推荐使用的 ACME 客户端是 [Certbot](https://certbot.eff.org),
其在各个平台下的安装方法可见官网. Ubuntu 下, 可以直接添加 ppa 源进行安装:

``` shell
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install certbot
```

### 2. 配置 Nginx, 以便使用 webroot 方式申请证书.
Certbot 提供了两种方式方式验证域名所有权:
1. standalone 方式, 临时启动一个监听 443 端口的服务, Let's Encrypt 
服务器会访问这个服务来确认你是域名的所有者.
2. webroot 方式, 访问 http://yourdomain.com/.well-known/ 目录下的指定文件来验证身份.

standalone 的方式看似要简单一点, 但有一个问题, 如果使用这种方式验证域名的话,
以后更新证书时, 也需要用同样的方式, 所以如果你有业务监听 443 端口的话,
每次更新证书时都要停掉业务...基本上, 还是不要用这种方式比较好.

为了使用 webroot 方式验证, 在 Nginx 中增加以下配置:

``` nginx
    location ~ /.well-known {
        root /var/www/letsencrypt;
    }
```

这里我把 webroot 路径设为 /var/www/letsencrypt. 当然也可以任意设置, 只要确认有访问权限即可.

### 3. 申请证书
申请证书的步骤 Certbot 官网上都有, 无非就是执行 `sudo certbot certonly`
后按照提示选择即可, 需要注意的是在输入 webroot 的地方需要填入上一步 Nginx
中设置的 `root` 路径.

申请成功后, 证书放在 `/etc/letsencrypt/live/yourdomain.com/` 目录下, 包含 4 个文件:
`privkey.pem`, `fullchain.pem`, `chain.pem`, `cert.pem`, 对每个文件的描述可见 README:

``` text
This directory contains your keys and certificates.

`privkey.pem`  : the private key for your certificate.
`fullchain.pem`: the certificate file used in most server software.
`chain.pem`    : used for OCSP stapling in Nginx >=1.3.7.
`cert.pem`     : will break many server configurations, and should not be used
                 without reading further documentation (see link below).

We recommend not moving these files. For more information, see the Certbot
User Guide at https://certbot.eff.org/docs/using.html#where-are-my-certificates.
```

### 4. 配置自动更新

由于 Let's Encrypt 证书只有 3 个月的有效期, 到期前需要更新证书, 因此可以在 crontab
中增加计划任务来自动做这件事. 执行 `sudo crontab -e` 后输入:

``` text
0   2   *   *   *   /usr/bin/certbot renew -q --renew-hook "/bin/systemctl reload nginx" >>/var/log/certbot.log 2>&1 &
```

这个计划任务的作用是每天 2 点调用 certbot 自动更新证书, 若更新成功, 就重新加载 Nginx 配置.

至此, 证书就申请好了.

# 在 Nginx 中配置并使用证书
由于 Nginx 默认使用的是 1024 位 的 DHE 密钥, 为了进一步加强连接的安全性,
我们可以生成更高强度的密钥. 执行 `sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 4096`
来生成 4096 位的密钥, 并保存到 `/etc/ssl/certs` 目录下.

在 Nginx 中增加以下配置:

``` nginx
server {
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
    ssl_ecdh_curve secp384r1;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    ssl_dhparam /etc/ssl/certs/dhparam.pem;
}
```

重新加载 Nginx 配置, 此时打开浏览器, 就可以看到地址栏的小绿锁了.

# 参考
- https://certbot.eff.org
- [How To Secure Nginx with Let's Encrypt on Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04)
