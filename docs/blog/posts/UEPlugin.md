---
date: 2025-07-28
categories: 
    - Tech
---


# UE 插件开发


<!-- more -->


## 需求


### 在ue内实现一个可视化editor面板


<del>  1. Edit -> Plugin -> Editor Standalone -> [Input your class name] -> Create</del>


- Edit -> Plugin -> Editor Toolbar button


- 当创建插件后，项目的 _Plugn_ 文件夹中会增加以你的插件名字为名的文件夹。其中 _cpp_ 头文件和实现文件分别在 _Source_ 文件夹下的 _public_ 和 _private_ 中


??? note "插件文件夹结构"
    - DemonPlugin
        - Resources
        - Source
            - private
                - DemonPlugin.cpp
                - DemonPluginCommands.cpp
                - DemonPluginStyle.cpp
            - public
                - DemonPlugin.h
                - DemonPluginCommands.h
                - DemonPluginStyle.h
            - DemonPlugin.Build.cs
        - DemonPlugin.uplugin


- 然后在UE的 _Scene-View_ 面板上方，会多出一个按钮。点击按钮就会触发 **DemonPlugin.cpp::FDemonPluginModule::PluginButtonClicked()**。接下来点击触发的相关逻辑将会在这里进行书写。 


### filter 相关资产


- 获取相关资产，需要用到 **AssetRegistry** 来获取资产引用，具体参考详见[文档](https://dev.epicgames.com/documentation/zh-cn/unreal-engine/asset-registry-in-unreal-engine)


- 我们需要获取特定类的子类资产，所以需要用到过滤器。其方法为可使用过滤器的 **AssetRegistry.Get().GetAssets(Filter,AssetData)**.


??? note "代码示例"
    ``` cpp
        FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");   
        TArray<FAssetData> AssetData;
        FARFilter Filter;   
        //Filter.Classes.Add(UStaticMesh::StaticClass());   此处为官方示例代码，有误,现在Filter中不存在字段Classes
        //使用下面这行代码
        Filter.ClassPaths.Add(UBlueprint::StaticClass()->GetClassPathName());
        Filter.PackagePaths.Add("/Game/Meshes");    
        AssetRegistryModule.Get().GetAssets(Filter, AssetData);


        for (const FAssetData& Asset : AssetList)
        {
            UE_LOG(LogTemp, Log, TEXT("Found asset: %s"), *Asset.ObjectPath.ToString());
        }
    ```
- 当输入上面代码时，点击按钮，_Log_ 窗口输出所有的蓝图资产文件功能就已经实现


!!! warning 
    - 此处容易产生误区。对于一个蓝图资产，他的资产类型就是蓝图类。所以在检索特定的蓝图时，应当先用 _UBlueprint_ 找到所有的蓝图资产，再 ** AssetData.GetTagValue("ParentClass", parentClassPath)** 去获取其所继承的父类。
    - 注意 **ParentClass** 和 **NativeParentClass** 的区别。如果一个蓝图只是一个 _CPP_  类的编辑器，那么他的 **ParentClass** 和 **NativeParentClass** 是一个东西。但如果此蓝图继承自另一个蓝图，则  **NativeParentClass** 才是 _CPP_ 类，而 **ParentClass** 则则是蓝图资产。


- 在 Unreal Engine 的 AssetRegistry 中，蓝图资产的 ParentClass 字段（通常通过 Asset.GetTagValue("ParentClass", ParentClassPath) 获取）返回的是父类的对象路径字符串，格式如下：
        /Script/模块名.类名


        
### 获取相关资产的引用

```
    TArray<FAssetData> AssetList;
    arm.Get().GetAssets(filter,AssetList);
    FString PackageName, AssetName;
    FString assetPath = *Asset.ObjectPath.ToString();
    if (!assetPath.Split(TEXT("."), &PackageName, &AssetName))//此处是为了将模块名和资产名分离。
    {
        continue;
    }
    TArray<FName> Referencers;
    arm.Get().GetReferencers(FName(*PackageName), Referencers);
```

### 获取相关资产的版本控制信息


- _p4v_ 中关于终端命令的[文档](https://help.perforce.com/helix-core/server-apps/cmdref/current/Content/CmdRef/commands.html)

??? note "UE中的实现"
    ``` cpp
        FString FDemonPluginModule::LogVision(FString assetPath)
        {
            FString ret;
            // 1. 转换为磁盘路径
            FString PackageFilename;
            if (!FPackageName::DoesPackageExist(assetPath, nullptr, &PackageFilename))
            {
                UE_LOG(LogTemp, Warning, TEXT("Asset does not exist: %s"), *assetPath);
                return "";
            }


            // 2. 获取SourceControl Provider
            ISourceControlProvider& Provider = ISourceControlModule::Get().GetProvider();


            // 1. 先拉取历史
            TSharedRef<FUpdateStatus, ESPMode::ThreadSafe> UpdateStatusOp = ISourceControlOperation::Create<FUpdateStatus>();
            UpdateStatusOp->SetUpdateHistory(true);
            Provider.Execute(UpdateStatusOp, PackageFilename);


            // 2. 再获取状态和历史
            FSourceControlStatePtr SourceControlState = Provider.GetState(PackageFilename, EStateCacheUsage::Use);


            if (SourceControlState.IsValid())
            {
                int32 Size = SourceControlState->GetHistorySize();
                //UE_LOG(LogTemp, Log, TEXT("historysize: %d "), Size);
                for (int32 Index = 0; Index < Size; ++Index)
                {
                    const auto& Revision = SourceControlState->GetHistoryItem(Index);
                    FString Description = Revision->GetDescription();
                    FString UserName = Revision->GetUserName();
                    FDateTime Date = Revision->GetDate();
                    int32 RevisionNumber = Revision->GetRevisionNumber();


                    //UE_LOG(LogTemp, Log, TEXT("Revision: %d, User: %s, Date: %s, Desc: %s"),
                    //  RevisionNumber, *UserName, *Date.ToString(), *Description);
                    ret += FString::Printf(TEXT("Revision: %d, User: %s, Date: %s, Desc: %s \n"),RevisionNumber, *UserName, *Date.ToString(), *Description);
                }
                return ret;
            }
            else
            {
                UE_LOG(LogTemp, Warning, TEXT("Failed to get source control state for: %s"), *PackageFilename);
            }


            return "";
        }
    ```

## Tips

### 关于 .Build.cs 和 .uplugin 文件


- 笔者暂时没有深耕其具体在编译过程中的作用，如下都是笔者随使用而对其功能做出的猜测。


- _uplugin_ 文件中，两个字段比较重要。一个是 _Module_ 字段，其下是自身插件所有的模组。另一个是 _plugin_ 字段，其中是你所希望引用的其他模块所属的插件。


- 但是 _uplugin_ 文件中虽然声明了插件的引用，但自身模块实现时，还需要在 _build.cs_ 文件中再次在 _DependencyModuleNames_ 字段中添加具体所需要引用的模块。


- 对于修改此配置，是否需要重新生成解决方案存疑。这个操作实在是太漫长了。


### 插件和项目的关系


- 对于项目引用插件，如果去查看 _.uproject_ 文件，可以发现里面显式声明了项目所依赖的所有插件。


- 但插件引用插件，没有统一的文件进行管理。而是又上文的文件进行动态链接。


### 关于蓝图资产的检索


- 蓝图资产（.uasset）在资源管理器里是 UBlueprint 类型。
- 用 Filter.ClassPaths.Add(UMyClass::StaticClass()->GetClassPathName())，只能查到资产本身就是 UMyClass 类型的资源（比如 C++类、DataAsset等），查不到蓝图。
- 蓝图资产的“父类”信息，实际存储在蓝图的元数据（如 ParentClass 或 GeneratedClass 字段）里。
- 所以只能用 UBlueprint 作为 filter 查出所有蓝图，再遍历这些蓝图的 ParentClass 字段，判断它是否继承自 UMyClass。