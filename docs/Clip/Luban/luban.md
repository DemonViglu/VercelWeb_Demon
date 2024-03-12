# Luban 的基础配置开发文档
- 首先，笔者是出于看官方文档两个钟头大，所以自行写出了该文档记录，主要是解决如何实现自定义数据结构的配表转成json文件。所以下文也许只能给你一些参考。
- [官方文档](https://luban.doc.code-philosophy.com/docs/intro)；

## Luban工具的下载

- 安装[`dotnet sdk 7.0`](https://dotnet.microsoft.com/zh-cn/download/dotnet/7.0)或更高版本sdk
- 下载[`luban_examples`](https://github.com/focus-creative-games/luban_examples)项目。该项目中包含测试配置以及大量的示例项目。为方便起见，后续提及到的文件，默认都指这个项目中的文件。
- 下载`Luban`工具。从[`release`](https://github.com/focus-creative-games/luban/releases)下载`uban.7z`文件，直接解压到`Tools`目录下即可，确保最终Luban程序的位置为`luban_examples/Tools/Luban/Luban.dll`。

!!! warning ""
    注意Luban文件夹不要多一个

## 准备文件前的初始化

- 如果直接在官方的样例上进行修改，会多出很多令人头大又不知道哪里来的文件。所以这里笔者将很多文件全删了(备份到别处)。
1. `luban_example\luban_examples-main\DataTables\Defines`下的文件可以全挪走。这些是官方样例的一个定义文件。
2. `luban_example\luban_examples-main\DataTables\Datas`下的文件，除了保留三个，其余可以全部挪走(DELETE)。剩下三个分别是`_beans_.xlsx`,`_tables_.xlsx`,`_enums_.xlsx`。
3. 这两个文件夹将会是我们主要的数据配置准备的文件夹。刚才第二步剩余的三个文件，将该三个文档除了前三行保留，其余全部删除。(<del>后续笔者会讲解一下这里的基础用法。不过我也刚学一天，救命，官方文档太...</del>)
4. 新建一个`gen.bat`文件，（理论上是不需要考虑该文件存放位置的，但是笔者建议放在`luban_example\luban_examples-main`目录下）。然后copy下面代码。
``` cpp
    set LUBAN_DLL=Tools\Luban\Luban.dll
    set CONF_ROOT=DataTables

    dotnet %LUBAN_DLL% ^
    -t client ^
    -d json  ^
    --conf %CONF_ROOT%\luban.conf ^
    -x outputCodeDir=<你的文件要输出代码的路径> ^
    -x outputDataDir=<你的json文件要输出的路径>
pause
```

!!! warning ""
    这里笔者是准备将数据配置成json文件，所以这里的-d是json。而要输出别的数据，还是需要看官方示例去进行相应的配置，修改bat文件。
    And, 代码里的<>尖括号也要删掉，别傻乎乎的像我一样留着。

## Summary

- 至此，基本工作已经准备完成。请移步到基础语法讲解。