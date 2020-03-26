---
layout: post
title: HyperLogLog algorithm
description: How facebook knows how many unique people have performed an action. ( Count Distinct problem )
image: https://koaning.io/posts/priors-of-great-potential/drawing7.png
author: Sandesh Bhusal
---

Hyperlog Log algorithm is a [probabilistic cardinality estimator](https://en.wikipedia.org/wiki/HyperLogLog). What does this mean? Well, let's go through the **count-distinct problem** and take a look at how the HyperLogLog aims to solve this problem.


#####  1. Introduction to the Count-Distinct Problem:
The count distinct problem, also known as the cardinality estimation problem is a well-known problem in a computer science, that aims to find the count of distinct items in a multiset, using storage units fewer than the count of elements (distinct and otherwise). Here's an illustration. Let us consider the following multiset of elements:

`X = {1, 2, 3, 1, 2, 3, 4, 5, 6}`

The cardinality of the given multiset (remember that I am using the term Multiset here, as a multiset allows multiple count of the same element in it, and the count is called as multiplicity of the element in the set) is 9, as there are 9 elements in the multiset. However, we can see that a set constructed from the given multiset will contain only 6 elements as the following:

`X' = {1, 2, 3, 4, 5, 6}`

This is the count distinct problem. We need to get the count of the distinct elements from the given multiset. This problem can also be re-phrased as finding out the cardinality of the set constructed from the given multiset. 

##### 2. Naive solution
You might be wondering, this is a simple enough problem, one that I can solve easily in python! 
```python
def countDistinct(multiset):
    set = []
    for item in multiset:
        if item not in set:
            set.append(item)

    return len(set)
```
And yes, I know that the problem can be solved in more elegant ways than this but this is just to give you a simple notion. You can easily understand what the code means, even if you are an absolute beginner in programming and python. Now, we go to the interesting part of computer science, *complexity analysis*.

As we move through the code, we can see that 