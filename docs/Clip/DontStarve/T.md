# 饥荒联机开服攻略

## 下载准备

- _Steam_ 中下载 `Don't Starve Together Dedicated Server` 和 `饥荒联机版`。 <del>如果找不到前者，在steam的库分类中勾选`工具`。</del>
- 打开二者所在的本地文件夹。


## 创建世界和获取令牌

- 创建一个世界就没什么好说的了。
- 令牌获取：
  1. 在饥荒游戏主界面中点击左下角的`账号`。
  2. 点击弹出网页窗口的菜单栏中的`游戏`。
  3. 在下方输入所想的服务器名字，并点击`添加服务器`。
  4. 可以在新建的服务器列表中看到`访问令牌`字眼，于是访问令牌获取成功。

## 配置Klei地图存档等信息

??? note ""
	下文的所有`X`均表示为数字。

- 一般性而言，打开电脑中 `文档/Klei/DoNotStarveTogether/XXXXXXXX`，即世界的存档位置。
- 将`Cluster_X`的整个文件夹复制到上一级目录，即`文档/Klei/DoNotStarveTogether`当中。
- 打开`Cluster_X`文件夹，创建一个 _txt_ 文件，并命名为`cluster_token`。将刚才获取到的访问令牌复制并粘贴到该 _txt_ 文件当中。

## 添加Mod(可选)

- 打开`饥荒联机版`中的`mods`文件夹，将其中的所有文件复制到`Don't Starve Together Dedicated Server/mods`路径下。

## 配置服务器启动器

- 打开`Don't Starve Together Dedicated Server/bin/scripts`路径,右键编辑`.bat`文件。
- 修改".exe" 之后 的英文为 `-console -shard Master`和 `-console -shard Caves`。
??? note ""
	不用说，这个bat文件就这么几行。无非是，终端不输出命令，set Steam，然后定位文件夹，执行可执行程序，并末尾配上字符串参数。但我暂未研究是否需要空格,但最好还是隔开吧。我懒得尝试错误。

!!! warning ""
	旧版的教程可能会在上一步中多一个参数，即`-conf_dif -Cluster_X`，但我查看日志发现它会自动搜索该`dir`路径下的`Cluster_1`。所以，不需要设置该参数，并且，将你所想要联机的存档，改名为`Cluster_1`，他才能定位过去。

## 关服务器：
- Terminal 中 键入 
	```
		c_shutdown()
	```