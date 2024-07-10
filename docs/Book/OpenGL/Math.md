# 数学知识

## 四元数
- 形如$(t,x,y,z)$;
- 其中t为实数，而x,y,z分别为复平面i,j,k的系数

$$
q=t+x*\overrightarrow{i}+y*\overrightarrow{j}+z*\overrightarrow{k}
$$

$$
其中： i^{2}=j^{2}=k^{2}=i*j*k=-1
$$

### 运算规则

$$
q_{1}^{}*q_{2}^{}=(\overrightarrow{v_{1}^{}}\times \overrightarrow{v_{2}^{}}+w_{1}^{}\overrightarrow{v_{2}^{}}+w_{2}^{}\overrightarrow{v_{1}^{}}+w_{1}^{}w_{2}^{}-\overrightarrow{v_{1}^{}}\cdot \overrightarrow{v_{2}^{}})
$$

### 四元数应用旋转 Example
- 将坐标$p(1,0,0)$围绕$(0,1,0)$旋转90°

1. 将坐标拓展到四元数$p=(1,0,0,0)$; _末尾补充一个0即可，这个位置是实数系数_
2. 得出旋转四元数：$quaternion = (\overrightarrow{u}\cdot sin(\frac{\theta}{2}),cos(\frac{\theta }{2}))$



- 其中$\overrightarrow{u}$是旋转轴的单位向量。
- 最后对坐标四元数应用旋转四元数变换。**注意左乘顺序**
  
$$
    p'=qp=(1,0,-1,0)
$$

- 既得旋转后的坐标为$(1,0,-1)$