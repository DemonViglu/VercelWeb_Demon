# 快速排序和二分查找

## QuickSort

```cpp
void QuickSort(int *arr, int left,int right) {
	if (left >= right) {
		return;
	}
	int tmp = arr[left];
	int pf = left, pr = right;
	while (left < right) {
		while (arr[right] > tmp)--right;
		arr[left] = arr[right];
		while (left<right&&arr[left] <= tmp)++left;
		arr[right] = arr[left];
	}
	arr[left] = tmp;
	QuickSort(arr, pf,left-1);
	QuickSort(arr, left + 1, pr);
}

int main() {

	int arr[10] = { 5,5,7,6,9,21,10,3,3,5 };
	QuickSort(arr, 0, 9);
	for (int i = 0; i < 10; ++i) {
		cout << arr[i] << " ";
	}
	system("pause");
	return 0;
}
```


## 二分查找

**其实二分查找和快排非常相似。但是二分查找可以查找某些边界问题，比如`lower_bound`的问题，接下来写份代码阐述一下**

``` cpp
// Example: 返回一个下标，该下标及以下都小于该元素
// arr[index]>arr[i] when 0<=i&&i<index
int lower_bound(int* arr, int length, int target) {
	int left = 0, right = length - 1;
	//使用闭区间查找
	while (left <= right) {
		int middle = ((right - left) >> 1) + left;//等效于(l+r)/2取下边界，该代码用于放置数据溢出
		//注意循环的不变量： r右边的数，恒大于等于m，l左边的数，恒小于m
		if (arr[middle] >=target) {
			right = middle - 1;
		}
		else if (arr[middle] < target) {
			left = middle + 1;
		}
	}
	return right;
}
```

**这里是处理下边界，那如果想要获得下标以下都小于等于该值的最大下标，那就可以对里面的判断进行修改**

- 如果一个数列，是  `{1,2,3,5,5,5,7,8,11,12};`,`Target`是5.

=== "小于或等于的最大下标"
    - 那我们就可以想象到，r最终会落在最右边的5,而l落在7，则可以推断出，r的右边大于middle,l的左边小于等于middle，返回值为right。
    ``` cpp
    int lower_bound(int* arr, int length, int target) {
        int left = 0, right = length - 1;
        while (left <= right) {
            int middle = ((right - left) >> 1) + left;
            if (arr[middle] >target) {
                right = middle - 1;
            }
            else if (arr[middle] <= target) {
                left = middle + 1;
            }
        }
        return right;
    }
    ```

=== "小于的最大下标"
    ```cpp
    int lower_bound(int* arr, int length, int target) {
        int left = 0, right = length - 1;
        while (left <= right) {
            int middle = ((right - left) >> 1) + left;
            if (arr[middle] >= target) {
                right = middle - 1;
            }
            else if (arr[middle] < target) {
                left = middle + 1;
            }
        }
        return right;
    }
    ```

=== "大于的最小下标"
    ```cpp
    int lower_bound(int* arr, int length, int target) {
        int left = 0, right = length - 1;
        while (left <= right) {
            int middle = ((right - left) >> 1) + left;
            if (arr[middle] > target) {
                right = middle - 1;
            }
            else if (arr[middle] <= target) {
                left = middle + 1;
            }
        }
        return left;
    }
    ```

=== "大于或等于的最小下标"
    ``` cpp
    int lower_bound(int* arr, int length, int target) {
        int left = 0, right = length - 1;
        while (left <= right) {
            int middle = ((right - left) >> 1) + left;
            if (arr[middle] >= target) {
                right = middle - 1;
            }
            else if (arr[middle] < target) {
                left = middle + 1;
            }
        }
        return left;
    }
    ```