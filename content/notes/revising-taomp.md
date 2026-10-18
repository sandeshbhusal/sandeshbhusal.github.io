---
title: Revising TAOMP
tags:
  - algorithms
  - book
summary: "For ages, I've tried to read and revise this book. Giving this another shot this year"
date: 2026-10-17T09:30:00-04:00
layout: revision
draft: false 
---

## Chapter 1

### Amdahl's law

Trying to read **The art of Multiprocessor Programming** again, and I keep forgetting about this, so jotting down a quick note;

> The max speedup we can obtain, if $s$ represents the sequential portion of the program (e.g. 10%), is $\frac{1}{s}$ 

---

Imagine a program $P$ that takes 10 seconds to execute. It can be perfectly split into two parts, sequential and parallelizable, let's call these $S$ and $Z$, taking 2 seconds and 8 seconds to execute, respectively.
<br/>
<br/>
Then, $ P = S + Z $.
<br/>

<table style = 'border-radius: 4px;'>
<tr style = 'border-radius: 4px;'><td style = 'background: teal; color: white; width: 20%;'> S </td><td style = 'background: coral; color: white;'> Z </td></tr>
<tr><td> 2 seconds </td><td> 8 seconds </td></tr>
</table>

---

If we split the parallelizable part across 8 workers, it's trivial to see we can finish the total run in 3 seconds instead. If we throw infinite cores at the problem, we now have, 

$$ P' = S + \lim_{ N \to \infty} \frac{Z}{N} $$

The limit tends to $0$, so the total new runtime $P' = S$. In this case, the theoretical speedup with infinite workers will always be bound by the sequential portion of the program, e.g. 

$$ Speedup = \frac{P}{P'} = \frac{10\text{ s (total runtime)}}{2\text{ s (sequential runtime)}} = 5 \quad (5\times \text{ speedup}) $$

---

## Chapter 2

Chapter 1 was about the efficacy of multiprocessor programming. Chapter 2 explores issues, and algorithms to solve them.

### Shared counter

Imagine a shared counter being updated by two threads. Issue happens between a read-modify-write sequence happening between two threads. Thread 1 can observe the counter, get scheduled out, thread 2 can observe the counter, increment and write, thread 1 comes back, increments and writes its own local counter. In this case the [`volatile`](/notes/on-volatile) keyword won't help either since the operation is not atomic -- each thread can read the value, increment on its own local state, and writeback the local state to the shared counter, e.g:

---

| Step | Thread 1 | Thread 2 | Shared counter |
| --- | --- | --- | --- |
| 1 | Read `0` into a local variable | | `0` |
| 2 | Scheduled out | Read `0` into a local variable | `0` |
| 3 | | Increment local value to `1` | `0` |
| 4 | | Write `1` to the counter | `1` |
| 5 | Resume and increment local value from `0` to `1` | | `1` |
| 6 | Write `1` to the counter | | `1` |

Two increments, but the counter ends at `1` instead of `2`: one update is lost.

---

**Solution:** One way to solve this problem is to use a hardware-level atomic read-modify-write operation like CAS retrying on failure. Another way would be to have a cooperative scheduler and each thread would yield once its rmw operations are done - but this would have to run on a single core, otherwise we'd have the same problem as before.

In the problem above, we have a shared counter. How about having a whole shared memory region? Going forward, we consider any seuqence of code that only one thread should execute at a time as critical section. The property that lets only one thread access the critical section is **mutual exclusion**.
