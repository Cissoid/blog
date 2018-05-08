---
title: Web 字体设计总结.
date: 2017-04-13T15:13:56+08:00
categories:
tags:

minimalism:
    cloudmusic:
    license: by-nc-sa/4.0
---

[Interactive Guide to Blog Typography](http://www.kaikkonendesign.fi/typography/)

此文用可视化的例子讲解了 web 字体设计中的一些参数及其效果.
1. 正文 line height 应设为 150% 为宜.
2. 标题 line height 应设小一些, 如 110%.
3. 如果只使用了同一种字体, 则应确保可以通过不同的 weight 来很好的区分;
否则就使用两种字体; 如非必要, 不应使用两种以上的字体.
4. 不应使用 #000000, 可以标题 #222222, 正文 #444444. 这样既能保持较好的对比度,
又有层次感.


[Contrast Through Scale](http://typecast.com/blog/contrast-through-scale)

此文列举了集中设置 font-size 的方法.
1. 常用设置

``` css
body { font-size:100%; }
h1 { font-size: 2.25em; /* 16 x 2.25 = 36 */ }
h2 { font-size: 1.5em; /* 16 x 1.5 = 24 */ }
h3 { font-size: 1.125em; /* 16 x 1.125 = 18 */ }
h4 { font-size: 0.875em; /* 16 x 0.875 = 14 */ }
p { font-size: 0.75em; /* 16 x 0.75 = 12 */ }
```

2. 类似 fabonacci 数列的递增规则. 

``` css
body { font-size: 100%; }
h1 { font-size: 4em; /* 16 x 4 = 64 */ }
h2 { font-size: 2.5em; /* 16 x 2.5 = 40 */ }
h3 { font-size: 1.5em; /* 16 x 1.5 = 24 */ }
p { font-size: 1em; /* 16 x 1 = 16 */ }
```

3. 黄金分割比

``` css
body { font-size: 62.5%; }  /* Sets our base type size to 10px, easing the maths. */
h1 { font-size: 6.7773em; /* 10 x 6.7773em = 67.773 */ }
h2 { font-size: 4.1887em; /* 10 x 4.1887em = 41.887 */ }
h3 { font-size: 2.5888em; /* 10 x 2.5888em = 25.888 */ }
p { font-size: 1.6em; /* 10 x 1.6 = 16 */ }
```

[The Elements of Typographic Style Applied to the Web](http://webtypography.net/)

1. word-spacing: 默认 0.25em. em 的来源是宽度约等于字母 M.
2. measure 在 45-75 字符较为合适, 通常单列文本 66 字符, 多列文本 40-50 字符.
但这只是英文阅读, 若中文? 若代码?
由于 css 没有直接控制 measure 的选项, 因此只能根据 font-size 粗略计算.
