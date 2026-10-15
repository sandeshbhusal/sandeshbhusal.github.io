---
title: On volatile
date: 2026-10-12
tags:
  - embedded
  - C programming
summary: My notes on the `volatile` keyword
---

## Introduction

The `volatile` keyword was the single most missed keyword during my undergrad C course, right after `register`. Well it makes sense -- for kids who are going into the world learning about python and friends, we didn't take much notice either. However, recently I had to go through some DDR Diagnostic Code in my day work and I had to revisit the topic, along with cache-coherency, memory ordering, atomics and the goated volatile itself. This is a collection of notes for me, and for anyone who might be willing to learn more about the mighty `volatile` keyword. Let's start.

## Why volatile?

In a short list of bullets, here's why:

- Volatile marks a memory location as "can change out side normal program execution", i.e. the program doesn't need to do anything for that memory location to change (e.g. CSRs in hardware).
- Volatile marks a memory location as "should not optimize away reads and writes", i.e. the compiler should **not** assume that the read/write is redundant and remove it during code analysis (e.g. Status flags from hardware).
- Volatile marks a memory location as "should not reorder read/write operations", i.e. the compiler should not apply reordering so that all volatile memory operations must appear strictly in order in which they are written in the original program.

## Why _not_ volatile?

Volatile does not:

- Guarantee atomicity of change - RMW still means read/modify/write.
- Provide synchronization between threads (e.g. don't assume volatile means it can be used in context of, say, monotonic counter shared between threads)
- Bypass CPU cache - volatile just means the memory operation cannot be replaced by a previously-read value. It can still hit the cache, depending on where the volatile memory location is (it just won't be reused from CPU regs).


## Illustrations

Here are some examples of when `volatile` comes into handy. All examples are generated on [GodBolt](https://godbolt.org) with Aarch64 setup on `-O2` opt level.

### Memory ops "optimized away"

For some MMIO operations, e.g. reading status CSRs out of a hardware, if `volatile` is not added, the compiler just assumes the memory location will never change - so it's free to optimize away the read/write to that location.

```c
void wait_for_field(const unsigned* status) {
    while ((*status & 1u) == 0u) {
    }
}
```
```asm
wait_for_field():
        ret
```

After using volatile properly, the memory op is retained:


```c
void wait_for_field(const volatile unsigned* status) {
    while ((*status & 1u) == 0u) {
    }
}
```
```asm
wait_for_field(unsigned int const volatile*):
.L2:
        ldr     w1, [x0]
        tbz     w1, 0, .L2
        ret
```

Another example:

```c
#include <stdint.h>
void read_to_clear(const uintptr_t* csr) {
    (void)*csr;
}
```
```asm
read_to_clear(unsigned long const*):
        ret
```

Versus:

```c
#include <stdint.h>
void read_to_clear(const volatile uintptr_t* csr) {
    (void)*csr;
}
```
```asm
read_to_clear(unsigned long const volatile*):
        ldr     x0, [x0]
        ret
```

### Reordered memory ops

In case of normal memory ops, the compiler is free to optimize them as it sees fit. This can also be used to illustrate an example on why `volatile` cannot be used to synchronize between two threads. When I initially read about `volatile`, I said "Oh cool! Since this signals to the compiler that the value may change anytime, I can probably use this to sync between cores". Simple times. An example follows:

```c
volatile bool*  done;
int             value;

void try_sync_threads(){
    value = 10;
    *done = true;
}
```

In this example, the compiler may run `*done = true` before running `value = 10`. Since value is not volatile, the compiler is not required to preserve its ordering relative to the volatile write to done. Even if the compiler preserves the order, the CPU may allow another core to observe done = true before observing value = 10. Thus, volatile alone is insufficient for inter-core synchronization.

```c
void write_to_memory(unsigned *cache_block) {
    BARRIER;
    volatile uintptr_t* cache_block_start = 0x1000;
    for (size_t i = 0; i < 8; i++)
        cache_block_start[i] = 0xf00ff00ff00ff00f;
    }
    BARRIER
}
```

> `BARRIER` is an apt arch-specific memory barrier that ensures all transactions before it complete - maybe `dsb sy` in AArch64

In this example, each entry of the cache block will execute sequentially in the program (whether they arrive at the controller in a sequential manner is a different question).

### Closing Thoughts

I guess the key thing to remember is this:

> `volatile` controls compiler treatment of observable accesses. Atomics establish thread synchronization. Architecture-specific barriers provide hardware ordering and completion guarantees.
