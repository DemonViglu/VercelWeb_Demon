# Andriod Studio 的开发环境配置（新版本）

## 下载

1. 基础的Studio[下载](https://developer.android.google.cn/studio?hl=zh-cn),点击 `Android Stdio Koala Feature Drop`按钮即可。
2. SDK下载。因为笔者有旧的，这里我没干:P

## 配置

- 这里可以先新建一个项目，稍后会进行SDK,Gradle,Maven等环境的配置。

### SDK
- 在新版本中，SDK和JDK等的设置便携许多。找到 `Settings`中的`Android SDK Location`，即为`SDK`存储路径。如果你有旧的，把它放在这里即可。如果没有，似乎 _Studio_ 可以一键帮你去下载在该路径下。<del>你也不想你的C盘被灌满吧</del>
  
### Gradle
- 由于国内网络问题，相信巨大多数人都被`Gradle`的配置爆红给烦恼过。

!!! note "经典报错之"
	The specified Gradle distribution xxx does not exist.

- 网上的教程大抵为几年之前的攻略，与现在的配置似乎已经不太一样。但大体的配置思路并未改变。首先我们手动下载 `gradle-XXX-bin.zip`。
- 打开项目文件中的 `gradle\wrapper\gradle-wrapper.properties`文件。可以看到，`distributionBase`是 `GRADLE_USER_HOME`，即你希望的存储`gradle`的基础路径。然后它会在`Wrapper\dist`路径下创建一个文件夹，内容为`gradle-XX-bin`。如果你尝试生成过 _gradle_ 文件，则该文件夹下还会有一个乱码文件夹。先前所下载的`zip`文件便是需要放置于此。
- 最终呈现形式如下。
<br> `GRADLE_USER_HOME\wrapper\dist\gradle-XX-bin\kf9q8249f18h9918u4oi\gardle-XX-bin.zip`<br>你要做的，就是将zip放在该路径最后即可。前面的路径都是设置和它自动生成的。

### 别的插件下载的报错

- 如果报了别的错，诸如`Plugin [id: 'org.jetbrains.kotlin.android', version: '1.9.0', apply: false] was not found in any of the following sources:`等神奇错误，基本上就是因为网络连接问题导致没有将相应的包下载下来。
- 旧版的 `Android Studio`有一个文件叫`build.gradle`，新版的好像没有，但有一个叫`build.gradle.kts`的文件。在里面的顶端加上如下旧版可用的代码块，就会报`Compile Error`...真无语。

```
	maven { setUrl("https://maven.aliyun.com/repository/central") }
	maven { setUrl("https://maven.aliyun.com/repository/jcenter") }
	maven { setUrl("https://maven.aliyun.com/repository/google") }
	maven { setUrl("https://maven.aliyun.com/repository/gradle-plugin") }
	maven { setUrl("https://maven.aliyun.com/repository/public") }
	maven { setUrl("https://jitpack.io") }
```
- Proxy代理：打开 `Settings` 中的`HTTP Proxy`设置,选择`Auto-detect proxy settings`,然后`URL`中填入
```
	https://mirrors.aliyun.com/android.googlesource.com/
```
但我并不知道该方法是否有效，因为不能保证后面又崩了几次红成功后，不是因为下面的大法而通过的...
- 所以笔者用的是重启大法。不就是网络连不上，多刷几次，总有机会能连上的... :(

### 别的报错
- `e:file:///G:/AndroidStudioPack/AndroidProject/build.gradle.kts:2:1: Unresolved reference` emmm仔细读了下报错日志，这是该文件下的第二行出现了编译错误的问题。因为在上文我错误的将旧版可行的 `setUrl`代码块丢到此处，就会报该错误。