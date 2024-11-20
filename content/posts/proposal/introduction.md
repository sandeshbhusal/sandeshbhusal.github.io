+++
title= "Proposal - Introduction"
date= 2024-11-17
template= "post.html"
math= "katex" 
draft= true
tags = ["programming languages", "compilers"]
series = "proposal"
+++

Data-driven software engineering has emerged as a transformative approach to optimizing and advancing various software engineering practices. Central to this methodology is the collection and analysis of program execution data, particularly the values of program variables captured at specific locations during runtime. These insights are leveraged to enhance processes such as dynamic invariant generation, fuzzing, and testing, all of which play a critical role in ensuring software reliability and performance.

A key driver of these processes is the quality and diversity of inputs used to validate and analyze software systems. These inputs can take multiple forms, including:

- Test cases designed to traverse specific program code paths.
- Function inputs tailored to evaluate discrete program components.
- Symbolic inputs employed in symbolic execution to explore execution paths systematically.

The volume and variety of inputs are particularly crucial for input-intensive techniques like fuzzing and testing, where large datasets are needed to comprehensively assess the system under test (SUT). These inputs fuel the execution of the SUT, generating valuable execution traces—detailed records of program behavior during runtime.

Since the effectiveness of data-driven software engineering depends heavily on the quality of these execution traces, crafting high-quality, diverse inputs becomes paramount. Well-constructed inputs enable better exploration of program behaviors, more robust validation of software properties, and ultimately more effective detection of bugs and vulnerabilities.

Depending on the software-engineering process at hand, different types of inputs might be required to the SUT. In this work, we focus exclusively on the task of Dynamic Invariant Generation. Dynamic invariant generation is a software analysis technique used to infer properties or patterns (called invariants) about a program's behavior by observing its execution. It works by running a program with various inputs and observing the execution traces—the values of variables and the control flow during these runs. By analyzing these traces, tools like DIG and Daikon infer patterns that consistently hold true and present them as candidate invariants. This technique requires a high volume of high-quality data point traces to generate precise invariants for a given program path.

## Generating inputs for invariant generation

As outlined above, several techniques are available for input generation for a system under test. Some tools utilizing these techniques are briefly described below:

### LibFuzzer
LibFuzzer is an example of a fuzzing tool that generates inputs to the SUT in a coverage-guided approach using evolutionary algorithms. The fuzzer is linked to the SUT, generates inputs, and tracks coverage using instrumentation techniques. LibFuzzer maintains an internal "corpus" of interesting inputs that it successively keeps on mutating until it discovers an interesting behavior like a crash, or execution of previously-uncovered path at which point it saves the new input into the corpus. In this respect, LibFuzzer is coverage guided and crash-guided. It is useful in generating inputs that trigger corner cases in the SUT execution.

### Randoop
Randoop is a feedback-directed random testing tool that generates unit tests for Java programs. It creates test inputs by randomly selecting method sequences, executing them, and using the results to guide further test generation. The tool builds method sequences incrementally, extending previously-constructed sequences with new method calls. Randoop maintains pools of "contract-violating" and "regression" test suites. Suites that show normal behavior are put into the regression corpus, and the ones that generate contract violations are categorized as such. New test suites are generated from the regression suite. While Randoop does generate a collection of test cases, its primary goal is finding violations of API contracts and generating regression tests, rather than producing a comprehensive corpus of diverse program inputs suitable for mining program invariants.

<!-- https://homes.cs.washington.edu/~mernst/pubs/pacheco-randoop-oopsla2007.pdf -->

### Evosuite
EvoSuite is an automated test generation tool that uses genetic algorithms to create test suites for Java classes. While it employs multiple testing criteria (known as its fitness functions), including branch coverage, line coverage, mutation testing, and exception coverage, its primary goal is generating minimal test suites that achieve high coverage. EvoSuite evolves its test cases through crossover and mutation operations, preserving those that improve the fitness functions' scores. The tool maintains a population of test suites during its search, and this population is continuously refined toward coverage goals and fault detection. EvoSuite's search-based approach is optimized for finding the smallest set of test cases that achieve its testing objectives, so, once a coverage criteria is fulfilled, it does not consider it to be a part of it's broader "objective"s for the genetic algorithm anymore.

## Issues in generation of diverse inputs for invariant generation

Most tools for test generation, such as EvoSuite, are designed to produce inputs that achieve high coverage, induce crashes, or ensure regression testing. However, these tools are not ideal for generating diverse inputs aimed at invariant generation, as they often fail to revisit program paths for which invariants are to be generated.

### Example A: A Simple Branch Condition

Let us consider the following program segment:

```java
if (a < b) {
    // Generate invariants here for a, b
    // Some code.
} else {
    // Generate invariants here for a, b
    // Some code.
}
```

When executing this program, EvoSuite generates values for a and b to cover both branches. For instance, in one arbitrary run, the generated values are:

```plaintext
if block: a = 0, b = 0
else block: a = -845, b = 0
```

These inputs perfectly cover the statements in the code. However, this small corpus of data points is insufficient for generating robust invariants.

```plaintext
b one of { -845, 0 }
a == 0
```

_Invariants generated by Daikon_

```plaintext
a == 0
a <= 0
max(b, 0) - a == 0
b == 0 (mod 845)
a - b == 0 (mod 845)

```

_Invariants generated by DIG_


From the figures above, it is clear that while the generated invariants are a subset of the true invariants, we can easily find data points that will invalidate these invariants, since only one of these invariants. At a first glance, it seems like these invariants are very precise, but all of these invariants are spurious in nature, i.e. not ture, and can be invalidated after finding more data points as counterexamples.


Dynamic invariant generation tools are crucial for detecting loop invariants, which must hold before, during, and after loop execution to prove program correctness. These tools infer patterns by observing variable values during loop iterations and generating invariants that hold across the observed data points.

However, these tools often focus solely on invariants inside the loop, neglecting those that occur before and after the loop. This approach is problematic because loops execute significantly more iterations than the surrounding statements, leading to an overrepresentation of loop traces. This imbalance results in incomplete invariant sets that fail to capture the program's full behavior.

To address this, it is essential to generate diverse program traces that cover pre-loop, in-loop, and post-loop behaviors. A broader and more balanced trace collection ensures robust invariants that comprehensively demonstrate program correctness, both within loops and in the surrounding code. This work also aims to explore this issue, which can be resolved by generating diverse and large dataset of program inputs that can exercise the statements before, during, and after the loop execution.

## Possible solution

If the only issue with all these tools is the generation of a large quantity of data alone, a valid and quick conclusion would be to run these tools multiple times with different seeds to generate a large dataset. One such exercise was done with Evosuite on the same example program above, running it 3 times on the input program, and the generated invariants were:

**Data**
```plaintext
a = 0, b = 0
a = 0, b = -845
a = -1129, b = -1129
a = -860, b = -1129
a = -4115, b = -4115
a = 461, b = 1
```

**Invariants from Daikon**
```plaintext
a >= b
```

**Invariants from DIG**
```plaintext
b <= 1
-a + b <= 0
```

While the invariants generated are still not perfect, they are more robust than the previous ones. This exercise demonstrates that generating a large dataset of inputs can help in generating more robust invariants. However, spurious invariants are still extant in the generated invariants, due to the issues of constant reuse in Evosuite, and the genetic algorithm being able to satisfy coverage with a small positive delta (because of which we get the `b <= 1` invariant).


## Thesis statement

The approach described initially appears to address the problem; however, it still suffers from regenerated outputs and spurious invariants. These issues are exacerbated in more complex examples, where exploring the input space becomes increasingly challenging. This complexity can lead the genetic algorithm to repeatedly explore the same regions of the input space, inadvertently reinforcing spurious invariants and reducing the overall robustness of the generated invariants.This leads us to the following thesis statement:

> Evosuite can be directed to generate a large and diverse set of test inputs that improves dynamic invariant inference

We propose exploring the following research questions to check our thesis:

1. Can Evosuite be directed externally to generate a diverse set of test inputs?
2. Can these changes be incorporated into the Evosuite codebase?
