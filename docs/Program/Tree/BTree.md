# 关于二叉树的四种遍历方式(非递归)：

## 中序遍历(InOrder):

``` cpp
class Solution{
    public:
        vector<int> inorderTraversal(TreeNode* root){
            vector<int>res;
            stack<TreeNode*>stk;
            while(root!=null||!stk.empty()){
                //将最左边的一条分支读取到结尾，并保存读取路径。由于栈后进先出，满足中序遍历逐渐访问到根节点的特性。
                while(root!=nullptr){
                    stk.push(root);
                    root=root->left;
                }
                root=stk.top();
                stk.pop();
                //读取末尾节点，并转到右子树。
                res.push_back(root->val);
                root=root->right;
            }
            return res;
        }
}
```

## 前序遍历

``` cpp
class Solution{
public:
    vector<int> preorderTraversal(TreeNode*root){
        vector<int>res;
        if(root==null){
            return res;
        }
        stack<TreeNode*> stk;
        TreeNode* node=root;
        while(!stk.empty()||node!=null){
            while(node!=null){
                //读一个存一个路径，跟中序遍历一样，但是因为根节点先访问，所以直接push到res数组当中。
                res.push_back(node->val);
                stk.emplace(node);
                node=node->left;
            }
            node =stk.top();
            stk.pop();
            node =node->right;
        }
        return res;
    }
}
```

## 后序遍历(PostOrderTraversal):

- 对于后序遍历，访问顺序依次为 _左_ 、_右_ 、 _根_ 。如果我们对左右子树看反再倒序，会发现跟前序遍历是一样的。所以这里的操作可以选择采用前序遍历，并且第二层while里面是访问到右节点末端，取得一个res数组。最后利用栈或者`reverse`函数翻转数组即可。但这种不符合后序遍历的实际含义。下文会给出具体代码：
``` cpp
class Solution{
public :
    vector<int> postorderTraversal(TreeNode *root){
        vector<int> res;
        if(root==null){
            return res;
        }
        stack<TreeNode*stk>;
        TreeNode*prev =null;
        while(root!=null||!stk.empty()){
            //与中序遍历相同，先读到左子树末端，记录路径但不记录节点数据
            while(root!=null){
                stk.emplace(root);
                root=root->left;
            }
            root=stk.top();
            stk.pop();
            //如果右子树为空或是上一次访问的，则本节点的左右子树皆访问完毕，访问节点为本节点，并记录该节点数据，并让下一次访问的节点为栈顶节点。
            if(root->right==null||root->right==prev){
                res.emplace_back(root->val);
                prev=root;
                root=null;
            }
            //否则，左子树结束了，利用递归思想，先把根节点重新塞回去，再讲根节点转移到右子树。
            else{
                stk.emplace(root);
                root=root->right;
            }
        }
        return res;
    }
}
```
## 层次遍历(levelOrder):

``` cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        queue<TreeNode*> q;
        vector<vector<int>> ans;
        if (root) q.push(root);
        while (!q.empty()){
            //对于层次遍历，此时队列中的节点个数即为此次需要访问的个数，所以尽管push
            int size = q.size();
            vector<int> res;
            for (int i = 0;i < size;i++){
                TreeNode* node = q.front(); q.pop();
                res.push_back(node->val);
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
            ans.push_back(res);
        }
        return ans;
    }
};
```

# 二叉树遍历的三种递归实现

- 对于递归实现，较为简单且代码量较少

=== "前序"

    ``` cpp
    class Solution{

        vector<int>res;
        class dfs(TreeNode* root){
            if(root==null){
                return;
            }
            res.push_back(root->val);
            dfs(root->left);
            dfs(root->right);
        }

        vector<int> Travelsal(TreeNode*root){
            dfs(root);
            return res;
        }
    }
    ```

=== "中序"

    ``` cpp
    class Solution{

        vector<int>res;
        class dfs(TreeNode* root){
            if(root==null){
                return;
            }
            dfs(root->left);
            res.push_back(root->val);
            dfs(root->right);
        }

        vector<int> Travelsal(TreeNode*root){
            dfs(root);
            return res;
        }
    }
    ```

=== "后序"

    ``` cpp
    class Solution{

        vector<int>res;
        class dfs(TreeNode* root){
            if(root==null){
                return;
            }
            dfs(root->left);
            dfs(root->right);
            res.push_back(root->val);
        }

        vector<int> Travelsal(TreeNode*root){
            dfs(root);
            return res;
        }
    }
    ```