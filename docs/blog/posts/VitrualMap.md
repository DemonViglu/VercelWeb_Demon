---
date: 2025-08-19
categories: 
    - Tech
---


# Learning


<!-- more -->


## 内存


### 空类的内存占用


??? note
    对于一个什么数据都没有存的类。声明他会占用多少内存


    在C++中，即使一个类什么数据成员都没有，对象实例也会占用内存。这是因为每个对象必须有唯一地址，以便区分不同实例。


    没有虚函数时：空类对象通常占用1字节（用于区分不同对象）。
    有虚函数时：对象会多一个虚表指针（vptr），通常占用4字节（32位系统）或8字节（64位系统）。
    示例：


    总结：
    空类对象至少占用1字节，有虚函数则占用虚表指针大小。


    区分不同对象什么意思


    “区分不同对象”指的是：即使类没有成员变量，编译器也要保证每个对象实例在内存中有唯一的地址。这样你可以创建多个该类的对象，并且它们的地址不同，可以通过指针或引用区分它们。


    例如：


    如果对象大小为0，两个对象可能会有相同的地址，这会导致程序无法正确区分它们。因此，C++标准规定空类对象至少占用1字节。


### 虚函数的具体存储和实现


??? note "Code"
    ``` cpp
        
        #include <iostream>


        class Base 
        {
        public:
            int a = 10;


            virtual void Work() {
                std::cout << a << std::endl;
                std::cout << "I'm Base" << std::endl;
            }
        };


        class Child :public Base
        {
        public:
            int b = 20;


            void Work() {
                std::cout << b << std::endl;
                std::cout << "I'm Child" << std::endl;
            }
        };




        int main()
        {
            Child child;


            Base* bPtr = dynamic_cast<Base*>(&child);


            Base** arr = new Base*[5];


            arr[0] = bPtr;


            arr[1] = new Base();


            for (int i = 0; i < 2; ++i) {
                arr[i]->Work();
            }


            bPtr->Work();


            system("pause");


            return 0;
        }
    ```


??? note "Anly"
    1. Child child;
    在栈上分配一个Child对象。
    内存布局（假设无填充）：
    vptr（虚函数表指针）
    int a（来自Base）
    int b（来自Child）
    2. Base* bPtr = dynamic_cast<Base*>(&child);
    bPtr指向child对象的Base部分。
    实际上，bPtr和&child指向同一块内存，只是类型不同。
    3. Base** arr = new Base*[5];
    在堆上分配一个指针数组，能存放5个Base*。
    4. arr[0] = bPtr;
    arr[0]指向child对象（以Base*类型）。
    5. arr[1] = new Base();
    在堆上分配一个Base对象，arr[1]指向它。
    6. for (int i = 0; i < 2; ++i) { arr[i]->Work(); }
    arr[0]->Work();：指向child对象，类型为Base*，但由于Work是虚函数，会动态绑定到Child::Work()。
    arr[1]->Work();：指向Base对象，调用Base::Work()。
    7. bPtr->Work();
    同样指向child对象，类型为Base*，调用Child::Work()。