# Title

##  IMUGPT

### Intro
- 基于HumanML3D一个带有文本描述的大型 3D 人体运动数据集（github 可搜）

### Component

1. LLM.  生成一个人执行特定活动的多样化文本描述。注意多样化。

2. Motion Synthesis 接收活动的文本描述并将其转换为三维人体运动序列。

3. Motion to IMU. IMU 惯性传感器组，估计是将动作变成可以被力学描述的数据。

### Problem 

1. When to stop generate the data。影响性能。

2. Data pollution 数据污染。

## Application

### Extension Intro

1. Diversity Metrics due to problem 1。配合饱和点识别算法，标志文本生成的停止点。增加计算效率.

2. Motion filter。过滤不准确描述动作，和可能对下游产生负面影响的运动序列。

### Diversity Metrics

- 假设运动序列和文本描述的多样性是相关的。由此可以通过计算文本描述的多样性来判断运动序列的描的多样性。

- 计算文本描述多样性，通过生成数据的嵌入（数据的向量表示）

```
- 文本描述：将文本提示通过 SentenceTransformers 的 “all-mpnet-base-v2 模型”[1,64] 生成每个提示的嵌入。该模型在十亿个句子对上进行训练，以捕获其输入文本的语义信息，因此生成的嵌入可作为句子的合适表示。
- 运动序列：每个运动序列通过在 HumanML3D 数据集 [23] 上训练的模型生成序列的嵌入。该模型来自 Guo 等人 [23] 训练的运动特征提取器，在学术界被广泛使用 [86]。
```

- 包含绝对多样性和比较多样性。

#### 绝对多样性

- 标准差法和质心法。