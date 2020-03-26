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

The cardinality of the given multiset (remember that I am using the term Multiset here, as a multiset allows multiple count of the same element in it, and the count is called as multiplicity of the element in the set. You might also already know multiset as pythonic lists, or vectors in C++) is 9, as there are 9 elements in the multiset. However, we can see that a set constructed from the given multiset will contain only 6 elements as the following:

`X' = {1, 2, 3, 4, 5, 6}`

This is the count distinct problem. We need to get the count of the distinct elements from the given multiset. This problem can also be re-phrased as finding out the cardinality of the set constructed from the given multiset. 

##### 2. Naive solution and Problem Formulation
You might be wondering, this is a simple enough problem, one that I can solve easily in python! 
```python
def countDistinct(multiset):
    set = []
    for item in multiset:
        if item not in set:
            set.append(item)

    return len(set)
```
This is the naive-est solution possible. And yes, I know that the problem can be solved in more elegant ways (using trees and hashmaps and whatnot) than this but this is just to give you a simple notion. You can easily understand what the code means, even if you are an absolute beginner in programming and python. Now, we go to the interesting part of computer science, *complexity analysis*.

For the worst case, big-oh notation, we can assume a multiset whose all elements are distinct. As such, the new array 'set' will grow to the size of the multiset itself and the appending will run for each element in the multiset. So, the time complexity is O(n^2) because we need to look up in the set for every element's existence, and python implements this using a linear lookup, sadly. And the space complexity will be O(n) as the extra space consumed by the set will be the same as the multiset. Now imagine this for a million views on a facebook video. Now imagine a million videos on facebook and imagine running that computation for roughly 3 billion people on facebook. ( I am taking the example of facebook, but this same algorithm is used everywhere. )

Enter -- HyperLogLog.

<details>
  <summary>Further optimization on the code &rarr;</summary>
  <br />
  <p>    
    You might be thinking that we could easily have made use of hashmaps, but the space complexity would be the same, while removing the need for the lookups (we can just check for the size of the hashmap if it grows in size). However, the space complexity is appreciable, and the whole point of solving the count-distinct problem is to count the number of elements using lesser count of bits than the original multiset.

    However, you can further optimize this approach, maybe by using Bloom Filters- instead of using Hashmaps ( Bloom Filter is going to be the topic of the next post ). Bloom filters give set association of elements (check if an element is in the set or not) with a probabilistic approach. Bloom filters are used extensively. With a proper bit-size, bloom filters perform better than traditional hash-based approaches with a small enough memory footprint and a permissible error. We'll talk about Bloom filters in the next blog post.
  </p>
</details>

&nbsp;

##### 3. 