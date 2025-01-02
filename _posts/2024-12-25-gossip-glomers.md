---
layout: post
title: "Gossip Glomers - Efficient Broadcast"
date: 2024-12-25
tags:
- distributed systems
- rust
- algorithms
series: Gossip Glomers
description: "My solutions to the Gossip Glomers challenge by fly.io"
---

[Gossip Glomers](https://fly.io/dist-sys/) is a distributed systems challenge created by [fly.io](https://fly.io), where participants are expected to work around a simulating library called `maelstrom` that simulates failures and latencies in a distributed system. The library provided works with `go`, but being the rustacean that I am, I decided to rewrite the library in Rust, and implement solutions to the challenges. The [specifications]() are publicly available (and well-documented) so it was a breeze to go through. In this post, I will only explain the solutions to the challenge upto the _efficient broadcast_ challenge.

{{< notice info >}}
## About this post.

This post is quite code-heavy as I expect the posts in this series to be. The challenge encompasses a lot of concepts in distributed systems, and frankly, squeezing all solutions into a single post will not make any sense. Instead, they will be spread out over posts in this series.

{{< /notice >}}


## Setting up the project

The 'maelstrom' binary can be downloaded and it unsurprisingly works right out of the box. For starters, I created the following project structure:

```bash
.
├── Cargo.lock
├── Cargo.toml
├── maelstrom
    ├── maelstrom
    └── ..
└── src
    ├── main.rs
    └── message.rs
```

The `main.rs` file is responsible to run the entire application, and `message.rs` describes the types of messages we support.


The `message.rs` file has the following contents:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct Message {
    pub(crate) src: String,
    pub(crate) dest: String,
    pub(crate) body: MessageBody,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MessageBody {
    Echo {
        msg_id: i32,
        echo: String,
    },
    EchoOk {
        msg_id: i32,
        in_reply_to: i32,
        echo: String,
    },
    Init {
        msg_id: i32,
        node_id: String,
        node_ids: Vec<String>,
    },
    InitOk {
        in_reply_to: i32,
    },
}
```

One thing that I missed in the beginning was to return an `InitOk` message (which was outlined in the spec). Since the go library does that automatically, and we are not using go, we need to implement everything from scratch. Using serde makes this whole thing a breeze. The common fields go into `Message` struct, and fields specific to each type of message go to `MessageBody`. The body is named `type` in the incoming json message, and it seamlessly works with the following message for deserialization:

```json
{
    "src": "n0",
    "dest": "n1",
    "body": {
        "type": "echo_ok",
        "msg_id": 123,
        "echo": "Echo echo"
    }
}
```

The next thing would be to implement methods to read/write from/to stdin/stdout.

```rust
fn main() -> Result<()> {
    let mut buffer = String::new();
    let mut node: Node = Default::default();

    loop {
        buffer.clear();
        let len = stdin().read_line(&mut buffer)?;
        if len == 0 {
            break;
        }

        let message: Message = match serde_json::from_str(&buffer) {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("Error parsing message: {}", e);
                continue;
            }
        };

        if let Err(e) = node.handle_message(message) {
            eprintln!("Error handling message: {}", e);
        }
    }

    Ok(())
}
```

The node does not need to be concurrent - we process messages serially. The code keeps reading from stdin, creating a message (after deserializing), and passing the deserialized messages to the node. Next, the implementation for `Node` type.

```rust
#[derive(Debug, Default, Clone)]
struct Node {
    id: String,
    node_ids: Vec<String>,
    current_msg_id: i32,
}

impl Node {
    fn new(id: String, node_ids: Vec<String>) -> Self {
        Node {
            id,
            node_ids,
            current_msg_id: 0,
        }
    }

    fn get_next_message_id(&mut self) -> i32 {
    }

    fn handle_echo(&mut self, echo_in: Message) -> Result<()> {
    }

    fn handle_message(&mut self, message: Message) -> Result<()> {
    }
}
```

The `Node` struct itself is very simple - it stores the node's `id`, the `node_ids` of all nodes in the distributed system, and stores the current message id to use (no need to use atomic ints since we are just processing stuff in a single-thread). Next would be the implementation of each of these handlers. The `get_next_message_id` itself is very simple:

```rust
fn get_next_message_id(&mut self) -> i32 {
    let current_id = self.current_msg_id;
    self.current_msg_id += 1;
    current_id
}
```

## A very basic echo

In order to handle messages in the Node, we dispatch it to the `handle_message` function from our `main` function:

```rust
fn handle_message(&mut self, message: Message) -> Result<()> {
    match message.body.clone() {
        MessageBody::Echo { .. } => self.handle_echo(message),
        MessageBody::Init { node_id, msg_id, node_ids } => {
            // Initialize the node
            self.id = node_id;
            self.node_ids = node_ids;

            // Send init_ok response
            let reply_message = Message {
                src: self.id.clone(),
                dest: message.clone().src,
                body: MessageBody::InitOk {
                    in_reply_to: msg_id,
                },
            };
            println!("{}", serde_json::to_string(&reply_message)?);
            eprintln!("{}", serde_json::to_string(&reply_message)?);

            Ok(())
        }
        _ => {
            eprintln!("Unhandled message type");
            Ok(())
        }
    }
}
```

The handle_message message is what brings it all together. We check the message type. If it's the init message, we send a `ok` response for init and initialize our node. Otherwise, we dispatch the message to a relevant message handler. As we can see in the case of the `echo` message:

```rust
fn handle_echo(&mut self, echo_in: Message) -> Result<()> {
    if let MessageBody::Echo { msg_id, echo } = echo_in.body {
        let reply_message = Message {
            src: self.id.clone(),
            dest: echo_in.src,
            body: MessageBody::EchoOk {
                msg_id: self.get_next_message_id(),
                in_reply_to: msg_id,
                echo,
            },
        };
        println!("{}", serde_json::to_string(&reply_message)?);
        eprintln!("{}", serde_json::to_string(&reply_message)?);
    }
    Ok(())
}
```

Even though the message type can never be anything other that `MessageBody::Echo`, we still use it to cast the message (I guess this would've been better in C++, since we have two vtable lookups, one in handle_message and another in `handle_echo`).

Testing this with maelstrom library, we can see everything works:
```bash
$ ./maelstrom/maelstrom test -w echo --bin target/release/gossiprs \
    --node-count 1 --time-limit 10

...
... bunch of output
...

Everything looks good! ヽ(‘ー`)ノ
```

## Improving message handling:

Since the first message is always the `init` message, we can check to see if that is actually the case, and only process messages after the first one (since we might miss a `init` message, and reach an invalid node state).

```diff
diff --git a/src/main.rs b/src/main.rs
index 8cb2685..434d943 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -6,6 +6,7 @@ use std::io::stdin;
 mod message;
 
 #[derive(Debug, Default, Clone)]
+#[allow(unused)]
 struct Node {
     id: String,
     node_ids: Vec<String>,
@@ -44,27 +45,26 @@ impl Node {
         Ok(())
     }
 
+    fn handle_init(&mut self, msg_id: i32, src: String) -> Result<()> {
+        // Send init_ok response
+        let reply_message = Message {
+            src: self.id.clone(),
+            dest: src,
+            body: MessageBody::InitOk {
+                in_reply_to: msg_id,
+            },
+        };
+        println!("{}", serde_json::to_string(&reply_message)?);
+        eprintln!("{}", serde_json::to_string(&reply_message)?);
+
+        Ok(())
+    }
+
     fn handle_message(&mut self, message: Message) -> Result<()> {
         match message.body.clone() {
             MessageBody::Echo { .. } => self.handle_echo(message),
-            MessageBody::Init { node_id, msg_id, node_ids } => {
-                // Initialize the node
-                self.id = node_id;
-                self.node_ids = node_ids;
-
-                // Send init_ok response
-                let reply_message = Message {
-                    src: self.id.clone(),
-                    dest: message.clone().src,
-                    body: MessageBody::InitOk {
-                        in_reply_to: msg_id,
-                    },
-                };
-                println!("{}", serde_json::to_string(&reply_message)?);
-                eprintln!("{}", serde_json::to_string(&reply_message)?);
+            MessageBody::Init { msg_id, .. } => self.handle_init(msg_id, message.src.clone()),
 
-                Ok(())
-            }
             _ => {
                 eprintln!("Unhandled message type");
                 Ok(())
@@ -76,26 +76,38 @@ impl Node {
 #[tokio::main]
 async fn main() -> Result<()> {
     let mut buffer = String::new();
-    let mut node: Node = Default::default();
 
-    loop {
-        buffer.clear();
-        let len = stdin().read_line(&mut buffer)?;
-        if len == 0 {
-            break;
-        }
+    stdin().read_line(&mut buffer)?;
+    let message: Message = serde_json::from_str(&buffer)?;
+
+    if let MessageBody::Init {
+        node_id, node_ids, ..
+    } = message.body
+    {
+        let mut node: Node = Node::new(node_id, node_ids);
+        node.handle_message(serde_json::from_str(&buffer)?)?;
 
-        let message: Message = match serde_json::from_str(&buffer) {
-            Ok(msg) => msg,
-            Err(e) => {
-                eprintln!("Error parsing message: {}", e);
-                continue;
+        loop {
+            buffer.clear();
+            let len = stdin().read_line(&mut buffer)?;
+            if len == 0 {
+                break;
             }
-        };
 
-        if let Err(e) = node.handle_message(message) {
-            eprintln!("Error handling message: {}", e);
+            let message: Message = match serde_json::from_str(&buffer) {
+                Ok(msg) => msg,
+                Err(e) => {
+                    eprintln!("Error parsing message: {}", e);
+                    continue;
+                }
+            };
+
+            if let Err(e) = node.handle_message(message) {
+                eprintln!("Error handling message: {}", e);
+            }
         }
+    } else {
+        panic!("Expected first messaage to be a init message");
     }
 
     Ok(())
```

## Handling unique IDs

The next part of the challenge is to handle unique ID generation. For that, we will introduce the required message types to our `Message` struct, and store an internal counter in the Node. Also, we improve "responding" by sending out messages on `stdout` _and_ logging our progress on `stderr`. The majority of the work is done in the `handle_generate` function as listed below:

```diff
diff --git a/src/main.rs b/src/main.rs
index 434d943..772c545 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,14 +1,18 @@
 use anyhow::Result;
 use message::{Message, MessageBody};
 use serde_json;
-use std::io::stdin;
+use std::{
+    io::{stdin, Write},
+    sync::atomic::AtomicUsize,
+};
 
 mod message;
 
-#[derive(Debug, Default, Clone)]
+#[derive(Debug)]
 #[allow(unused)]
 struct Node {
     id: String,
+    counter: AtomicUsize,
     node_ids: Vec<String>,
     current_msg_id: i32,
 }
@@ -16,6 +20,7 @@ struct Node {
 impl Node {
     fn new(id: String, node_ids: Vec<String>) -> Self {
         Node {
+            counter: AtomicUsize::new(0),
             id,
             node_ids,
             current_msg_id: 0,
@@ -54,16 +59,45 @@ impl Node {
                 in_reply_to: msg_id,
             },
         };
-        println!("{}", serde_json::to_string(&reply_message)?);
-        eprintln!("{}", serde_json::to_string(&reply_message)?);
 
-        Ok(())
+        self.write_and_log_response(reply_message)
+    }
+
+    fn handle_generate(&mut self, message: Message) -> Result<()> {
+        // Generate a unique ID and send back to the receiver.
+        // To generate a unique ID, we will take the instant value in self,
+        // and just return the number of millis passed.
+
+        Ok(if let MessageBody::Generate { msg_id } = message.body {
+            let reply_message = Message {
+                src: self.id.clone(),
+                dest: message.src,
+                body: MessageBody::GenerateOk {
+                    id: format!(
+                        "{}-{}",
+                        self.id,
+                        self.counter
+                            .fetch_add(1, std::sync::atomic::Ordering::SeqCst)
+                    ),
+                    msg_id: self.get_next_message_id(),
+                    in_reply_to: msg_id,
+                },
+            };
+
+            self.write_and_log_response(reply_message)?
+        } else {
+            ()
+        })
     }
 
     fn handle_message(&mut self, message: Message) -> Result<()> {
+        let converted = serde_json::to_string(&message)?;
+        eprintln!("Received request: {}", converted);
+
         match message.body.clone() {
             MessageBody::Echo { .. } => self.handle_echo(message),
             MessageBody::Init { msg_id, .. } => self.handle_init(msg_id, message.src.clone()),
+            MessageBody::Generate { .. } => self.handle_generate(message),
 
             _ => {
                 eprintln!("Unhandled message type");
@@ -71,6 +105,13 @@ impl Node {
             }
         }
     }
+
+    fn write_and_log_response(&self, message: Message) -> Result<()> {
+        let converted = serde_json::to_string(&message)?;
+        println!("{}", converted);
+        eprint!("Responding: {}", converted);
+        Ok(std::io::stdout().flush()?)
+    }
 }
 
 #[tokio::main]
diff --git a/src/message.rs b/src/message.rs
index 6c79550..01adec1 100644
--- a/src/message.rs
+++ b/src/message.rs
@@ -20,6 +20,7 @@ pub enum MessageBody {
         in_reply_to: i32,
         echo: String,
     },
+
     Init {
         msg_id: i32,
         node_id: String,
@@ -28,4 +29,14 @@ pub enum MessageBody {
     InitOk {
         in_reply_to: i32,
     },
+
+    Generate {
+        msg_id: i32
+    },
+
+    GenerateOk {
+        id: String,
+        msg_id: i32,
+        in_reply_to: i32
+    },
 }
```

## The fun begins!

Now the actual fun begins. We will implement methods to handle broadcast, and forward it to our peers. 

```diff
diff --git a/src/main.rs b/src/main.rs
index 772c545..7b19426 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -2,6 +2,7 @@ use anyhow::Result;
 use message::{Message, MessageBody};
 use serde_json;
 use std::{
+    collections::HashSet,
 };
@@ -14,6 +15,7 @@ struct Node {
     id: String,
+    values: HashSet<i32>,
     current_msg_id: i32,
 }
 
@@ -24,6 +26,7 @@ impl Node {
             id,
+            values: HashSet::new(),
         }
     }

+    fn handle_broadcast(&mut self, message: Message) -> Result<()> {
+        if let MessageBody::Broadcast {
+            msg_id,
+            message: value,
+        } = message.body
+        {
+            self.values.insert(value);
+            let reply = Message {
+                src: self.id.clone(),
+                dest: message.src,
+                body: MessageBody::BroadcastOk {
+                    in_reply_to: msg_id,
+                    msg_id: self.get_next_message_id(),
+                },
+            };
+
+            self.write_and_log_response(reply)
+        } else {
+            Ok(())
+        }
+    }
+
+    fn handle_read(&mut self, message: Message) -> Result<()> {
+        if let MessageBody::Read { msg_id } = message.body {
+            let messages: HashSet<i32> = self.values.clone();
+            let reply = Message {
+                src: self.id.clone(),
+                dest: message.src,
+                body: MessageBody::ReadOk {
+                    messages,
+                    in_reply_to: msg_id,
+                },
+            };
+
+            self.write_and_log_response(reply)
+        } else {
+            Ok(())
+        }
+    }
+
+    fn handle_topology(&mut self, message: Message) -> Result<()> {
+        if let MessageBody::Topology { msg_id, .. } = message.body {
+            let reply = Message {
+                src: self.id.clone(),
+                dest: message.src,
+                body: MessageBody::TopologyOk {
+                    in_reply_to: msg_id,
+                },
+            };
+
+            self.write_and_log_response(reply)
+        } else {
+            Ok(())
+        }
+    }
+
     fn handle_message(&mut self, message: Message) -> Result<()> {
         let converted = serde_json::to_string(&message)?;
         eprintln!("Received request: {}", converted);
@@ -98,6 +157,9 @@ impl Node {
             MessageBody::Echo { .. } => self.handle_echo(message),
+            MessageBody::Broadcast { .. } => self.handle_broadcast(message),
+            MessageBody::Read { .. } => self.handle_read(message),
+            MessageBody::Topology { .. } => self.handle_topology(message),
 
             _ => {
                 eprintln!("Unhandled message type");
diff --git a/src/message.rs b/src/message.rs
index 01adec1..7dd52b7 100644
--- a/src/message.rs
+++ b/src/message.rs
@@ -1,3 +1,5 @@
+use std::collections::{HashMap, HashSet};
+
 #[derive(Debug, Serialize, Deserialize, Clone)]
@@ -39,4 +41,32 @@ pub enum MessageBody {
+    Broadcast {
+        msg_id: i32,
+        message: i32
+    },
+
+    BroadcastOk {
+        in_reply_to: i32,
+        msg_id: i32
+    },
+
+    Read {
+        msg_id: i32,
+    },
+
+    ReadOk {
+        messages: HashSet<i32>,
+        in_reply_to: i32
+    },
+
+    Topology {
+        msg_id: i32,
+        topology: HashMap<String, Vec<String>>
+    },
+
+    TopologyOk {
+        in_reply_to: i32
+    }
 }
```

For this, we need to implement handlers for `read`, `topology`, and `broadcast` messages as listed in the outline. The logic itself is super simple; we store all the IDs we've seen in a `HashSet`, and return the hashset when `read` is invoked on our node.

## Talking to other nodes

The next patch will implement a way to talk to other nodes, whatever is connected to ours.

```diff
diff --git a/src/main.rs b/src/main.rs
index 7b19426..0f955b8 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -17,6 +17,8 @@ struct Node {
     node_ids: Vec<String>,
     values: HashSet<i32>,
     current_msg_id: i32,
+    neighbors: Vec<String>,
+    downstream: Vec<String>,
 }
 
 impl Node {
@@ -27,6 +29,8 @@ impl Node {
             node_ids,
             current_msg_id: 0,
             values: HashSet::new(),
+            neighbors: Vec::new(),
+            downstream: Vec::new(),
         }
     }
 
@@ -99,7 +103,7 @@ impl Node {
             message: value,
         } = message.body
         {
-            self.values.insert(value);
+            // First, respond that I got this value.
             let reply = Message {
                 src: self.id.clone(),
                 dest: message.src,
@@ -109,7 +113,65 @@ impl Node {
                 },
             };
 
-            self.write_and_log_response(reply)
+            self.write_and_log_response(reply)?;
+
+            let i_have_this = self.values.contains(&value);
+            if !i_have_this {
+                self.values.insert(value);
+
+                // Tell my friends about this too!. Write Gossip messages.
+                let neighbors = self.neighbors.clone();
+                for neighbor in neighbors {
+                    let new_msg_id = self.get_next_message_id();
+
+                    let gossip = Message {
+                        src: self.id.clone(),
+                        dest: neighbor.clone(),
+                        body: MessageBody::Gossip {
+                            msg_id: new_msg_id,
+                            gossip_value: value,
+                        },
+                    };
+
+                    self.write_and_log_response(gossip)?;
+                }
+            }
+
+            Ok(())
+        } else {
+            Ok(())
+        }
+    }
+
+    fn handle_gossip(&mut self, message: Message) -> Result<()> {
+        if let MessageBody::Gossip {
+            gossip_value: value,
+            ..
+        } = message.body
+        {
+            let i_have_this = self.values.contains(&value);
+            if !i_have_this {
+                self.values.insert(value);
+
+                // Tell my friends about this too!. Write Gossip messages.
+                let neighbors = self.neighbors.clone();
+                for neighbor in neighbors {
+                    let new_msg_id = self.get_next_message_id();
+
+                    let gossip = Message {
+                        src: self.id.clone(),
+                        dest: neighbor.clone(),
+                        body: MessageBody::Gossip {
+                            msg_id: new_msg_id,
+                            gossip_value: value,
+                        },
+                    };
+
+                    self.write_and_log_response(gossip)?;
+                }
+            }
+
+            Ok(())
         } else {
             Ok(())
         }
@@ -134,7 +196,21 @@ impl Node {
     }
 
     fn handle_topology(&mut self, message: Message) -> Result<()> {
-        if let MessageBody::Topology { msg_id, .. } = message.body {
+        if let MessageBody::Topology {
+            msg_id,
+            topology: graph,
+        } = message.body
+        {
+            self.neighbors = graph
+                .get(&self.id)
+                .expect("No neighbors defined for me? Empty??")
+                .clone();
+
+            // Something fancy. Do some graph computation to find downstream nodes? Nah.
+            // Maybe in 3.d.
+
+            self.downstream.extend(self.neighbors.clone());
+
             let reply = Message {
                 src: self.id.clone(),
                 dest: message.src,
@@ -160,6 +236,7 @@ impl Node {
             MessageBody::Broadcast { .. } => self.handle_broadcast(message),
             MessageBody::Read { .. } => self.handle_read(message),
             MessageBody::Topology { .. } => self.handle_topology(message),
+            MessageBody::Gossip { .. } => self.handle_gossip(message),
 
             _ => {
                 eprintln!("Unhandled message type");
diff --git a/src/message.rs b/src/message.rs
index 7dd52b7..1748ee8 100644
--- a/src/message.rs
+++ b/src/message.rs
@@ -68,5 +68,12 @@ pub enum MessageBody {
 
     TopologyOk {
         in_reply_to: i32
-    }
+    },
+
+    // Custom message types:
+
+    Gossip {
+        msg_id: i32,
+        gossip_value: i32
+    },
 }
```

The logic is simple:
- We `Gossip` our message to our peers when we receive a gossip message. Before doing that, we acknowledge the gossip.
- The `GossipAck` message is sent to the sender to make sure they don't re-send the gossip again (this comes in a later part).


If we do not respond before updating our state, we will fall into an infinite loop where we forward the message, receive it, and keep forwarding it. So, we first ack the message, and _then_ forward it to the neighbors.

## Sending message with Retries

The current method implements ways to send message, but we do not retry if it fails. Since we don't have the privilege of using `SyncRPC` that is in the go library, we need to implement our own. The go library uses `Context` with `Cancel`, and something similar that can be implemented in Rust is a `oneshot_channel`. For every message we expect to receive a reply to, we store a `oneshot` channel, which is keyed on the message id. If we receive any message whose `in_reply_to` field has that particular message id, we pop the channel, and cancel our timeout.

```diff
diff --git a/src/main.rs b/src/main.rs
index 0f955b8..b61487b 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -2,10 +2,12 @@ use anyhow::Result;
 use message::{Message, MessageBody};
 use serde_json;
 use std::{
-    collections::HashSet,
+    collections::{HashMap, HashSet},
     io::{stdin, Write},
     sync::atomic::AtomicUsize,
+    time::Duration,
 };
+use tokio::{runtime::Runtime, time};
 
 mod message;
 
@@ -13,24 +15,28 @@ mod message;
 #[allow(unused)]
 struct Node {
     id: String,
+    runtime: Runtime,
     counter: AtomicUsize,
     node_ids: Vec<String>,
     values: HashSet<i32>,
     current_msg_id: i32,
     neighbors: Vec<String>,
     downstream: Vec<String>,
+    ack_channels: HashMap<i32, tokio::sync::oneshot::Sender<i32>>,
 }
 
 impl Node {
     fn new(id: String, node_ids: Vec<String>) -> Self {
         Node {
             counter: AtomicUsize::new(0),
+            runtime: Runtime::new().unwrap(),
             id,
             node_ids,
             current_msg_id: 0,
             values: HashSet::new(),
             neighbors: Vec::new(),
             downstream: Vec::new(),
+            ack_channels: HashMap::new(),
         }
     }
 
@@ -51,8 +57,8 @@ impl Node {
                     echo,
                 },
             };
-            println!("{}", serde_json::to_string(&reply_message)?);
-            eprintln!("{}", serde_json::to_string(&reply_message)?);
+
+            self.write_and_log_response(reply_message)?;
         }
         Ok(())
     }
@@ -238,6 +244,19 @@ impl Node {
             MessageBody::Topology { .. } => self.handle_topology(message),
             MessageBody::Gossip { .. } => self.handle_gossip(message),
 
+            MessageBody::GossipAck {
+                in_reply_to,
+                msg_id,
+            } => {
+                // Check that we have the channel to send the ack.
+                if let Some(sender) = self.ack_channels.remove(&in_reply_to) {
+                    Ok(sender.send(msg_id).unwrap())
+                } else {
+                    eprintln!("No channel found to send ack");
+                    Ok(())
+                }
+            }
+
             _ => {
                 eprintln!("Unhandled message type");
                 Ok(())
@@ -245,11 +264,39 @@ impl Node {
         }
     }
 
-    fn write_and_log_response(&self, message: Message) -> Result<()> {
-        let converted = serde_json::to_string(&message)?;
-        println!("{}", converted);
-        eprint!("Responding: {}", converted);
-        Ok(std::io::stdout().flush()?)
+    fn write_and_log_response(&mut self, message: Message) -> Result<()> {
+        if let MessageBody::Gossip { msg_id, .. } = &message.body {
+            let (sender, mut receiver) = tokio::sync::oneshot::channel::<i32>();
+            self.ack_channels.insert(*msg_id, sender);
+
+            // Try to send the message to the receiver, wait for a certain time, and send the message
+            // again if we do not get the response back. Do all this within a tokio runtime.
+            let fut = async move {
+                let converted = serde_json::to_string(&message).unwrap();
+                println!("{}", converted);
+                let mut ticker = time::interval(Duration::from_millis(100));
+
+                loop {
+                    tokio::select! {
+                        _ = ticker.tick() => {
+                            // Resend the message; we have no acks yet.
+                            println!("{}", converted.clone());
+                        }
+                        _ = &mut receiver => {
+                            // We got an ack! Break the loop.
+                            break
+                        }
+                    }
+                }
+            };
+
+            self.runtime.spawn(fut);
+            Ok(())
+        } else {
+            println!("{}", serde_json::to_string(&message)?);
+            eprint!("Responding: {}", serde_json::to_string(&message)?);
+            Ok(std::io::stdout().flush()?)
+        }
     }
 }
 
diff --git a/src/message.rs b/src/message.rs
index 1748ee8..d331470 100644
--- a/src/message.rs
+++ b/src/message.rs
@@ -76,4 +76,9 @@ pub enum MessageBody {
         msg_id: i32,
         gossip_value: i32
     },
+
+    GossipAck {
+        in_reply_to: i32,
+        msg_id: i32
+    }
 }
```

In order to implement this, we create a `Tokio` runtime, and push futures that are polling the stdin, looking for messages we have replies to, or waiting on a timer, which fires every 100ms. Either the message reply arrives, or the timer expires, when we resend the message. Since we are only looking for replies (confirmation) to the Gossip messages, we match the message type on message send. The future is created only if the message type matches Gossip message. The modification to handling gossip is simple enough:

```diff
diff --git a/src/main.rs b/src/main.rs
index b61487b..ab1b253 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -152,9 +152,21 @@ impl Node {
     fn handle_gossip(&mut self, message: Message) -> Result<()> {
         if let MessageBody::Gossip {
             gossip_value: value,
-            ..
+            msg_id
         } = message.body
         {
+            // First, respond that I got this value.
+            let reply = Message {
+                src: self.id.clone(),
+                dest: message.src,
+                body: MessageBody::GossipAck {
+                    in_reply_to: msg_id,
+                    msg_id: self.get_next_message_id(),
+                },
+            };
+
+            self.write_and_log_response(reply)?;
+
             let i_have_this = self.values.contains(&value);
             if !i_have_this {
                 self.values.insert(value);
```

## Latency constraints.

This is the part I had the most fun with while completing the first part of this challenge. You are supposed to send messages with 400ms latency medians (600ms max latency). The constraints are:

- 30 message-per-op
- 400ms median latency
- 600ms max latency

given that every message has 100ms latency within the system. This means, we need to optimize our graph in some way. In a overkill fashion, I decided to write a genetic algorithm to generate the graph.

### Genetic Algorithm for graph generation.

The graph will be encoded in the following way:
```python
import random
from typing import Dict, List, Self
import networkx as nx
import matplotlib.pyplot as plt

NUM_NODES_FIXED = 25
POPULATION_SIZE = 100
MAX_ITERATIONS  = 500
MAX_PERMISSIBLE_PATH_LENGTH = 6

class Graph(object):
    def __init__(self, num_nodes = 25, max_permissible_path_length = 0) -> None:
        self.vertices = range(0, num_nodes)
        self.max_permissible_path_length = max_permissible_path_length
        self.edges = {}

    def add_edge(self, from_vertex: int, to_vertex: int) -> None:
        if (from_vertex) not in self.vertices or to_vertex not in self.vertices:
            return

        self.edges[from_vertex] = self.edges.get(from_vertex, []) or []
        self.edges[to_vertex] = self.edges.get(to_vertex, []) or []

        if to_vertex not in self.edges[from_vertex]:
            self.edges[from_vertex].append(to_vertex)
            self.edges[to_vertex].append(from_vertex)

    def get_distances(self, from_vertex: int) -> Dict:
        distances = {}
        visited = set()

        queue = [(from_vertex, 0)]
        distances[from_vertex] = 0
        visited.add(from_vertex)

        while queue:
            first, depth = queue.pop(0)
            neighbors = self.edges.get(first, [])
            for neighbor in neighbors:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, depth + 1))
                    distances[neighbor] = depth + 1

        return distances

    def get_nodes_count(self) -> int:
        return len(self.vertices)

    def check_average_propagation_cost(self) -> float:
        score = 0
         
        disconnected_nodes = 0
        nodes_with_maxpath_violations = 0

        max_edges = max ([ len(self.edges.get(node, [])) for node in self.vertices ])
        total_edges = sum([ len(self.edges.get(node, [])) for node in self.vertices ])

        for node in self.vertices:
            distances = self.get_distances(node)
            disconnected_nodes += len(self.vertices) - len(distances) # Calculate the number of nodes unreachable from this
            nodes_with_maxpath_violations += len([tonode for tonode in distances if distances.get(tonode) > MAX_PERMISSIBLE_PATH_LENGTH ])

        score += -100000 * disconnected_nodes # All nodes MUST be connected
        score += -100000 * nodes_with_maxpath_violations
        score += -2000 * max_edges
        score += -250 * total_edges

        return score
```

The functions are pretty self-explanatory:
- `get_nodes_count` returns the number of nodes in the graph.
- `check_average_propagation_cost` returns the score of the graph. The score is calculated as:
  - 100000 * disconnected_nodes: All nodes must be connected.
  - 100000 * nodes_with_maxpath_violations: No node should have a path length greater than 6.
  - 2000 * max_edges: The maximum number of edges in the graph.
  - 250 * total_edges: The total number of edges in the graph.
- `get_distances` returns the distances from a node to all other nodes in the graph.
- `add_edge` adds an edge between two nodes. The edges are bidirectional.
- `__init__` initializes the graph.

Using this, and implementing a simple genetic algorithm, we land with a graph that looks like this:

```rust
"n17" => &["n19", "n0"],
"n19" => &["n17", "n14"],
"n10" => &["n2", "n22", "n20"],
"n2" => &["n10", "n13", "n11"],
"n13" => &["n2", "n15"],
"n7" => &["n14", "n3"],
"n14" => &["n7", "n19", "n12"],
"n24" => &["n22", "n1", "n23"],
"n22" => &["n24", "n10", "n8"],
"n18" => &["n5", "n15"],
"n5" => &["n18", "n0", "n3"],
"n0" => &["n4", "n17", "n5"],
"n4" => &["n0", "n8"],
"n1" => &["n24", "n6", "n11"],
"n23" => &["n24", "n6", "n16"],
"n21" => &["n20", "n12", "n9"],
"n20" => &["n21", "n9", "n10"],
"n15" => &["n13", "n12", "n18"],
"n6" => &["n1", "n23", "n3"],
"n12" => &["n21", "n14", "n15"],
"n9" => &["n21", "n20"],
"n11" => &["n2", "n1"],
"n3" => &["n7", "n6", "n5"],
"n8" => &["n4", "n16", "n22"],
"n16" => &["n23", "n8"],

```

Instead of using the given topology, this is the topology we can use. With this, we get the following results on median:

```bash
latencies:
0.5=434, 1:599

msg-per-op:
29
```

The genetic algorithm is as follows:

```python
class Chromosome:
    def __init__(self) -> None:
        self.graph = Graph(num_nodes=NUM_NODES_FIXED, max_permissible_path_length=MAX_PERMISSIBLE_PATH_LENGTH)
        # Initialize some random connections
        for _ in range(random.randint(10, 50)):
            from_node = random.randint(0, NUM_NODES_FIXED - 1)
            to_node = random.randint(0, NUM_NODES_FIXED - 1)
            if from_node != to_node:
                self.graph.add_edge(from_node, to_node)

    def mutate(self) -> Self:
        """
        Mutation strategies:
        1. Add a random edge
        2. Remove a random edge
        3. Rewire an existing edge
        """
        mutation_type = random.choice(['add', 'remove', 'rewire'])

        if mutation_type == 'add':
            from_node = random.randint(0, NUM_NODES_FIXED - 1)
            to_node = random.randint(0, NUM_NODES_FIXED - 1)
            if from_node != to_node and to_node not in self.graph.edges.get(from_node, []):
                self.graph.add_edge(from_node, to_node)

        elif mutation_type == 'remove':
            if self.graph.edges:
                from_node = random.choice(list(self.graph.edges.keys()))
                to_node = random.choice(self.graph.edges[from_node])
                self.graph.edges[from_node].remove(to_node)
                self.graph.edges[to_node].remove(from_node)

                if not self.graph.edges[from_node]:
                    del self.graph.edges[from_node]
                if not self.graph.edges[to_node]:
                    del self.graph.edges[to_node]

        elif mutation_type == 'rewire':
            if self.graph.edges:
                from_node = random.choice(list(self.graph.edges.keys()))
                old_to_node = random.choice(self.graph.edges[from_node])
                new_to_node = random.randint(0, NUM_NODES_FIXED - 1)

                self.graph.edges[from_node].remove(old_to_node)
                self.graph.edges[old_to_node].remove(from_node)

                if new_to_node != from_node and new_to_node not in self.graph.edges.get(from_node, []):
                    self.graph.add_edge(from_node, new_to_node)

        return self

    def crossover(self, other: "Chromosome") -> List["Chromosome"]:
        """
        Crossover strategies:
        1. Randomly combine edges from both parent chromosomes
        2. Create two offspring with mixed edge sets
        """
        offspring1 = Chromosome()
        offspring2 = Chromosome()

        all_edges_parent1 = set()
        all_edges_parent2 = set()

        for from_node, to_nodes in self.graph.edges.items():
            for to_node in to_nodes:
                all_edges_parent1.add((from_node, to_node))

        for from_node, to_nodes in other.graph.edges.items():
            for to_node in to_nodes:
                all_edges_parent2.add((from_node, to_node))

        combined_edges = list(all_edges_parent1.union(all_edges_parent2))
        random.shuffle(combined_edges)

        offspring1_edges = combined_edges[:len(combined_edges)//2]
        offspring2_edges = combined_edges[len(combined_edges)//2:]

        offspring1.graph.edges = {}
        offspring2.graph.edges = {}

        for from_node, to_node in offspring1_edges:
            offspring1.graph.add_edge(from_node, to_node)

        for from_node, to_node in offspring2_edges:
            offspring2.graph.add_edge(from_node, to_node)

        return [offspring1, offspring2]

def genetic_algorithm():
    # Initialize population
    population = [Chromosome() for _ in range(POPULATION_SIZE)]

    best_fitness_history = []

    # Genetic Algorithm main loop
    for generation in range(MAX_ITERATIONS):
        # Evaluate fitness for each chromosome
        fitness_scores = [chromosome.graph.check_average_propagation_cost() for chromosome in population]

        # Track best fitness in this generation
        best_fitness = max(fitness_scores)
        best_fitness_history.append(best_fitness)

        print(f"Generation {generation}: Best Fitness = {best_fitness}")

        # Select top 20% chromosomes for reproduction
        sorted_population = sorted(zip(population, fitness_scores), key=lambda x: x[1], reverse=True)
        top_population = [chrom for chrom, _ in sorted_population[:POPULATION_SIZE//5]]

        # Create new population through crossover and mutation
        new_population = top_population.copy()

        while len(new_population) < POPULATION_SIZE:
            # Select parents for crossover
            parent1 = random.choice(top_population)
            parent2 = random.choice(top_population)

            # Perform crossover
            offspring = parent1.crossover(parent2)

            # Optional mutation
            for child in offspring:
                if random.random() < 0.8:  # 30% mutation rate
                    child.mutate()

            new_population.extend(offspring)

        # Truncate population to original size
        population = new_population[:POPULATION_SIZE]

    # Return the best chromosome
    best_chromosome = max(population, key=lambda x: x.graph.check_average_propagation_cost())
    return best_chromosome
```

I tried with starting out with a fully-connected graph and removing edges, but it did not work out as good as this implementation (not sure why).

The next (and final) part of the broadcast challenge is to make it more efficient. For this, we just need to batch out our messages; instead of sending one message at a time, we send `n` messages at a time. The message sending can work on a ticker, where we send deltas of messages every 100ms.

## Conclusion

This challenge was a lot of fun; esp. the genetic algorithm part. I had a lot of fun implementing it. The final part of the challenge was to batch out messages, which I did not include along with code for the last part in this tutorial for brevity. I will leave that as an exercise for the reader. The next challenges are counter-based challenges, and I plan to do them in go, like the way the engineers at fly.io intended. The code for this part can be found [here](https://github.com/sandeshbhusal/gossip-glomers).