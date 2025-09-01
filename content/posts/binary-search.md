---
layout: post
title: "Binary search is Bananas!"
date: 2023-08-19
template: "post.html"
tags:
- algorithms
- proofs
toc:
  sidebar: right
---


## Refresher
Binary search is one of the most trivial and elegant algorithms to understand, and yet, equally easy to get wrong while implementing it. There are a couple of checkpoints, comparisons and constants, which contribute to the running of the algorithm, which can be easily mistaken. In essence, binary search works by partitioning a given array into two halves successively, until a single element (or position) is reached where the target of interest may be. This means, during each run of the algorithm, we have the following choices to make:

- Has the algorithm terminated? If so, has it found the target (or position)?
- Which array is the array of interest currently, and which subsection will we explore next?
- Will the algorithm / loop terminate?

Binary search keeps track of position information in two pointers (although a variant of [one-sided binary search](https://www.geeksforgeeks.org/meta-binary-search-one-sided-binary-search/) is also possible). These pointers, can be called `low` and `high`, and represent the range of the array we are searching within (inclusive), i.e. `[low, high]`.

## Pseudocode
Let's proceed with a simple pseudocode implementation which leaves a lot of blanks out to be filled in later on (proofs, etc). It looks something like this:

```python
def binarysearch(array: List[int], target: int) -> int:
    low, high = __, __
    while low __ high:
        mid = (low + high) // 2
        if array[mid] == target:
            return mid
        if array[mid] __ target:
            low = mid + __
        else:
            high = mid - __

    return -1
```

You must've noticed a few blanks in the pseudocode above. Don't worry - we'll fill them later on. For now, let's define some properties we'd like the algorithm to have.
### Desired properties.
Like the questions above, the desired properties for the algorithm can be described as follows:
#### Correctness:
- The Algorithm must always produce a correct answer. That is, if an element exists in the array, it should return the index of the said element. Otherwise, it should return -1. If an element exists and the algorithm returns -1, it is incorrect, and the same can be said when a non-existing element search returns an index within the array.

> This kind of issue generally manifests itself in corner cases, like in a unit-sized array, or when the target element lies on the array boundaries (leftmost/rightmost element).

#### Liveness:
- The Algorithm must always terminate. This means, for every array, the algorithm must produce an output and exit.

> This kind of issue generally manifests itself when the comparision operations within the algorithm fail. For an example, the bounds do not get updated, or there is a stray equality comparision which lets the algorithm run without stopping.

## Filling in the blanks
Let's start filling in the blanks on the above code.

### Determining search starting bounds and loop invariant
The first blank decides where the array search starts. It is evident that we want to start searching from the beginning of the array, so it has the value of \\(0\\). The same can not be said for the high bound, though, because it determines what the loop condition will be. So let's fill that out first.

We know that a binary search converges when the length of the search array becomes unit, i.e. \\(1\\). This means, the left bound and right bound should coincide (since we are searching in an inclusive array, i.e. \\( [low, high] \\)). So the algorithm's loop should run until the bounds coincide, at which point either the element is already found and returned, or the element was not found and the algorithm terminates. So, we have two ways to show non-coinciding bounds:
$$ loop\ while\ \ (low < high) $$ or $$ loop\ while\ \  (low \neq high) $$

If we opt to go with the second method, i.e. `loop while (left != right)`, then, the right bound cannot be set to `len(array) - 1`, since in a two-sized array, this will effectively prevent the looping from happening at all. So, the bounds and loop invariants can be determined as:

1. If `low = 0`, `high = len(array)`, then the loop invariant to hold is `low < high`.
2. If `low = 0`, `high = len(array) - 1`, then the loop invariant to hold is `low <= high`.

### Determining the conditional check at `mid`.
Looking at the pseudocode again, we have this segment to fill out:
```python
...
        mid = (low + high) // 2
        if array[mid] == target:
            return mid
        if array[mid] __ target:
            low = mid + __
        else:
            high = mid - __
...
```

Which is the inner part of the loop. The first check is to see if `array[mid]` meets the target, is smaller, etc. Since we have assumed an array sorted in the ascending order, we update the lower bound _only_ when the middle element is such that the target cannot be in the LHS of the array. This means, target could be either less than, or equal to `array[mid]`. However, as we see above, when `array[mid] == target`, we have an early return. So the only conditional that can fit is `if array[mid] < target`.

### Updating bounds
Lastly remaining - to update the bounds. When the middle element of the array is smaller than the target, there is no point starting the low bound again from midpoint, so we update it as `low = mid + 1`. However, if it is not smaller than the target, it means, it could be greater than the target, or equal to it. Since we already do an equality comparision with target above it, it would be strictly greater than the target. As such, we can exclude it from search next, so we update `high = mid - 1` in the next blank.

## Final solution
This generates the following code finally:

```python
def binarysearch (array: List[int], target: int) -> int:
    low, high = 0, len(array) - 1
    while low <= high:
        mid = (low + high) // 2
        if array[mid] == target:
            return mid
        if array[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
```

## Proof of termination

We are interested in checking that the algorithm terminates properly. Since we have chosen multiple constants and equality checks above based on one-another, they form a subset of choices that could've been made, so we will not check for correctness now.

For proof of termination, we will check two scenarios, based on the bounds we chose to go with. They are:
1. `high = len(array) - 1` and loop invariant as `low <= high`
2. `high = len(array)` and loop invariant as `low < high`

Now, we look to proving the loop will indeed converge, and for this, we will use proof by contradiction.

### Scenario #1
- For the loop to continue running forever when `loop until low <= high` invariant is upheld, the `low` bound should be strictly less than or equal to the `high` bound. This means, no matter what happens, `low` can never exceed `high`.
- Which means `low = mid + 1`, i.e. `low = (low + high) // 2 + 1` never exceeds high.
- When `low == high`, however, `low = (low + high) // 2 + 1` becomes `low = (high + high) // 2 + 1`, i.e. `low = high + 1`.
- This means, in the next iteration, `low = high + 1` will violate the loop invariant, and the loop converges. 

### Scenario #2
- For the loop to continue running forever when `loop until low < high` invariant is upheld, the `low` bound should never be equal to or greater than the `high` bound. The greater condition is already proved above.
- This means `low` can never be equal to `high`.
- In a finally-converging loop with range size = 2, i.e. `low = high - 1`, by virtue of integer division flooring the `mid` value becomes: `mid = (low + high) // 2`, i.e. `mid = (high + high - 1) // 2`. Upon adding `1` to this in the loop update, `low = mid + 1`, it becomes `low = (high + high - 1) // 2 + 1`, which becomes equal to `high`.
- This means, in the next iteration, `low == high` will violate the loop invariant and the loop converges.

## Conclusion

This was a longer-than-expected blog post. Please let me know of any errors in the post by raising a issue in the [github repository for this blog](https://github.com/sandeshbhusal/sandeshbhusal.github.io).