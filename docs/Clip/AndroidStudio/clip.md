# 哈哈哈

## This 指针
``` cpp
	//比如
	class A{
		public fun GetThis(){
			return this@A;
		}
	}
```

## 获取class

``` cpp
	//ex
	MainActivity::class.java
```

## 关于为什么Android样例没有使用 GetViewByID
[链接](https://blog.csdn.net/Patrick_yuxuan/article/details/140540733)

## 跳转页面服务
``` cpp
	//跳转链接
	startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://demonviglu.world")))
	//跳转Activity
	startActivity(new Intent(MainActivity.this,AnotherActivity::class.java))

	//隐式Intent:如下文xml配置，是MainActivity中跳转到AnotherActivity
	startActivity(new Intent("DemonViglu"))
```
**Manifest.xml :**

``` html
	<activity
		android:name=".AnotherActivity"
		android:exported="true"
		android:label="@string/app_name"
		android:theme="@style/Theme.Calender">
		<!--上文的android:exported = true，是指可以导出该配置，外部应用可以通过此内部信息跨应用调用此应用-->
		<!--此乃一个隐式Intent，name类似R.id，只是一个索引器，可以随便写，-->
		<intent-filter>
			<action android:name="DemonViglu" />

			<category android:name="android.intent.category.DEFAULT" />
		</intent-filter>
	</activity>
```

## Activity之间通信

??? note "EX"
	```cpp
		class A{
			private void Func(){
				Intent i = new Intent(A.this,B.class);
				i.pushExtra("CustomData",new Data());//Data需继承序列化
				startActivityForResult(i,int requestCode = 0);
			}

			protected override void onActivityResult(int requestCode,int resultCode,Intent data){
				super.onActivityResult(requestCode,resultCode,data);
				string s = data.getString("stringData")
			}
		}

		class B{
			OnCreate(){
				Intent i = getIntent();
				Data d = i.getSerializeExtra("CustomData");
			}

			private void BackToA(){
				Intent i = new Intent();
				i.putExtra("stringData","DemonViglu");
				setResult(int resultCode = 1,i);
				finish();
			}
		}
	```

## 小信息弹窗
``` kt
	Toast.makeText(this,"Try to connect to DemonViglu's World!",Toast.LENGTH_SHORT).show()
```
