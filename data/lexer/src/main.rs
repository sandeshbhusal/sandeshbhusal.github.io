use core::panic;
use std::{iter::Peekable, str::Chars};

#[derive(Debug, thiserror::Error)]
pub enum LexerError {
    #[error("Input stream ended suddenly")]
    EndOfInput,

    #[error("Partially matched input: Matched .0, unmatched .1")]
    PartiallyMatchedInput(Vec<Token>, String),

    #[error("Unexpected character: {0}")]
    UnexpectedCharacter(char),
}

#[derive(Debug, PartialEq)]
pub enum TokenType {
    Dot,    // .
    Gt,     // >
    Lt,     // <
    Eq,     // =
    Ne,     // !=
    Not,    // !
    Assign, // =
    Ge,     // >=
    Le,     // <=
    Identifier,
    KwIf,
    NumberLiteral,
    StringLiteral,
    Plus,      // +
    Minus,     // -
    Divide,    // /
    Times,     // *
    Lparen,    // (
    Rparen,    // )
    Lbrace,    // {
    Rbrace,    // }
    Lbracket,  // [
    Rbracket,  // ]
    Comma,     // ,
    Semicolon, // ;
    Colon,     // :
    KwTrue,    // true
    KwFalse,   // false
    KwNull,    // null
    KwI32,     // i32
    KwI64,     // i64
    KwF32,     // f32
    KwF64,     // f64
    KwBool,    // bool
    Ampersand, // &
    Modulus,   // %
    Arrow,     // ->
}

pub struct Lexer<'a> {
    input: &'a [char],
    position: usize,
}

#[derive(Debug)]
pub struct Token {
    token_type: TokenType,
    start: usize,
    end: usize,
    content: String,
}

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

    /// Eats whitespace from the input stream, advancing the
    /// cursor.
    fn eat_whitespace(&mut self) -> LexerResult<()> {
        while let Some(ch) = self.peek() {
            if !ch.is_whitespace() {
                break;
            }

            let _ = self.advance()?; // Discard the whitespace.
        }
        Ok(())
    }

    fn match_operator(&mut self) -> LexerResult<Token> {
        let start = self.position;
        let first_ch = self.advance()?; // Advance to read the first character

        // Determine the token type based on the first character and optional second character
        let token_type = match first_ch {
            '>' | '<' | '=' | '!' => {
                if let Some('=') = self.peek() {
                    self.advance()?; // Consume '='
                    match first_ch {
                        '>' => TokenType::Ge,
                        '<' => TokenType::Le,
                        '=' => TokenType::Eq,
                        '!' => TokenType::Ne,
                        _ => unreachable!("Unexpected character in operator: {}", first_ch),
                    }
                } else {
                    match first_ch {
                        '>' => TokenType::Gt,
                        '<' => TokenType::Lt,
                        '=' => TokenType::Assign,
                        '!' => TokenType::Not,
                        _ => unreachable!("Unexpected character as operator: {}", first_ch),
                    }
                }
            }
            '+' => TokenType::Plus,
            '-' => {
                if let Some('>') = self.peek() {
                    self.advance()?; // Consume '>'
                    TokenType::Arrow
                } else {
                    TokenType::Minus
                }
            }
            '/' => TokenType::Divide,
            '*' => TokenType::Times,
            '%' => TokenType::Modulus,
            _ => {
                unreachable!("Unexpected character as operator: {}", first_ch);
            }
        };

        Ok(Token {
            start,
            end: self.position,
            token_type,
            content: self.input[start..self.position].iter().collect(),
        })
    }

    fn match_identifier_or_keyword(&mut self) -> LexerResult<Token> {
        let start = self.position;

        // Match at least one a-zA-Z_. We can simply advance because we know
        // the current position has a-zA-Z_, because we already matched it before.
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
            "true" => Some(TokenType::KwTrue),
            "false" => Some(TokenType::KwFalse),
            "null" => Some(TokenType::KwNull),
            "i32" => Some(TokenType::KwI32),
            "i64" => Some(TokenType::KwI64),
            "f32" => Some(TokenType::KwF32),
            "f64" => Some(TokenType::KwF64),
            
            _ => None,
        };

        return Ok(Token {
            start,
            end: start + buffer.len(),
            token_type: kwmatch.unwrap_or(TokenType::Identifier),
            content: buffer,
        });
    }

    fn match_number_literal(&mut self) -> LexerResult<Token> {
        let start = self.position;

        let startnumchar = self.advance()?;
        let mut buffer = String::from(startnumchar);

        while let Some(ch) = self.peek() {
            if ch.is_numeric() {
                buffer.push(self.advance()?);
            } else {
                break;
            }
        }

        return Ok(Token {
            start,
            end: start + buffer.len(),
            token_type: TokenType::NumberLiteral,
            content: buffer,
        });
    }

    fn match_string_literal(&mut self) -> LexerResult<Token> {
        let start = self.position;
        let start_quote = self.advance()?;

        let mut buffer = String::from(start_quote);

        while let Some(ch) = self.peek() {
            // Check if ch defines the start of a string escape sequence.
            if ch == '\\' {
                buffer.push(self.advance()?);
                buffer.push(self.advance()?);
            } else if ch == '"' {
                buffer.push(self.advance()?);
                break;
            } else {
                buffer.push(self.advance()?);
            }
        }

        return Ok(Token {
            start,
            end: start + buffer.len(),
            token_type: TokenType::StringLiteral,
            content: buffer,
        });
    }

    pub fn lex(&mut self) -> LexerResult<Vec<Token>> {
        let mut tokens: Vec<Token> = Vec::new();

        // Start, eat whitespace.
        self.eat_whitespace()?;

        // Match the first character.
        while let Some(current_char) = self.peek() {
            match current_char {
                '>' | '<' | '-' | '+' | '=' | '!' | '/' | '*' | '%' => {
                    tokens.push(self.match_operator()?)
                }
                'a'..'z' | 'A'..'Z' | '_' => tokens.push(self.match_identifier_or_keyword()?),
                '0'..'9' => tokens.push(self.match_number_literal()?),
                '"' => tokens.push(self.match_string_literal()?),
                symb => {
                    let tok_type = match symb {
                        '.' => TokenType::Dot,
                        '(' => TokenType::Lparen,
                        ')' => TokenType::Rparen,
                        '{' => TokenType::Lbrace,
                        '}' => TokenType::Rbrace,
                        '[' => TokenType::Lbracket,
                        ']' => TokenType::Rbracket,
                        ',' => TokenType::Comma,
                        ';' => TokenType::Semicolon,
                        ':' => TokenType::Colon,
                        '&' => TokenType::Ampersand,
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
}

#[cfg(test)]
mod lexer_tests {
    use crate::Lexer;

    #[test]
    fn test_number_literal() {
        let input = "1234".chars().collect::<Vec<char>>();
        let mut lexer = super::Lexer::new(&input);
        let tokens = lexer.lex().unwrap();

        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].token_type, super::TokenType::NumberLiteral);
        assert_eq!(tokens[0].content, "1234");
    }

    #[test]
    fn test_string_literal() {
        let input = "\"hello world\"".chars().collect::<Vec<char>>();
        let mut lexer = super::Lexer::new(&input);
        let tokens = lexer.lex().unwrap();

        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].token_type, super::TokenType::StringLiteral);
        assert_eq!(tokens[0].content, "\"hello world\"");
    }

    #[test]
    fn test_operators() {
        let input = ">= <= = != - + / * . < > ==".chars().collect::<Vec<char>>();
        let mut lexer = super::Lexer::new(&input);
        let tokens = lexer.lex().unwrap();

        assert_eq!(tokens.len(), 12);
        assert_eq!(tokens[0].token_type, super::TokenType::Ge);
        assert_eq!(tokens[1].token_type, super::TokenType::Le);
        assert_eq!(tokens[2].token_type, super::TokenType::Assign);
        assert_eq!(tokens[3].token_type, super::TokenType::Ne);
        assert_eq!(tokens[4].token_type, super::TokenType::Minus);
        assert_eq!(tokens[5].token_type, super::TokenType::Plus);
        assert_eq!(tokens[6].token_type, super::TokenType::Divide);
        assert_eq!(tokens[7].token_type, super::TokenType::Times);
        assert_eq!(tokens[8].token_type, super::TokenType::Dot);
        assert_eq!(tokens[9].token_type, super::TokenType::Lt);
        assert_eq!(tokens[10].token_type, super::TokenType::Gt);
        assert_eq!(tokens[11].token_type, super::TokenType::Eq);
    }

    #[test]
    fn test_longest_match() {
        let input = "iffer".chars().collect::<Vec<char>>();
        let mut lexer = super::Lexer::new(&input);
        let tokens = lexer.lex().unwrap();

        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].token_type, super::TokenType::Identifier);
        assert_eq!(tokens[0].content, "iffer");
    }

    #[test]
    fn check_failing() {
        let input = "1234#".chars().collect::<Vec<char>>();
        let mut lexer = super::Lexer::new(&input);
        let tokens = lexer.lex();

        assert!(tokens.is_err());
    }

    #[test]
    fn parse_complete_program() {
        let program = r#"let gcd: fn(x: i32, y: i32) -> i32 = {
            if y == 0 {
                return x;
            } else {
                let temp: int = y;
                y = y % x;
                x = temp;

                let add_simd: fn(x: vec<i32>, y: vec<i32>) -> nil =  {
                    let result: vec<i32> = simdadd(x, y);
                }

                while (x > 0) {
                    x = x - 1;
                    x = x + 1;
                    x = x % 1;
                    x = x * 1;
                    x = x / 1;
                }

                return gcd(x, y);
            }
        }
        "#
        .chars()
        .collect::<Vec<char>>();

        let mut lexer = Lexer::new(&program);
        let _ = lexer.lex().unwrap();
    }

    #[test]
    fn test_escape_sequences() {
        let input = r#""hello\nworld""#.chars().collect::<Vec<char>>();
        let mut lexer = super::Lexer::new(&input);
        let tokens = lexer.lex().unwrap();

        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].token_type, super::TokenType::StringLiteral);
        assert_eq!(tokens[0].content, r#""hello\nworld""#);
    }
}

fn main() {}
