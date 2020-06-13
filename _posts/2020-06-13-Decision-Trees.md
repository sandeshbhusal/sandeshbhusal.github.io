---
layout: post
title: Decision Trees
description: Branch Branch Branch and Bam!
image: https://i.ibb.co/yhhQZyw/Mr-Whiskers-and-RL-Project-Images-grid.png
author: Sandesh Bhusal
draft: false
---

Decision trees are exactly what the name sounds like -- a method to make decisions. Wheather those decisions are related to finance (decision trees are used in economics to analyse the utility of a decision) or to draw inference from a set of data. Technically, decision trees are a series of questions that split the total solution space to smaller and smaller fragments until a conclusion can be drawn.

### 1. Introduction:
One game comes to mind when I start thinking about decision trees. Whenever we were taken on an outing by the school on a bus, one of the students would spot something and everyone else would try to guess it.
<center>
 <i>Q: Is it red?</i><br />
 <i>A: No</i><br />

 <i>Q: Is it black?</i><br />

 <i>A: Yes!</i><br />

 <i>Q: Is it shaped like a ring?</i><br />

 <i>A: Yes!</i><br />

 <i>Q: Is it the steering wheel?</i><br />

 <i>A: You are right!!</i><br />
 <br />
</center>
While building a decision trees, every algorithm follows a generic guideline. Before learning about the guideline, let's learn about the parts of a decision tree:

#### 1.1. Parts of a decision tree:
A decision tree contains nodes, leafs and edges. Some authors like to distinguish between root and internal nodes, but I do not like the distinction, as all internal nodes have the same properties as the root note. (Please feel free to contact me <a href= "mailto:073bct539.sandesh@pcampus.edu.np">here</a> if you have any contesting ideas!) Anywhoo, any node represents the collection of data at that particular node. As in the example above, we can easily imagine a lot of things in the bus. The first question asks if the thing is red, and when a negative answer is given then a conclusion is reached, where all the red things in the bus are eliminated. That reduces the amount of information to be processed next. 

From the example we can see that, the first node is the collection of all objects in the bus, but from the first split, a new state is reached which is characterized by the collection of all objects in the bus that are not red. The question to be asked is the edge in the tree. Amongst many attributes of objects in the bus, we have chosen "color" as the criteria. This is an *attribute*. The objective of the game is to find the object in as few questions as possible. So, while selecting *spiltting attributes*, we need to choose the one, that minimizes the number of objects to be considered in the next iteration. 

So the main things to keep in mind while trying to construct a decision tree are the following:
1. Each node in the decision tree represents a collection of objects that are to be further 'split' in order to determine our final object.
2. Each node gives rise to one or more nodes, that represent a subset of objects contained in the node before it (parent node).
3. Splitting criteria for a node is any attribute on the set of objects that determines how the set is going to be split in different nodes.
4. We try to find the final object in as few questions as possible. This means at each step of splitting a node, we need to select a suitable attribute for the split that will try to keep our position neutral (if we try to split using a attribute that produces a very skewed distribution of data, say, 7:10 then if we land on the 10 side, we will need much more effort to find out the object. So we try a middle split like 1:1 )

Although the principles of the game may not exactly translate to construction of decision trees, they are quite similar. Point #4 denotes the 'entropy' of the dataset under split, and we want a split that will minimize the entropy of the overall dataset after split. 
[ For calculation of entropy under a probability distribution, check this out!](https://planetcalc.com/2476/)

<details>
  <summary><i>Information and Entropy:</i></summary>
  <p>
    <br />
    You should check out my blog post regarding information and entropy for more information.
    // TODO: Complete this section.
  </p>
</details>

<br />

#### 1.3 The Dataset and Hunt's Algorithm

Hunt's algorithm forms the basis for many Decision Tree algorithms, including ID3, C4.5, CART and so on. Hunt's algorithm is quite simple actually if you look at it. In this section, we will go over a simple dataset that I have constructed for the purposes of this tutorial, and we will talk about Hunt's algorithm in brief.

<br />

#### References:
- [ Steinbach et. al's <i>excellent</i> book on data mining. Chapter on classification. ](https://www-users.cs.umn.edu/~kumar001/dmbook/ch4.pdf) 