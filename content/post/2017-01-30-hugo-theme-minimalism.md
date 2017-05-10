---
date: 2017-01-30T21:55:23+08:00
title: Minimalism -- 极简 Hugo Theme
---

最近把静态 Blog 生成工具由之前的 [Hexo](https://hexo.io) 切换到了 [Hugo](https://gohugo.io),
没有特别的原因, 只是因为相对于 nodejs, 更熟悉且更喜欢 golang 一些...
<!--more-->

切换过来的同时, 由于没有找到符合自己喜好的主题, 就尝试着自己摸索写了一个:
[Minimalism](https://github.com/cissoid/hugo-theme-minimalism), 使用 flexbox
来解决排版及响应式的问题, 算是我这个前端苦手学习前端开发的第一步.

# 文本
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque venenatis eros ac varius blandit. Nunc pharetra tellus sed tortor imperdiet, pharetra feugiat felis finibus. Cras sit amet elit in nisi euismod congue. Nullam at quam sed sem semper pellentesque. Donec quis purus eu augue ornare venenatis. Ut sed eros nibh. Nullam mi elit, pharetra vel mi mollis, condimentum euismod urna. Pellentesque lorem felis, dapibus a tincidunt eget, rhoncus et diam. In ut metus in orci rhoncus efficitur nec venenatis ipsum.

*Pellentesque eu risus et turpis dapibus congue et interdum metus. Nulla placerat, ante sit amet suscipit fermentum, justo urna tincidunt turpis, ac dignissim eros felis ut nisl. Integer metus metus, consectetur a justo dictum, finibus commodo diam. Nunc maximus nec lectus in semper. Donec libero sapien, convallis eu venenatis ac, vehicula eu justo. Curabitur velit risus, condimentum vel quam ut, pulvinar aliquet purus. Duis consequat massa sit amet dolor suscipit elementum id id tortor. Pellentesque venenatis convallis ipsum eu accumsan. Maecenas a dolor sem.*

**Nam turpis sem, facilisis eu rhoncus nec, mattis vel nunc. Nulla volutpat mauris vitae ipsum accumsan, quis scelerisque arcu volutpat. Suspendisse a ipsum non urna tempus volutpat. Proin interdum pretium mauris sit amet porta. Aliquam erat volutpat. Proin vel neque sem. Praesent tristique sit amet neque ac hendrerit. Sed porttitor, massa ac ultrices efficitur, dui metus consequat dolor, vitae consectetur massa leo eget enim. Nunc eu faucibus ipsum.**

> Sed ut bibendum ipsum, non interdum erat. Fusce in porttitor velit. Nullam vitae elementum felis. Sed nec ultrices est. Nulla facilisis mattis nunc. Quisque leo nisi, pulvinar eget dignissim sit amet, porta vel ante. Phasellus pellentesque ac sem vitae pharetra. Phasellus efficitur sem eu felis euismod commodo eget et risus. Quisque sit amet tincidunt nibh. Nullam fermentum, odio vel venenatis egestas, risus tellus fermentum purus, eu accumsan massa velit quis est. Vestibulum sit amet sapien orci.

# 图片
![](https://unsplash.it/g/768/432?random)

# 列表
1. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
2. Mauris at libero convallis, tempus risus eu, malesuada urna.
3. In eu est ullamcorper, egestas metus sed, convallis neque.
4. Sed a dolor semper orci rutrum blandit ac vel nisi.
5. Praesent eget felis sit amet quam fringilla sodales ac a purus.

- Quisque fringilla nisi sed ipsum porta facilisis.
- Vestibulum sollicitudin purus at tempor aliquet.
- Morbi a nisi vel sapien gravida facilisis.
- Donec posuere sem ut enim pretium luctus.
- Donec ac mi fermentum, hendrerit libero et, egestas lacus.

# Checklist
- [x] [links](http://www.baidu.com), **formatting**, and <del>tags</del> supported
- [x] list syntax required (any unordered or ordered list supported)
- [x] this is a complete item
- [ ] this is an incomplete item

# 代码
I think you should use an `<addr>` element here instead.

Press <kbd>Ctrl + C</kbd>.

``` python
#!/usr/bin/env python
# coding: utf-8

def main():
    print('Hello World')
     

if __name__ == '__main__':
    main()
```

# 表格
| First Header                | Second Header                |
|:---------------------------:|:----------------------------:|
| Content from cell 1         | Content from cell 2          |
| Content in the first column | Content in the second column |

# twitter
{{< tweet 666616452582129664 >}}

# Youtube
{{< youtube w7Ft2ymGmfc >}}

# Vimeo
{{< vimeo 146022717 >}}

# Github gist
{{< gist spf13 7896402 >}}

# Speaker deck
{{< speakerdeck 4e8126e72d853c0060001f97 >}}

# Instagram
{{< instagram BMokmydjG-M >}}
