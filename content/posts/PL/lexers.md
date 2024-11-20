---
title: "Writing (rewriting) a lexer"
template: "post.html"
date: 2024-11-20
tags:
- algorithms
- programming languages
series: "Language Dev"
description: "A journey of writing a lexer for a simple language in Rust."
---



I've been working on a very small expression evaluation engine for my project [Hulaak](https://github.com/sandeshbhusal/Hulaak) for quite a bit now. Aptly, the expression evaluation language is called Hulang, and it's a very simple language that works on JSON documents to modify them, kind of like what [jq](https://jqlang.github.io/jq/) does. The language implementation is still in its infancy, but I've been working on it on and off for a few days now, and this is my kinda-sorta journey of writing a lexer for the language.

{{< notice info >}}
## Before you proceed

This post is quite code-heavy as I expect the posts in this series to be. All implementation is done in Rust, but should be portable to other languages with minimal changes. I will be using Rust's `regex` crate for the first implementation, and then move on to a more conventional implementation. The code snippets are not complete, and are meant to be illustrative of the concepts I am discussing. The complete code can be found in the [gist](https://gist.github.com/sandeshbhusal/5de659c5081b42eaf668e1e5bf090feb) at the end of the post.
{{< /notice >}}

## The theory

From my PL course, I remember that the purpose of a lexer is to: 

> Take the input string and convert it into a stream of tokens.

This does not really matter a whole lot when you're working with a small stream of input; for a language like Hulang, it's pretty trivial to implement this with Regexes. But considering the overengineer that I am, I wanted to implement a lexer that I could reuse for projects that I *might* work on in the future 😉.

A lexer is a giant combined NFA, from my PL course. The NFA matches over the given input string, landing in "accept" states as it goes on, and the tokens are generated from the accept states. Once there is a single accept state, the lexer knows that it has found a token, and it can generate the token from the accept state. If there are multiple accept states, it is ambigious, since we do not know what kind of token we should emit. In that case, we can do the following:

- Choose the longest match, and emit the token from that state.
- If there are multiple longest matches, have precedence rules in-place so that we can select a single one..


{{< mermaid >}}
stateDiagram-v2
    [*] --> S0
    S0: Start State
    
    %% Path for identifiers starting with 'i'
    S0 --> S1: i
    S1: After 'i'
    S1 --> S2: f
    S1 --> ID: a-z
    S1 --> [*]: end input
    
    %% Path for all other identifiers
    S0 --> ID: a-z
    
    %% State for 'if' keyword
    S2: Keyword 'if'
    S2 --> ID: a-z
    S2 --> [*]: end input
    
    %% Identifier state
    ID: Identifier
    ID --> ID: a-z
    ID --> [*]: end input
{{< /mermaid >}}

Considering the NFA above, if the input is "ap", then we land in the "Identifier" state, and we can emit an identifier. If we have a "if", however, we land in _both_ the "Identifier" and the "Keyword 'if'" states. In this case, we can choose the longest match, which is "'if'", and then order by precedence rule to get keyword "if" and not identifier "if". If there is an input of "ifa", we get "if" as the longest match at length 2, but if we continue to match, we eventually only have "ifa" as an identifier, and do not emit "keyword if" followed by "identifier a".

## Brute implementation in Rust.

I know and love Rust, so I will be making a very simple implementation in Rust itself. The format can be extended to support multiple tokens, and symbols, but for now we'll just work with three things - a "." token, "if" keyword and "identifier".

```rust
enum TokenType {
    Identifier,
    Dot,
    If,
}
```

Each of these token types will have an accompanying `Regex` pattern. We will make this pattern static.

```rust
static PATTERN_MAP: LazyLock<IndexMap<&'static str, TokenType>> = LazyLock::new(|| {
    let mut map = IndexMap::new();
    for variant in TokenType::iter() {
        let pattern = match variant {
            TokenType::Dot => r"\.",
            TokenType::If => r"if",
            TokenType::Identifier => r"[a-zA-Z]+",
        };

        map.insert(pattern, variant);
    }

    map
});
```

The tokens will be placed in a `Token` struct that marks the start, end, and content of the tokens (I know Rust has tagged unions that can hold data, but I like this way better).

```rust
struct Token {
    start: usize,
    end: usize,
    token_type: TokenType,
    content: String,
}
```

The Token type does heap allocation for the content, but I will omit using lifetimes for readability. The lexer will be a struct that holds the input string and the current position in the input string.

## The regex lexer

```rust
fn lexer(input: &str) -> Result<Vec<Token>, (Vec<Token>, String)> {
}
```

With this, we have the outline of a lexer that can match tokens and return them. The function takes in a string and returns a result that returns either:

- A successful result with a vector of tokens.
- An error with a vector of tokens that were successfully matched, and the remaining input string that was not matched.

Now from the [Theory](#the-theory), we know that we need a giant DFA that will encompass all rules, and help us with the matching process. We can implement this giant DFA as a [RegexSet](https://docs.rs/regex/latest/regex/struct.RegexSet.html) type that gives us the ability to match multiple regexes at once. We can then iterate over the matches and choose the longest match.

```rust
fn lexer(input: &str) -> Result<Vec<Token>, (Vec<Token>, String)> {
    let mut offset = 0;
    let mut token = Vec::new();

    let regex_dfa = RegexSet::new(PATTERN_MAP.keys()).unwrap();
}
```

Now the matching can begin. The algorithm goes like this:

1. While the input string has a whitespace, skip the whitespace, and find an actual character we can start matching from.
2. While the offset is less than the input string length, we can match tokens.
3. Match the regex set with the input string, and get the longest match at the offset.
4. If there is no match, return an error with the tokens matched so far, and the remaining input string.

The code looks like this:

```rust
pub fn lexer(input: &str) -> Result<Vec<Token>, (Vec<Token>, String)> {
    let mut offset = 0;
    let mut tokens = Vec::new();

    let regex_dfa = RegexSet::new(PATTERN_MAP.keys()).unwrap();

    while offset < input.len() {
        if let Some((off, _)) = input
            .chars()
            .enumerate()
            .find(|(off, ip)| *off >= offset && !ip.is_whitespace())
        {
            offset = off;
        } else {
            return Ok(tokens); // Nothing except whitespaces found. Return lexed this far.
        }

        // Get all matches for the current offset.
        let matched_patterns_index = regex_dfa.matches(&input[offset..]);
        if matched_patterns_index.len() == 0 {
            return Err((tokens, (&input[offset..]).to_string()));
        }

        let matched_strings_and_types = matched_patterns_index.into_iter().map(|pattern_index| {
            let pattern_str = PATTERN_MAP.keys().nth(pattern_index).unwrap();
            let token_type = PATTERN_MAP.get(pattern_str).unwrap();
            let matched_string = Regex::new(pattern_str)
                .expect("Invalid regex pattern -- This should never happen")
                .find(&input[offset..])
                .unwrap()
                .as_str();
            (token_type, matched_string)
        });

        let longest_match = matched_strings_and_types
            .max_by_key(|(_tokentype, matched)| matched.len())
            .expect("Something should've matched");

        let (token_type, matched_string) = longest_match;
        let start = offset;
        let end = offset + matched_string.len();
        let r#type = *token_type;

        tokens.push(Token {
            r#type,
            start,
            end,
            content: matched_string.to_string(),
        });

        offset = end;
    }

    Ok(tokens)
}
```

The regexset returns a iterable of indexes of the matched patterns, and we can then get the matched string from the input string. We then find the longest match, and create a token from that match. The offset is then moved to the end of the matched string, and the process continues until the end of the input string.

### Issues with this implementation

The implementation is quite elegant at the first glance - to add more tokens, we just add them to the `TokenType` map, and the `PATTERN_MAP`. The lexer token types are ordered by default in the TokenType map (the latter tokens in the enum have more precedence than the upper tokens), so we don't need to worry about breaking ties. The issues with this implementation are:

- Usage of RegexSet and Regex is not very performant.
- In most cases, the conflicts arise with matching "identifier" and "token" types from my experience. It is not worth it to use Regex for this case.
- We may not want to "eat" whitespace all the time - we have cases like matching string literals where we would like to keep the whitespace (albeit this can be solved by adding a new regex type for string literal).

I glossed over the lexer implementation of lexers that [other people have done](https://brunocalza.me/writing-a-simple-lexer-in-rust/) and this implementation looks unnecessarily brute-forcy.

## Writing a better lexer.

I want the implementation of the lexer to be more performant, and more conventional - in tune with what people in the industry actually do instead of creating a large messy RegexSet to hide from the actual implementation. If you think about it, it's really simple - the conflicts generally arise when matching inputs like "if" and "identifier", or ">=" and ">" and "=".

The lexer in this case will become a simple state matchine we can code by-hand. We start by reusing the token_type enum and token struct from before, and defining a lexer struct. The struct looks like this:

```rust
pub struct Lexer<'a> {
    input: &'a [char],
    position: usize,
}
```

Since rust has excellent default support for Unicode characters, we can use `char` type. Next, we begin by defining some basic operations on the lexer struct.

```rust
type LexerResult<T> = Result<T, LexerError>;

impl<'a> Lexer<'a> {
    pub fn new(input: &'a [char]) -> Lexer<'a> {
        Lexer { input, position: 0 }
    }

    fn peek(&mut self) -> Option<char> {
        let res = if self.position >= self.input.len() {
            None
        } else {
            Some(self.input[self.position])
        };

        res
    }

    fn advance(&mut self) -> LexerResult<char> {
        if self.position >= self.input.len() {
            return Err(LexerError::EndOfInput);
        }

        let res = Ok(self.input[self.position]);
        self.position += 1;
        res
    }

    fn eat_whitespace(&mut self) -> LexerResult<()> {
        while let Some(ch) = self.peek() {
            if !ch.is_whitespace() {
                break;
            }

            let _ = self.advance()?; // Discard the whitespace.
        }
        Ok(())
    }
}
```

All the functions are pretty self-explanatory. We begin by creating a lexer that tracks the position in the input string. We can peek at the current character, advance the position, and eat whitespace. 

Now we need a function that actuallly does the lexing.

```rust
pub fn lex(&mut self) -> LexerResult<Vec<Token>> {
    let mut tokens: Vec<Token> = Vec::new();

    // Start, eat whitespace.
    self.eat_whitespace()?;

    // Match the first character.
    while let Some(current_char) = self.peek() {
        match current_char {
            'a'..'z' | 'A'..'Z' | '_' => tokens.push(self.match_identifier_or_keyword()?),
            symb => {
                let tok_type = match symb {
                    '.' => TokenType::Dot,
                    _ => {
                        return Err(LexerError::PartiallyMatchedInput(
                            tokens,
                            self.input[self.position..].iter().collect(),
                        ))
                    }
                };

                tokens.push(Token {
                    start: self.position,
                    end: self.position + 1,
                    token_type: tok_type,
                    content: String::from(self.advance()?),
                });
            }
        }
        self.eat_whitespace()?;
    }

    // End, eat all whitespace
    self.eat_whitespace()?;

    return Ok(tokens);
}
```

The lex function starts off by creating the return array of tokens. Then we discard all whitespace until we hit a char we can parse. Based on the char at the start of the input stream, we can match either an identifier/keyword, or a symbol (our symbol is limited to just '.' for now). The match_identifier_or_keyword function is a helper function that matches the identifier or keyword.

```rust

    fn match_identifier_or_keyword(&mut self) -> LexerResult<Token> {
        let start = self.position;
        let startsym = self.advance()?;
        let mut buffer = String::from(startsym);
        
        while let Some(ch) = self.peek() {
            if (ch.is_ascii_alphanumeric() || ch == '_') && !ch.is_whitespace() {
                buffer.push(self.advance()?);
            } else {
                break;
            }
        }

        let kwmatch = match buffer.as_ref() {
            "if" => Some(TokenType::KwIf),
            _ => None,
        };

        return Ok(Token {
            start,
            end: start + buffer.len(),
            token_type: kwmatch.unwrap_or(TokenType::Identifier),
            content: buffer,
        });
    }
```

The function begins by reading off the start char into a string itself. Then until we have ascii alphanumeric char or "_" in the input stream, we will continue to push it into the buffer. When we hit a non-alphanumeric char, we break out of the loop and check if the buffer is a keyword. If it is, we return the keyword token, else we return the identifier token.

The lexer is now complete. The complete lexer code looks like [this](https://gist.github.com/sandeshbhusal/5de659c5081b42eaf668e1e5bf090feb).

## Concluding remarks

I had a lot of fun writing (and rewriting) this lexer. While the task of writing something by hand might sound daunting at first, and we might immediately want to run off to write code with libraries like `Regex`, it can be beneficial to write code by hand sometimes to solidify understanding and challenge oneself. The lexer implementation above is very simple - we can improve further on it, e.g. by adding support for string literals, comments, and other symbols. The lexer can be extended to support more complex languages, and can be used as a base for writing a parser for the language. There is also the opportunity for performance optimization - we could remove all memory allocations and use slices instead of strings, and we could also use a more efficient data structure to store the tokens. However, those are topics for another day.

I hope you enjoyed reading this post. If you have any feedback, feel free to reach out to me on [LinkedIn](https://linkedin.com/in/sandeshbhusal). I'm always open to feedback and suggestions. Until next time, happy coding! 🚀