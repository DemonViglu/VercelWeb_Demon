# Gson 在安卓开发中的使用

## add
- 在`build.gradle.kts`的`dependencies`中填充如下语句。
  
```
	dependencies {
    implementation("com.google.code.gson:gson:2.8.8")
}
```

## Usage
- 本质就是一个json序列化库，笔者并未过多研究，随便找了一个，发现api使用十分简单，记录一下。

- Example

``` kotlin
	public class NoteData(data :MutableList<String> = 	mutableListOf()){
    	public var Notes = data
	}

	val gson:Gson = Gson()
	val a :String = gson.toJson(Notes)
	MyFile.SaveFileWithPath(fullPath,a)
```

## MyFile代码
``` kotlin
	import java.io.File

class FileHandler {

    fun SaveFileWithPath(path:String,content:String){
        File(path).writeText(content);
    }

    fun ReadFileWithPath(path:String):String{
        return File(path).readText();
    }

    fun FileWithPathExist(path:String):Boolean{
        return File(path).exists();
    }
}
```