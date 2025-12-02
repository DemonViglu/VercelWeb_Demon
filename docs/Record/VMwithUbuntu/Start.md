# Start 

## 下载 VM Ware
- Click [Website](https://support.broadcom.com/group/ecx/downloads) and choosing **MyDownLoad**;

- Choose **VM Ware WorkStation Pro**;

- Install it;

## 下载 Ubuntu iso

- 选择 [*清华镜像源*](https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/20.04/) 中的 *Ubuntu* 版本. 

!!! note ""

    该中为笔者使用的 *20.04* 版本

## 创建 Annocanda 环境

- Click [Website](https://mirrors.tuna.tsinghua.edu.cn/anaconda/archive/) to choose the version you need;

!!! warning ""

    一定要使用比较新的版本. 不然会报错.

## 用VS Code 连接到 Remote SSH 服务器

1. 下载 *Extension -> Remote SSH*.
2. 左侧界面当中, 找到插件位置, 选择 *Open Config File*

```
    Host Final  //Named by your self
        HostName  202.120.39.48
        Port 2222
        User gezhouyi
```
3. 输入密码之后即可连接。

!!! warning "可能遇到的问题"

    如果遇到 *GLIBC* 版本不匹配问题，多半是因为对方SSH版本过久，而你的VSCode版本过新。这里有两种解决方案。

    1. 使用便携版 VSCode。

    2. 自行卸载然后下载旧版本。

## 如何指定 VS Code 的插件位置

- 相信你可以一眼看明白这个批处理命令行。

```
    F:\SchoolWork_SoftWare\FINAL_WORK\VSCode-win32-x64-1.75.1\code.exe F:\SchoolWork_SoftWare\FINAL_WORK --extensions-dir F:\SchoolWork_SoftWare\FINAL_WORK\.extensions
```

## 如何为Ubuntu分配更多的内存

- [Blog](https://blog.csdn.net/hktkfly6/article/details/123302335);

## UBuntu 异常没有网络如何解决

- 在终端中输入如下命令

```
    sudo service network-manager stop
    sudo rm /var/lib/NetworkManager/NetworkManager.state 
    sudo service network-manager start
```

- [Reference](https://juejin.cn/post/7057497897910140936)

## Conda 无法下载具体的包

```
    conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
    conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
    conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge/
```
