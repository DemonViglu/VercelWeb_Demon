# 一个简单的顶点/片元着色器

??? note "示例代码"
    ``` cpp 
    Shader "Unity Shaders Book/Chapter 5/Simple Shader"{
	Properties{
		_Color ("Color Tint",Color) = (1.0,1.0,1.0,1.0)
	}

	SubShader{
		Pass{
			CGPROGRAM

			#pragma vertex vert
			#pragma fragment frag

			fixed4 _Color;

			struct a2v {
				float4 vertex : POSITION;
				float3 normal : NORMAL;
				float4 texcoord : TEXCOORD0;
			};

			struct v2f{
				float4 pos:SV_POSITION;
				fixed3 color : COLOR0;
			};

			v2f vert(a2v v) {
				v2f o;
				o.pos=UnityObjectToClipPos(v.vertex);
				o.color =v.normal*0.5+fixed3(0.5,0.5,0.5);
				return o;
			}

			fixed4 frag(v2f i) : SV_Target{
				return fixed4(i.color,1.0);
			}

			ENDCG
		}
	}
    }
    ```

## 代码基础结构
- Shader下可以有多个 _SubShader_（每个SubShader表示适配某个显卡，如果都不适配，则会调用默认的SubShader）
- _Properties_ :在里面定义一些属性。

!!! warning ""
    在定义属性的时候，要注意与Properties中声明的类型和属性名称保持一致

- _a2v_ :application to vertex shader
- _v2f_ :vertex shader to fragment shader
- _#pragma vertex name_ :用于表明，`name`函数是vertex内的。frag同理。
- _关于语义_ ： 在上文的 `SV_POSITION`,`POSITION`这些皆为语义，用来告诉渲染器这些变量从哪来到哪去。

!!! warning ""
    顶点着色器的输出结构必须包含`SV_POSITION`。顶点着色器主要功能是将顶点从模型空间转换到裁剪空间，并通过`SV_POSITION`告诉渲染器。