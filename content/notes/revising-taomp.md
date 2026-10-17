---
title: Revising TAOMP
tags:
  - algorithms
  - book
summary: "For ages, I've tried to read and revise this book. Giving this another shot this year"
date: 2026-10-17T09:30:00-04:00
draft: false 
---

## Chapter 1

### Amdahl's law

Trying to read **The art of Multiprocessor Programming** again, and I keep forgetting about this, so jotting down a quick note;

> The max speedup we can obtain, if $s$ represents the sequential portion of the program (e.g. 10%), is $\frac{1}{s}$ 

---

Imagine a program $P$ that can be perfectly split into two parts, sequential and parallelizable, let's call these $S$ and $Z$ respectively.
Then, $ P = S + Z $.

An example - a task runs in 10 seconds. 2 seconds of it is "setup" time, and the remaining 8 seconds is perfectly parallelizable. Then $S = 2$ and $Z = 8$. If we split the 8 seconds across, say, 8 workers, it's trivial to see we can finish the total run in 3 seconds instead. If we throw infinite cores at the problem, we now have, 

$$ P' = S + \lim_{ N \to \infty} \frac{Z}{N} $$

The limit tends to $0$, so the total new runtime $P' = S$. In this case, the theoretical speedup with infinite workers will always be bound by the sequential portion of the program, i.e. 

$$ Speedup = \frac{P}{P'} = \frac{1}{S}$$
