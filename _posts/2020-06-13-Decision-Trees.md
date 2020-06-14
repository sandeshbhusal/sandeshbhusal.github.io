---
layout: post
title: Decision Trees
description: Branch Branch Branch and Bam!
image: /assets/imgs/posts/decision_trees/hero.png
author: Sandesh Bhusal
draft: false
---
<center>
  <img src = "/assets/imgs/posts/decision_trees/bus_question.jpeg" width="256"/>
  <br /><br />
  <small><i> Example: Finding object by asking questions, a game I used to play.</i></small>
</center>
<br />

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
<br />

### 2. Structure of a Decision Tree:
A decision tree contains nodes, leafs and edges. Some authors like to distinguish between root and internal nodes, but I do not like the distinction, as all internal nodes have the same properties as the root note. (Please feel free to contact me <a href= "mailto:073bct539.sandesh@pcampus.edu.np">here</a> if you have any contesting ideas!) Anywhoo, any node represents the collection of data at that particular node. As in the example above, we can easily imagine a lot of things in the bus. The first question asks if the thing is red, and when a negative answer is given then a conclusion is reached, where all the red things in the bus are eliminated. That reduces the amount of information to be processed next. 

From the example we can see that, the first node is the collection of all objects in the bus, but from the first split, a new state is reached which is characterized by the collection of all objects in the bus that are not red. The question to be asked is the edge in the tree. Amongst many attributes of objects in the bus, we have chosen "color" as the criteria. This is an *attribute*. The objective of the game is to find the object in as few questions as possible. So, while selecting *spiltting attributes*, we need to choose the one, that minimizes the number of objects to be considered in the next iteration. 

<center>
  <img src = "/assets/imgs/posts/decision_trees/components.jpeg" width="512"/>
  <br /><br />
  <small><i> Parts of a decision tree.</i></small>
</center>
<br />

So the main things to keep in mind while trying to construct a decision tree are the following:
1. Each node in the decision tree represents a collection of objects that are to be further 'split' in order to determine our final object.
2. Each node gives rise to one or more nodes, that represent a subset of objects contained in the node before it (parent node).
3. Splitting criteria for a node is any attribute on the set of objects that determines how the set is going to be split in different nodes.
4. We try to find the final object in as few questions as possible. This means at each step of splitting a node, we need to select a suitable attribute for the split that will try to keep our position neutral (if we try to split using a attribute that produces a very skewed distribution of data, say, 7:10 then if we land on the 10 side, we will need much more effort to find out the object. So we try a middle split like 1:1 )

Although the principles of the game may not exactly translate to construction of decision trees, they are quite similar. Point #4 denotes the 'entropy' of the dataset under split, and we want a split that will minimize the entropy of the overall dataset after split. 
[ For calculation of entropy under a probability distribution, check this out!](https://planetcalc.com/2476/)

<br />

### 3. Problem Statement:

Decision Trees are widely used in classification tasks, and that is going to be the primary focus of ours in this blog post. While decision trees are also used in other domains, such as CART trees which can perform both classification and regression, we are not going to discuss about those in this blog post. 

Classification is a supervised learning task, opposed to clustering which is an unsupervised learning task. For classification, we need a labeled dataset that contains *labeled* data, i.e. the data that contains some classes. Let's consider a textbook example for now:
<br />
<center>
  <img src = "/assets/imgs/posts/decision_trees/classification_table.png" width="512"/>
  <br /><br />
  <small><i> Example of a classification task: A decision must be made if we want to play golf or not based on current weather conditions.</i></small>
</center>
<br />
The above table is a widely used textbook example while explaining the concepts of a decision tree. In the posed problem, we are given a table of **labeled** data, which tells us the decision to take under given weather conditions. For classification purposes, the data may be from the given table, or from somewhere else. 


### 4. Hunt's Algorithm:

Hunt's algorithm forms the basis for many Decision Tree algorithms, including ID3, C4.5, CART and so on. Hunt's algorithm is quite simple actually if you look at it. In this section, we will go over a simple dataset that I have constructed for the purposes of this tutorial, and we will talk about Hunt's algorithm in brief.

Hunt's algorithm is an iterative algorithm that tries to partition the given dataset progressively, reducing the class labels of the partitioned dataset into purer and purer classes as further as we go. Let us consider a **dataset** $$ D $$. Dataset $$ D $$ is the set of a set of tuples, $$ D = \{ d_1, d_2, d_3, ... d_n \} $$ where $$ n $$ is the total number of **samples** available to us in the dataset. Each **tuple** in each data point corresponds to some value of an **attribute**, i.e. $$ d_x = \{ a_1, a_2, a_3, ... a_m \} $$ where $$m$$ is the number of attributes that we have. For an example let's consider the example below:

<br />

| S.N. | Age | Sex    | Married | Homeowner |
|------|-----|--------|---------|-----------|
| 1    | 30  | Female | No      | No        |
| 2    | 35  | Female | Yes     | Yes       |
| 3    | 48  | Male   | Yes     | Yes       |

<br />

Here, the total number of samples available to us is 3. So $$n = 3$$. Also, there are four attributes (not counting Serial Number), namely *Age*, *Sex*, *Married* and *Homeowner*. The number of attributes in consideration is actually $$3$$, as the fourth attribute, *Homeowner* is also our class label, i.e. the thing we are trying to predict.

Hunt's algorithm begins with a complete description of a dataset, which is also called as the *root node*. Then, the algorithm proceeds in the following way:

```awk
1. For a Node N, the input dataset is D.
2. Construct a root node, containing all data.
3. let currentNode = root node
4. For each attribute in current Node:
   a. Split given dataset in current node with attribute 'a', with respect to some testing condition
   b. The testing condition should return a ranking of some kind to rank attributes suitable for partitioning the dataset.
5. Once all attributes are ranked in current node, choose one attribute with best rank.
6. Partition the dataset according to the attribute into different datasets. The new datasets do not contain the attribute that was used to partition them.
7. Repeat steps 4 to 6 until:
   a. A pure node is reached, where all data belong the same class.
   b. No more attributes are left to partition the dataset, so a majority voting is done to assign class label to such node.
```

Steps 7(a) and 7(b) produce what we call as leaf nodes. The ranking system can be different depending on requirement and algorithm. We can test fit for partition attributes using Entropy or Gini Index and so on. We can see Hunt's algorithm is iterative in nature from above example. 

The partitioning of node might give a rise to different conditions. In the above example, if we choose "Married" as the partitioning attribute, then we get two new nodes, one for "Yes" and the other one for "No". However, the case might be different for continuous values such as age. In such condition, we might get new nodes like "Age < 35" and "Age >= 36" and so on. In case of ordinal categorical values, however, it is important to maintain the ordinality of variable if fewer splits than possible are to be made.

For an example, we have a "Temperature" attribute that can be "Hot", "Lukewarm", "Mild", "Cold" and "Freezing". If we wish to partition this into two branches only, we cannot make new branches like \{\{Hot, Cold\} and \{Lukewarm, Mild, Freezing\}\}. What I am trying to say is that in case of ordinal categorical variables, the order of the values must be preserved before partitioning the dataset.


<center>
  <img src = "/assets/imgs/posts/decision_trees/right_ordinal.jpeg" width="300"/>
  <img src = "/assets/imgs/posts/decision_trees/wrong_ordinal.jpeg" width="300"/>
  <br /><br />
  <small><i> Left image shows correct way to partition using ordinal categorical variables. Right is wrong. (pun) </i></small>
</center>
<br />


Applying Hunt's algorithm to the above example, might lead to a variety of trees being created. For an example, with Entropy method, "Married" and "Age" attributes are equally likely to partition the dataset right at the beginning into pure nodes, and we can choose either one of them. Depending on the attribute selection method, different decision trees may be generated!


<center>
  <img src = "/assets/imgs/posts/decision_trees/alt_tree_1.jpeg" width="256"/>
  <img src = "/assets/imgs/posts/decision_trees/alt_tree_2.jpeg" width="256"/>
  <br /><br />
  <small><i> Alternative decision trees that can be made! </i></small>
</center>
<br />


### 5. Construction of a Decision Tree -- An Example:
I have implemented a simple and dirty example of a decision tree used to create a decision tree for the textbook example mentioned above. The notebook can be found on my github profile. Here's the code:


{% include_relative decision_tree.md %}

<br />
<center>
  <img src = "/assets/imgs/posts/decision_trees/hero.png" width="512"/>
  <br /><br />
  <small><i> Finally generated decision tree. Can we play golf? Let the leaf nodes answer!! </i></small>
</center>
<br />

### 6. Build your own Decision Tree
Hmm.. The code above seems quite long though not complicated and it would be very difficult for us to visualize it in case of a large dataset. Also, we have only worked with nominal discrete values in the dataset (values that are categorical and not ordered in terms of value). For building more complicated decision trees, we can use different python packages out there which greatly simplify the task at hand, and also help us visualize the output of the decision tree! I leave the task to the reader of this blog post -- once you've created your own decision tree, using other peoples' libraries is a nominal task. But bear in mind the categorical values, and continuous values in decision tree making process. Some libraries don't play very well with those! For example, `sklearn` requires user to input non-nominal values, so for that you can do different types of variable encodings like one-hot encoding, binary encoding and so on.

Scikit Learn has an excellent documentation on decision trees and I would like to request you to hop on over there and check it out for yourself! 

[Scikit Learn Decision Tree Documentation](https://scikit-learn.org/stable/modules/tree.html).


### 7. The pros and cons of classification using Decision Trees:
We are almost at the end of this article. We have learned about what a decision tree is, how it is used, the parts of a decision tree and how you can implement a simple decision tree yourself in python! Let's discuss some strengths and weaknesses of a decision tree classifier. Let's begin with the strengths first:

**Strengths:**
- Implementing a decision tree is a trivial task if you are working with nominal variables. Same code can be tweaked to work with continuous values and ordinal values too! 
- Visualizing the output of a decision tree is very close to human comprehension, compared to black box methods like a neural network.
- Very little to none data preprocessing is required for generating a decision tree.

**Weaknesses:**
- Decision trees are prone to overfitting. That is why we use Random Forest Classifiers.
- Decision trees are not very flexible to change in data. 

If you have something to add to the list, feel free to contact me!

That's all for this article, folks!

<hr />

#### References:
- [ Steinbach et. al's <i>excellent</i> book on data mining. Chapter on classification. ](https://www-users.cs.umn.edu/~kumar001/dmbook/ch4.pdf) 
- [Good old wikipedia reading!](https://en.wikipedia.org/wiki/Decision_tree)