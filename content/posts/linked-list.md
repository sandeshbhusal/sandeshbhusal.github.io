+++
title = "Learning Modern C++ with too many Linked Lists"
date = 2025-08-31
updated = 2025-02-21
description = ""

[taxonomies]
tags = ["markdown", "showcase"]

[extra]
katex = true
social_media_card = "social_cards/blog_markdown.jpg"
+++

A couple of days ago, I got sucked into watching a lot of modern C++ videos. While the people who know me can effectively vouch that I am a very avid Rustacean (it says so right on my profile!), I liked a lot of things modern C++ (post C++11) brings to the table, specially with memory safety and program ergonomics. The ergonomics are slowly improving. And therefore, I decided to learn modern C++ (or at least get a taste for it), by learning it with entirely too many linked lists (just like I learned Rust).

## The primer : _A_ linked list

This part brings me to write a very _very_ simple linked list. One preferably for an int, and I will progressively add more features/ make changes to this linked list as I go along. This will help first solidify the fundamentals, and then go off into the optimization part for the list.

```c++
class Node {
private:
    int data;
    Node* next;
public:
    Node(int data, Node* next = nullptr): data(data), next(next) {}
    void set_next(Node *next) {
        this->next = next;
    }
    void set_data(int data) {
        this->data = data;
    }
    int get_data() const {
        return data;
    }
    const Node* get_next() const {
        return next;
    }
    Node* get_next_mut() {
        return next;
    }
};
```

Pedants among us will definitely complain about the `this->` accessor, or maybe even how there is no destructor. That's fine for now. I am only using ints (trivially copyable). The next logical step would be to extend this code to make use of generics, so that we can have implementations for different types of data, like strings, or heap-allocated types. This leads to the natural (and trivial) modification into a structure using `template`s.

## A more generic Node

```c++
template<typename T>
class Node {
private:
    T data;
    Node* next;
public:
    Node(T data, Node* next = nullptr): data(data), next(next) {}
    void set_next(Node *next) {
        this->next = next;
    }
    void set_data(T data) {
        this->data = data;
    }
    T get_data() const {
        return data;
    }
    const Node* get_next() const {
        return next;
    }
    Node* get_next_mut() {
        return next;
    }
};
```

This is a simple modification, that makes the class generic, and replaces all `int`s with `T` -- our template parameter. There is one fundamental issue with this approach. Whenever we work with non-copy types, this is perfectly fine. But when working with a non-trivially copyable types, it triggeres additional allocations (because of the copy constructor being triggered while setting data). In order to visualize this, we can track the global allocations/deallocations in the code. C++ lets us overload the global functions for allocations - `new` and `delete` which lets us track this.

### Counting Allocations

```c++
static int allocs = 0;
void* operator new(size_t n) {
    allocs += 1;
    return malloc(n);
}

void print() {
    using std::cout;
    using std::endl;

    cout << "allocs: " << allocs << endl;
}
```

Another way would be to implement a simple allocator implementing `std::allocator_traits`, but this code lets me track global allocations/deallocations, not only for types allocated on the heap? ==I think this is wrong==.

If this code is now benchmarked, for simple int and string types:

```c++
int main() {
    Node<int> n1(10);
    print();
    std::string foo = "thequickbrownfoxjumpsoverthelazydog";
    print();
    Node<std::string> n2(foo);
    print();
    Node<std::string> n3("thequickbrownfoxjumpsoverthelazydog");
    print();
    Node<const char*> n4("thequickbrownfoxjumpsoverthelazydog");
    print();
    return 0;
}
```

Running this code gives me the following output:

```plaintext
allocs: 0 - deallocs: 0
allocs: 1 - deallocs: 0
allocs: 3 - deallocs: 1
allocs: 5 - deallocs: 2
allocs: 5 - deallocs: 2
```

Looking at this - here is how I interpreted the results.

- At line 2, we create a `Node<int>`. The class has a known size, and the int has a known size, and so the compiler does not need to do any allocations. In this case, everything gets stack-allocated, and life's good.
- At line 4, we create a `std::string`. This adds an allocation to our heap. [^1]
- At line 6 (this is where things get interesting), we pass the long string to our Node. This pass is by value, so we have to copy the entire string (which triggers its copy-constructor to generate the argument). This adds a +1 to our allocation. In the Node class, there is another "T data" which becomes "std::string data". This gets constructed again from the parameter, which causes another allocation. 2 allocations!!
- A similar thing happens in line 8. The `const char *` gets consumed to generate a std::string (because of the Node's template parameter type is std::string). That means we have the same situation as above - only, we cannot reuse the string again and lose it (since it's a rvalue) and we have an additional allocation for no reason at all!
- At the last part, since the const char* does not need to be coerced into a std::string because the Node class's generic type is const char*, it can be taken from the rodata section in the binary, and incurs no allocation. The Node itself is sized type and gets allocated on the stack of the main() function.

```bash
~/w/b/a/c/linked_list ❯❯❯ objdump -s l2 -j .rodata

l2:     file format elf64-x86-64

Contents of section .rodata:
 4000 01000200 00000000 0000616c 6c6f6373  ..........allocs
 4010 3a200020 2d200064 65616c6c 6f63733a  : . - .deallocs:
 4020 20000000 00000000 74686571 7569636b   .......thequick
 4030 62726f77 6e666f78 6a756d70 736f7665  brownfoxjumpsove
 4040 72746865 6c617a79 646f6700 00000000  rthelazydog.....
 4050 62617369 635f7374 72696e67 3a20636f  basic_string: co
 4060 6e737472 75637469 6f6e2066 726f6d20  nstruction from 
 4070 6e756c6c 20697320 6e6f7420 76616c69  null is not vali
 4080 64006261 7369635f 73747269 6e673a3a  d.basic_string::
 4090 5f4d5f63 72656174 6500               _M_create.      
```

### Rule of 5

This example in and of itself is a bit hyperbolical - I just wanted to illustrate a case where I can trigger multiple allocations. Normal C++ programmers apparently do not write code like this -- instead, they adhere to the [rule of 5](https://www.geeksforgeeks.org/cpp/rule-of-five-in-cpp/). I change the `Node` class to have the following constructors:

```c++
  Node(const T &data, Node *next = nullptr) : data(data), next(next) {}
  Node(T &&data, Node *next = nullptr) : data(std::move(data)), next(next) {}
  Node() = delete;
  Node operator=(const Node<T> &other) = delete;
  Node operator=(Node &&other) {
    data(std::move(other));
    next(other.next);
  }
```

Now if we benchmark allocations across the same code, we get:

```c++
  Node<int> n1(10);
  std::string foo = "thequickbrownfoxjumpsoverthelazydog";
  Node<std::string> n2(foo);
  Node<std::string> n3("thequickbrownfoxjumpsoverthelazydog");
  Node<const char *> n4("thequickbrownfoxjumpsoverthelazydog");
  Node<std::string> n5(std::move(foo));
```

```plaintext
allocs: 0 - deallocs: 0
allocs: 1 - deallocs: 0
allocs: 2 - deallocs: 0
allocs: 3 - deallocs: 0
allocs: 3 - deallocs: 0
allocs: 3 - deallocs: 0
```

Here is the allocation breakdown:

- First line - no allocations because Node is known-sized and int is trivially copyable, so there is no need to allocate anything on the heap.
- Second line - string contents are allocated on the heap.
- Third line - The node "n2" is created on the stack for "main" (no allocs). However, the string foo is taken by reference, and hence triggers a copy constructor in Node's copy constructor to generate Node->data.
- Fourth line - The one allocation is on conversion between const char* to a string. This string then becomes a rvalue (which is not bound) which can be used to generate std::string in Node->data directly. We only have 1 allocation.
- Fifth line - We don't have any allocations - const char* is the type of Data in Node, and the const char* gets moved so that Node->data is pointing to the rodata string.
- Sixth case - this moves the already-allocated string "foo" into the Node->data making the contents of "foo" a rvalue. It can no longer be used anymore, but it reduces our allocations.

We went from 5 allocations all the way down to 2. There's something interesting in this case, however.

### Perfect Forwarding

As we observed above, there are multiple types of allocations that affect which constructor gets triggered and how many allocations this incurs. When passing the information to the constructor, however, it looks like we need to be very careful in regards to what we are passing into. If the value is trivially copyable, it's okay. If it is not, depending on if it is a rvalue or a lvalue different constructors work. One way to make sure that the right type of references get converted to right type as required by the consuming function. Let's take an example:

```c++
void foo(string s) {}
void bar(string &&k) { foo(k); }
void baz() { bar("thequickbrownfoxjumpsoverthelazydog"); }
```

In this example, we are passing a string literal into "bar". The string literal gets bound to 'k' in the argument of 'bar' and since it becomes a lvalue (named k) at that point, it incurs and allocation. Again, when we call `foo` with the argument, it gets copy-constructed, which incurs another allocation again.

```c++
void foo(string s) {}
void bar(string &&k) { foo(std::forward<string>(k)); }
void baz() { bar("thequickbrownfoxjumpsoverthelazydog"); }
```

Now, with the same example as above, we can reduce a single allocation by using `std::forward`. This is another step to the `Node` class implementation:

```c++
template <typename T> class Node {
private:
  T data;
  Node *next;

public:
  template <typename U>
  Node(U &&data, Node *next = nullptr)
      : data(std::forward<U>(data)), next(next) {}
  void set_next(Node *next) { this->next = next; }
  void set_data(T data) { this->data = data; }
  T get_data() const { return data; }
  const Node *get_next() const { return next; }
  Node *get_next_mut() { return next; }
};
```

This becomes the final implementation for the Node class concerning the `data` field. This incurs the same amount of allocations as the example before.

```bash
~/w/b/a/c/linked_list ❯❯❯ ./l3
allocs: 0 - deallocs: 0
allocs: 1 - deallocs: 0
allocs: 2 - deallocs: 0
allocs: 3 - deallocs: 0
allocs: 3 - deallocs: 0
allocs: 3 - deallocs: 0
```


[^1]: What is the effect if the string is just "foo" instead of "averylongstringindeedwascreatedhere"? C++ std::string's small-string optimization.
