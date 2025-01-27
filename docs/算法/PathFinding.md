# 寻路
## DJ
```cpp
class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<int>> g(n, vector<int>(n, INT_MAX / 2)); // 邻接矩阵
        for (auto& t : times) {
            g[t[0] - 1][t[1] - 1] = t[2];
        }

        vector<int> dis(n, INT_MAX / 2), done(n);
        dis[k - 1] = 0;
        while (true) {
            int x = -1;
            for (int i = 0; i < n; i++) {
                //如果i邻居没进入Closed，并且到i的距离比目前到x的距离更短，当前best = x
                if (!done[i] && (x < 0 || dis[i] < dis[x])) {
                    x = i;
                }
            }

            //全部节点都进入Closed了
            if (x < 0) {
                return ranges::max(dis);
            }

            //如果当前最佳节点的距离是最大值
            if (dis[x] == INT_MAX / 2) { // 有节点无法到达
                return -1;
            }
            done[x] = true; // 最短路长度已确定（无法变得更小）
            for (int y = 0; y < n; y++) {
                // 更新 x 的邻居的最短路
                dis[y] = min(dis[y], dis[x] + g[x][y]);
            }
        }
    }
};
```

## Floyd
    //k为中间点 
    for(k = 0; k < G.vexnum; k++){
        //v为起点 
        for(v = 0 ; v < G.vexnum; v++){
            //w为终点 
            for(w =0; w < G.vexnum; w++){
                if(D[v][w] > (D[v][k] + D[k][w])){
                    D[v][w] = D[v][k] + D[k][w];//更新最小路径 
                    P[v][w] = P[v][k];//更新最小路径中间顶点 
                }
            }
        }
    }

    //获取路径
       while(k != w){
        k = P[k][w]; 
    }