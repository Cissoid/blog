---
date: 2016-05-11T15:58:18+08:00
title: 创建一套简单的 Vim 文件模板
---


最近尝试了一下在 Vim 中实现一个简单的文件模板功能, 总共只写了 3 个函数就完成了自己的需求,
再次体现出 Vim 强大的可定制性.
<!--more-->

# 1. 创建新文件时自动填入模板.

## 1.1. 编写一个简单的模板, 以 C 语言的模板为例.

``` C
/*
 * File Name: [:VIM_EVAL:]expand('%:t')[:END_EVAL:]
 * Author:
 * Created At: [:VIM_EVAL:]strftime('%Y-%m-%d %H:%M:%S')[:END_EVAL:]
 * Last Modified: [:VIM_EVAL:]strftime('%Y-%m-%d %H:%M:%S')[:END_EVAL:]
 */
#include <stdio.h>

int main(int argc, char **argv) {
    printf("Hello World\n");
    return 0;
}
```

其中使用 `[:VIM_EVAL:][:END_EVAL:]` 来作为替换变量的标志. 中间的部分会使用 `eval()` 执行.

## 1.2. 在 vimrc 中添加如下函数.

``` Vim
function! s:AddFileTemplate(filetype)
    let l:template = '~/.vim/templates/' . a:filetype . '.template'
    let l:writecmd = '0read ' . l:template
    silent! execute l:writecmd
    let l:exec_line = '1,' . min([line('$'), 10])
    let l:eval_regex = '\[:VIM_EVAL:\](.+)\[:END_EVAL:\]'
    let l:eval_func = '\=eval(submatch(1))'
    let l:execcmd = l:exec_line . 's/\v\C' . l:eval_regex . '/' . l:eval_func . '/g'
    silent! execute l:execcmd
endfunction
```

这里假定模板文件是放置在 `~/.vim/templates` 目录下.

## 1.3. 增加 autocmd, 当新建文件时自动填入模板.

``` Vim
autocmd BufNewFile *.h,*.c call s:AddFileTemplate('c')
```

# 2. 保存文件时自动更新时间戳.

## 2.1. 在 vimrc 中添加如下函数.

``` Vim
function! s:UpdateFileTemplate()
    let l:exec_line = '1,' . min([line('$'), 10])
    let l:modify_regex = '(Last Modified: )@<=([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})'
    let l:eval_func = '\=eval("strftime(\"%Y-%m-%d %H:%M:%S\")")'
    silent! normal! mm
    silent! execute l:exec_line . 's/\v\C' . l:modify_regex . '/' . l:eval_func . '/'
    silent! normal! 'm
    silent! execute 'delmarks m'
    silent! normal! zz
endfunction
```

## 2.2. 增加 autocmd

``` Vim
autocmd BufWritePre *.h,*.c call s:UpdateFileTemplate()
```
