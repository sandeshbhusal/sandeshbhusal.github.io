+++
title = "Learning modern C++ with too many Linked Lists"
draft = false
date = "2025-08-31"
+++

## From C to Modern C++: Evolving the Linked List

Linked lists are a classic data structure, often introduced in C. But modern C++ offers powerful features for safer, more expressive, and thread-safe implementations. Let's walk through the evolution.

### 1. The Classic C Linked List

In C, a singly linked list node might look like:

```c
typedef struct Node {
    int value;
    struct Node* next;
} Node;
```

You manually manage memory and pointers, which is error-prone and not thread-safe.

### 2. A Simple C++ Linked List

C++ allows us to use classes and constructors for better encapsulation:

```cpp
struct Node {
    int value;
    Node* next = nullptr;
    Node(int v) : value(v) {}
};

class LinkedList {
    Node* head = nullptr;
public:
    void push_front(int value) {
        Node* node = new Node(value);
        node->next = head;
        head = node;
    }
    // ... destructor, etc.
};
```

But this still uses raw pointers and manual memory management.

### 3. Modern C++: Smart Pointers

Modern C++ (C++11 and later) introduces smart pointers for automatic memory management:

```cpp
#include <memory>

struct Node {
    int value;
    std::unique_ptr<Node> next;
    Node(int v) : value(v), next(nullptr) {}
};

class LinkedList {
    std::unique_ptr<Node> head;
public:
    void push_front(int value) {
        auto node = std::make_unique<Node>(value);
        node->next = std::move(head);
        head = std::move(node);
    }
    // ... other methods
};
```

No need to manually `delete` nodes—memory is managed automatically.

### 4. Making It Thread-Safe

To safely use the list in multi-threaded code, protect shared data with mutexes:

```cpp
#include <mutex>

class ThreadSafeLinkedList {
    std::unique_ptr<Node> head;
    std::mutex mtx;
public:
    void push_front(int value) {
        std::lock_guard<std::mutex> lock(mtx);
        auto node = std::make_unique<Node>(value);
        node->next = std::move(head);
        head = std::move(node);
    }
    // ... thread-safe methods
};
```

All operations that modify or access the list should lock the mutex.

### 5. Summary

- **C**: Manual memory, unsafe, not thread-safe.
- **C++**: Classes, constructors, but still manual memory.
- **Modern C++**: Smart pointers for safety.
- **Thread-safe C++**: Use mutexes for concurrency.

Modern C++ lets you write safer, cleaner, and concurrent code—making linked lists a great exercise in learning these features!