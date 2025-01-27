# Demon's Sorting Code

``` cpp
int main() {
    int arr[10] = { 9,5,3,6,7,1,4,2,8,0 };

    for (int i = 0; i < 10; ++i) {
        Sort(arr, i);
    }
    Sort_2(arr,9);
    return 0;
}
```
## 构建新堆
``` cpp
void Sort(int *arr,int index) {
	if (index == 0)return;
	int tmpIndex = 0;
	while (index>=0) {
		tmpIndex = (index - 1) >> 1;
		if (tmpIndex >= 0 && arr[tmpIndex] > arr[index]) {
			swap(arr[tmpIndex], arr[index]);
		}
		index = tmpIndex;
	}
}
```
## 从最后一个父节点调整
``` cpp
    void HSort(vector<int>&potions,int start, int end){
        int adjRoot = (end - 1) >> 1;
        for(int i = adjRoot; i >= start; --i){
            HAdjust(potions, i, end);
        }


        for(int i = start; i < end; ++i){
            swap(potions[start],potions[end-i]);
            HAdjust(potions,start,end - i -1);
        }
    }

    //大根堆
    void HAdjust(vector<int>&arr, int start, int end){
            int dad = start;
            int son = dad * 2 + 1;
            while (son <= end) { //若子节点指标在范围内才做比较
                if (son + 1 <= end && arr[son] < arr[son + 1]) //先比较两个子节点大小，选择最大的
                    son++;
                if (arr[dad] > arr[son]) //如果父节点大于子节点代表调整完毕，直接跳出函数
                    return;
                else { //否则交换父子内容再继续子节点和孙节点比较
                    swap(arr[dad], arr[son]);
                    dad = son;
                    son = dad * 2 + 1;
                }
            }
    }
```