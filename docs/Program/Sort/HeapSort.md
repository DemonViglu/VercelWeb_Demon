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
void Sort_2(int* arr, int index) {
	for (int rootIndex = (index - 1) >> 1; rootIndex >= 0; --rootIndex) {
		int lc = rootIndex * 2 + 1;
		int rc = rootIndex * 2 + 2;
		if (lc<10 && arr[lc]>arr[rootIndex]) {
			swap(arr[lc], arr[rootIndex]);
			Adjust(arr, lc);
			++rootIndex;
		}
		if (rc<10 && arr[rc]>arr[rootIndex]) {
			swap(arr[rc], arr[rootIndex]);
			Adjust(arr, rc);
			++rootIndex;
		}
	}
}
void Adjust(int* arr, int index) {
	int l = index * 2 + 1;
	int r = index * 2 + 2;
	bool flag = true;
	while(flag) {
		flag = false;
		if (l<10&&arr[index] < arr[l]) {
			swap(arr[index], arr[l]);
			Adjust(arr, index);
			Adjust(arr, l);
			index = l;
			flag = true;
		}
		else if (r<10&&arr[index] < arr[r]) {
			swap(arr[index], arr[r]);
			Adjust(arr, index);
			Adjust(arr, r);
			flag = true;
			index = r;
		}
		l = index * 2 + 1;
		r = index * 2 + 2;
	}
}
```