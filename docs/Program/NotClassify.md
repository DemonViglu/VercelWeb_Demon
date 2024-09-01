# ...
## 拓扑排序

!!! warning ""
    只有有向无环图(DAG: _Directed Acyclic Graph_ )才有拓扑排序

### 总体思路：
1. 将所有入度为0的节点入列。(初始化入列)
2. 将列中的元素pop,并且使得其所有出度节点的入度数减1；如果该出度节点被更新后入度也是0，则同样入列。
3. 记录所有的pop元素个数，如过等于总节点个数，则排序成功。否则，说明有环存在。且pop的顺序即为拓扑排序。

!!! note ""
    可以发现， pop的方式可能会随着入列出列的顺序有所改变，如采用`stack`或`queue`处理该类节点，所以拓扑排序不唯一。

## 并查集

### 作用: 
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;将可以被划分为一类的元素归为到同一集合，并作出代表元素。
### 总体思路：
1. 将所有的元素初始化为:<br>
    parent[i]=i;
2. 对于需要合并的元素，设置其祖先为另一个祖先的的父亲，这样，两个元素虽然有两个原本的祖先，但是现在一个祖先升级为大祖先，就变为公共祖先了。
3. 对于查找某个元素的祖先，只需要查找到:<br>
    return parent[i]=i;
成立即可。<br>

!!! note "优化"
    在查找某个元素的时候，往往会向上访问，这个时候可以利用递归，将该元素的parent直接设置为祖先，减少后续的访问时间。<br>
    ``` cpp 
    int find(int x){
        return x==parend[x]?x:(parent[x]=find(parent[x]));
    }
    ```
## 基环内向树

## 线段树

## 树状数组

## 两个数组连锁排序

!!! note "有意思"

    ```cpp
        std::vector<int> pos(startTime.size());
        // 从 0 开始递增，调用 operator++ 方法
        std::iota(pos.begin(), pos.end(),0); 
        std::sort(pos.begin(),
                  pos.end(), 使用值的大小对下标进行排序
                  [&](int i, int j) {
                      return startTime[i] < startTime[j];
                  }); // 注意这里会用到下标，所以 pos 数组初始化不能从 1 开始

    ```
