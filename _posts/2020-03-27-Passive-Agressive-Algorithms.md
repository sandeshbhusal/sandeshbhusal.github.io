---
layout: post
title: Uniform Hashing
description: How facebook knows how many unique people have performed an action. ( Count Distinct problem )
image: https://koaning.io/posts/priors-of-great-potential/drawing7.png
author: Sandesh Bhusal
draft: true
---

Hyperlog Log algorithm is a [probabilistic cardinality estimator](https://en.wikipedia.org/wiki/HyperLogLog). What does this mean? Well, let's go through the **count-distinct problem** and take a look at how the HyperLogLog aims to solve this problem.


#####  1. Introduction to the Count-Distinct Problem:
The count distinct problem, also known as the cardinality estimation problem is a well-known problem in a computer science, that aims to find the count of distinct items in a multiset, using storage units fewer than the count of elements (distinct and otherwise). Here's an illustration. Let us consider the following multiset of elements:

$$ X = \{1, 2, 3, 1, 2, 3, 4, 5, 6\} $$

The cardinality of the given multiset (remember that I am using the term Multiset here, as a multiset allows multiple count of the same element in it, and the count is called as multiplicity of the element in the set. You might also already know multiset as pythonic lists, or vectors in C++) is 9, as there are 9 elements in the multiset. However, we can see that a set constructed from the given multiset will contain only 6 elements as the following:

$$ X' = \{1, 2, 3, 4, 5, 6\} $$

This is the count distinct problem. We need to get the count of the distinct elements from the given multiset. This problem can also be re-phrased as finding out the cardinality of the set constructed from the given multiset. 

##### 2. Naive solution and Problem Formulation
Now that we have some idea about the problem, let's see where this thing is actually used. Think about this for a moment -- You have a blog that gathers millions of views called "Sandesh Bhusal's Blog" hosted on github. Well, that's what the view counter at the bottom of the page says. But there's a problem -- the view counter counts every hit on the page as a unique view. But in order to apply for monetization of your blog, you need actual metrics of **unique** views on your blog every single day. That means that from the set of all given views, you need to filter out the unique IP Addresses.

You might be wondering, this is a simple enough problem, one that I can solve easily in python! 
```python
def countDistinct(multiset):
    set = []
    for item in multiset:
        if item not in set:
            set.append(item)

    return len(set)
```

This is the naive-est solution possible. And yes, I know that the problem can be solved in more elegant ways (using sets and hashmaps and whatnot) than this but this is just to give you a simple notion. You can easily understand what the code means, even if you are an absolute beginner in programming and python. Now, we go to the interesting part of computer science, *complexity analysis*.

For the worst case, big-oh notation, we can assume a multiset whose all elements are distinct. As such, the new array 'set' will grow to the size of the multiset itself and the appending will run for each element in the multiset. So, the time complexity is O(n^2) because we need to look up in the set for every element's existence. And the space complexity will be O(n) as the extra space consumed by the set will be the same as the multiset. Now imagine doing this for your blog which has say 30 million views in a month. You are looking at IP Addresses with 32 bits length, and a multiset that contains 30 million of those. The size of the multiset alone would be 114.44 Megabytes. That is a **lot** of data. What if you have 30 million *unique* visitors?! Then your space requirements would exceed that of your content in the blog itself! 

Enter -- HyperLogLog.

<details>
  <summary>Further optimization on the code &rarr;</summary>
  <br />
  <p>    
    You might be thinking that we could easily have made use of hashmaps, but the space complexity would be the same, while removing the need for the lookups (we can just check for the size of the hashmap if it grows in size). However, the space complexity is appreciable, and the whole point of solving the count-distinct problem is to count the number of elements using lesser count of bits than the original multiset. For a set, the code could look like this:
<pre>
def countDistinct_set(multiset):
    return len(set(multiset))

def countDistinct_hash(multiset):
    # Let us consider an imaginary, **uniform** hashing function, hash().
    d = {}
    for item in multiset:
        h = hash(item)
        d[h] += 1
    
    return (len(d.keys()))
</pre>
    Keep in mind that, though the addition and searching are now faster; rather than searching for each element as is the case for an array, sets and hashmaps are considerably quicker and hashmaps do not even need to search for addition, the storage requirement has not been reduced. For a multiset with all distinct elements, this is still O(n).
    <br /><br />
    However, you can further optimize this approach, maybe by using Bloom Filters- instead of using Hashmaps. Bloom filters give set association of elements (check if an element is in the set or not) with a probabilistic approach. Bloom filters are used extensively. With a proper fixed bit-size and bucket count, bloom filters perform better than traditional hash-based approaches with a small enough memory footprint and a small permissible error.
  </p>
</details>

&nbsp;

##### 3. HyperLogLog Algorithm Formulation

As the "cardinality estimator", we can say two things for sure -- HyperLogLog gives a probabilistic measure of cardinality. Now that I have grabbed the attention of all you data science and stats geeks out there, let's continue with the parts of a cardinality algorithm. In short, the algorithm needs the following parts:

1. Add : To add new elements to the set.
2. Count : To retrieve the count of distinct elements in the set.
3. Merge: To obtain the union of two sets.

The practical considerations and derivations will be discussed shortly.

HyperLogLog assumes a storage array of element size $$ M $$. Multiple such storage elements, each with size $$ M $$ might be used for the estimator. 

###### 3.1 Addition of elements:


<br /><br />
#### References:
<br />
1. [HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm<br />
Philippe Flajolet, Eric Fusy, Olivier Gandouet, Frédéric Meunier -- The original Paper](https://hal.archives-ouvertes.fr/file/index/docid/406166/filename/FlFuGaMe07.pdf)

2. [Good old Wikipedia -- A good reference](https://en.wikipedia.org/wiki/HyperLogLog)
<br />
