+++
title= "Lexing and Parsing"
date= 2024-11-17
template= "post.html"
math= "katex" 
tags = ["programming languages", "compilers"]
# hideToc = true
+++

Lexing and parsing are foundational steps in implementing a programming language or domain-specific language (DSL). These don’t need to be limited to compiled or interpreted general-purpose languages; they’re equally relevant for DSLs like SQL, JSON, or even custom languages for specific use cases.

I’ve noticed a recurring pattern in my projects: many of them require some form of lexer or parser. Whether it's creating a query language for a database, designing a formula parser for expressions, or building a user-extensible modular system for my data pipeline, I often hit a roadblock at the lexing and parsing phase.

Enough is enough. I’ve decided to tackle this head-on and finally implement a solid lexer and parser. My goal is to write a comprehensive blog post documenting the process—something I can reference for future projects and that might help others facing similar challenges.

## Basic outlines

The basic phases of any language implementation involves the following phases:

{{< mermaid >}}
graph LR 
    A["Input String"] --> B["Lexer"]
    B --> C["Tokens"]
    C --> D["Parser"]
    D --> E["Abstract Syntax Tree (AST)"]
    E --> F["Evaluator"]
    F --> G["Result"]
{{</ mermaid >}}

Each phase is a successive "lowering", i.e. we go from the form that can be the most ambigious, human-friendly, to the form that is easily-processable by computers. One would start with these phases by first thinking about how they would like to represent a query. I like to do this from reverse, i.e. represent the inputs to the evaluator, and going from there.

## Representing inputs

We can start to think about our programming language implementation either from the Lexing or the Evaluation phase from the diagram above. In my case, I will do it from the reverse, i.e. evaluation phase.

### Representing expressions

Imagining that we are writing a simple DSL that can process queries like $ x + y \ge 10$, we can think about the expressions as having the following components:

- at least one operand
- one operator

This would be represented in Rust using an enum, something like this:

```rust
enum Expression {
    I32(i32),
    Variable(String),
    BinaryExpression {
        op: Operator,
        lhs: Box<Expression>,
        rhs: Box<Expression>
    }
}
```

I say at least one operator, because instead of having `lhs`, `rhs`, we could have a `Vec<Expression>` instead like when we are evaluating lisp expressions.

And the accompanying `Operator` could be

```rust
enum Operator {
    Lt,
    Gt,
    Le,
    Ge,
    Eq,
    Ne
}
```

Both of these can have extensions like `functionCall` for `Expression`, and boolean operators in the `Operator` enum according to need.