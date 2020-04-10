---
layout: post
title: Reinforcement Learning
description: Teaching computers to take actions through trial and errors
image: https://i.ibb.co/yhhQZyw/Mr-Whiskers-and-RL-Project-Images-grid.png
author: Sandesh Bhusal
draft: false
---

Computers are able to learn, extract patterns and make inferences from data with the help of many algorithms, like classification, regression, clustering, association algorithms and so on. One of the such interesting methods of teaching a  is reinforcement learning -- teaching computers to comprehend the world through trial and errors.

<br />

<center>
  <img src = "https://d2v9y0dukr6mq2.cloudfront.net/video/thumbnail/Vd3bj2jPe/videoblocks-baby-first-steps-parents-learning-walk-kid-father-holding-child-hands-baby-walking-at-home-family-support-little-kid-baby-learning-to-walk_so7id0h917_thumbnail-full01.png" width="512"/>
  <br /><br />
  <small><i> A baby learning to walk.</i></small>
</center>
<br />

Reinforcement Learning is a class of Artificial intelligence algorithms that aim to teach an agent to take actions in an environment that maximize the cumulative reward [^1]. RL Algorithms have recently been popularized, thanks to big names like Alpha Zero and Alpha Go, which beat the world class players at Chess and Go respectively. The field of RL is connected to many things:

<br />

<center>
  <img src = "https://miro.medium.com/max/640/0*drp-fb4HlhPKEnDp.png" width="256"/>
  <br /><br />
  <small><i> Fig: Fields where RL can be applied. Image taken from slideshow of <b> David Silver </b></i></small>
</center>

<br />

Now that we have a brief notion of the importance of RL, we can start to dive deeper into the field. I will be explaining this blog post based on a simple game.

<br />

### Let's Play A Game 

<br />

We have a mouse, let's call him Mr. Whiskers. Mr. Whiskers, hereon abbreviated as Mr. W, is very fond of cheese. Fortunately, he has access to a lot of cheese in the house he lives in, where the owner stores the cheese in a grid within the house. The floor is made like a grid, where Mr. Whiskers can walk freely without fear during the night. But today is a special day. See, Mr. Whiskers recently went swimming with his friends, and his sinuses are clogged up, so he can't really smell the cheese.

<br />

<center>
  <img src = "https://i.ibb.co/1fxBmgf/mouse-with-no-bg.png" width="256"/>
  <br /><br />
  <small><i> <b> Say Hi to Mr. Whiskers! </b></i></small>
</center>

<br />

Let's look at the floor of the house. The cheese is located conveniently on the top right grid on the floor, and poor Mr. Whiskers is on the bottom left.

<br />

<center>
  <img src = "https://i.ibb.co/yhhQZyw/Mr-Whiskers-and-RL-Project-Images-grid.png" width="512"/>
  <br /><br />
  <small><i> Mr. Whiskers' Home and location of the cheese. </i></small>
</center>

<br />

Let's formulate a problem.

1. Mr. Whiskers can't smell, and its dark, so he can't see. If he could see, then, well, he could directly go to the cheese, but he can't so he shan't.
2. Mr. Whiskers doesn't know where the cheese is, so he can't make educated guesses about his movements. If from the starting position he tries to go to the left, then he bumps into the wall on the left, poor Mr. Whiskers.
3. Mr. Whiskers went swimming with his friends, and that has made him hungry, so with each moment of time that passes, he grows more and more hungry.
4. He can take a step in any direction orthogonal to where he is facing, he can go forward, backward, left or to the right at any instant of time.



Can you help Mr. Whiskers reach the cheese before the night passes? 

<br />

#### Markov Decision Process:

<br />

Now let us study MDPs for a moment, and keep thinking how Mr. W can reach the cheese.

A [Markov Decision Process](https://en.wikipedia.org/wiki/Markov_decision_process) is a discrete time stochastic process, which can be expressed as a 4 tuple. It follows the [Markov Property](https://en.wikipedia.org/wiki/Markov_property), which dictates that it must be a memoryless system. It is expressed as a tuple as: <br />
$$
< S,\ A,\ T,\ R\ >
$$
<br />Where:

$$ S  $$ - List of all states 

$$A$$ - Set of actions

$$T$$ - Transition function

$$R $$ - Reward function.

Let's analyze each of these briefly with respect to our game.

###### S - SET OF STATES:

S here is the set of states that are possible for the world to be in. Here, in our previous example, the location of the cheese is fixed so we will ignore it. Mr. W can be in any of the squares in our $$5\times5$$ grid. So there are a total of 25 states in our world, which are characterized by Mr W being in any of them.

###### A - SET OF ACTIONS:

A is the set of all actions Mr. W can take in any state. Mr. W has the option to move forward, backward, to left or to the right. So, the set of actions can be

$$ A = \{ Up,\ Down,\ Left,\ Right \} $$

###### T - TRANSITION FUNCTION:

A Transition Function is characterized by the world, where it gives a discrete value or a probability distribution of the transition of the world from one state to the next based on the action taken by the agent. Based on this, the transition function can be either deterministic or stochastic.

1. Deterministic Transition Function - The value of next state for each action taken in a state is fixed and does not change. For an example, suppose Mr. W wants to move to the left, so we know for sure that he will bump into the wall for sure!
2. Stochastic Transition Function: A stochastic transition function means that the transition over another state from current state through the occurence of an action is given by a probability distribution. Let's imagine for a moment that someone left the windows open, and the winds are blowing really hard. If Mr. W wants to move forward in the grid, then there is some probability that he will not end up in the grid immediately above his position, say, the wind blows him off and lands him in the grid to the left!

Based on these factors, we say that the transition function gives the probability distribution of a new state, given a current state and the action taken in that state, i.e.<br/><center>
$$
\mathbb T(s, s')= \mathbb P(s_{t+1} =s'|s_t, a_t)
$$
</center>

This means that the transition function, which is a function which shows the relation between two states, is the probability that the world will transition to a new state $$ s'$$  given that an action $$ a_t $$ is taken in state $$ s_t $$. 

<details>   <summary>Reading probability formulae</summary>   <p> For those of you who are unable to read the above formula, I suggest studying some basic probability first. The afforementioned formula gives the conditional probability. Conditional Probabilty, expressed as P(A|B) and read as probability of occurence of event A given that event B has already occured, is an important part in the study of RL algorithms, because stochastic models are based on this. </p> </details>

<br />

###### R - REWARD FUNCTION:

Every time Mr. W moves in the grid, he gets hungrier. If he was not hungry at all, he would never explore the floor, and would go straight to sleep. However, if he finds the cheese, he will get a big reward. So for each movement in any state that ends up taking Mr. W to a new state, the reward function gives him some value. Note that delayed reward is essential in this state, as we will come to understand later on.

So, reward function can be expressed as:
$$
R(s, a) = \mathbb R
$$
<br />MDPs have long been used in the field of optimization problems, even since the 1950s. MDPs will help us discover a policy to solve the problem.

<br />

#### Policy:

<br />

A policy is the action that anyone trying to solve the MDP will try to follow. In the case of Mr. Whiskers, it is a function that maps his actions based on the state he currently is in. For an example, if he is in the state where he will reach the cheese if he goes one step to the right, he must do it. Formally, it can be expressed as:<br /><center>
$$
\pi : A\times S \rightarrow [0, 1]
$$
</center>

For any of you who find this difficult to understand, the policy is expressed as a function $$\pi$$ , which maps each action-state pair to a probability, which is a real number between 0 and 1. For an action pair at the starting position of Mr. W, the policy for going to the left should be very low, but to the right or upwards should be very high. If we can find a policy that can map out the exact requirements according to the world, then we call this policy an optimal policy and it is represented as $$\pi^*$$.

<br />

### Let's solve Mr. Whiskers' Problem!

<br />

Now that we have laid down the problem as  a mathematical formulation, we can go on a try to solve this problem. Now that you have learned about MDPs, there are two methods to solve this problem. One is the **model free** method and the other is **model based** method. The methods depend upon the formulation of the problem.

Let us assume for a moment that we knew about the transition of any state based on an action. ( Remember that until now, Mr. Whiskers does not know if moving forward in any grid lands him in a different grid, or he will just bump into the wall ). Say that Mr. Whiskers knows everything about the grid, and he knows the transition function (we have studied about transition function already so I will not describe it again). Let's assume that Mr. Whiskers knows about the position of the cheese in the grid, and mousetraps (spoiler alert), if any. Then you would scream and say Voila! I know Dynamic Programming and other methods to solve this problem! Should be easy! This type of solution is called as a model based method. A model based method is the one where the Transition function $$ T $$ and the reward function $$ R $$ are explicitly known to the agent.

But in our current case, the transition function is unknown and Mr. Whiskers does not know the rewards of moving into a new state. This type of method is called as a model-free method, where the transition function and reward function is unknown to the agent, i.e. Mr. Whiskers does not know about the effects of his movement, and based on environmental feedback, he needs to change his policy for movement.

<br /><Br />

<hr />

<br />

###### FOOTNOTES:



[^1]: **Cumulative reward**: Cumulative reward refers to the total accumulated reward during the lifetime of operation of the agent. For a RL agent, there can be two types of expectations, either the agent considers or does not consider delayed rewards.

