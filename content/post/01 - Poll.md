---
title: "01 - Example of Polling"
draft: false
date: 2022-12-30
author: Sandesh Bhusal
---

## Introduction

Async is a widely used paradigm for multitasking. I say multitasking and not multithreading because there's difference between async and multithreading. We will get to that later. Async is a cooperative multitasking paradigm that is very useful in cases of IO bound tasks. In case of CPU bound tasks, multithreading would be the better choice. Async runtimes exploit the underlying threadpool available from the operating system to run "tasks". Thus, a single thread can be used to do multiple things, like wait from the console and the network at the same time. This is specially useful in case of embedded systems where we might not have multiple threads to work with.

Let's consider the above example; a chat server. For the chat server to work, the user must send _and_ receive messages, and we need to multiplex both. Now, assuming we use the classic thread model, it would look something like this in rust:

```rust
use std::sync::{Arc, Mutex};

#[derive(Default, Debug)]
struct StateData{
    console_buffer: Vec<u8>,
    network_buffer: Vec<u8>
}

fn listen_to_console(state: Arc<Mutex<StateData>>){
    // Do something to listen to console and update the shared state.
}

fn listen_to_incoming_messages(state: Arc<Mutex<StateData>>){
    // Do something to listen to network connections and data.
}

fn main(){
    let shared_state = Arc::new(Mutex::new(StateData::default()));
    let t1state = shared_state.clone();
    let t2state = shared_state.clone();

    let console_joinhandle = std::thread::spawn(move ||{
        listen_to_console(t1state);
    });

    let network_joinhandle = std::thread::spawn(move || {
        listen_to_incoming_messages(t2state);
    });
    
    console_joinhandle.join().unwrap();
    network_joinhandle.join().unwrap();
    
    loop {
        // Render everything.
    }
}
```

And this would be perfectly okay.

## The stage is set

I would not be writing this blog post if there was no issue with using the above code. For a p2p chat client the above code is perfect! But what if we have multiple peers we want to talk to? And god forbid, one of our friend decides to send us their entire zipped codebase (for some reason. Never a good reason to do this). Then using a single thread for receiving all network activity, we will not be able to talk to our other friends until the download completes. And if their internet is slow then we might be replying late to all other messages because they will arrive slowly as well.

```rust
fn handle_peer(stateData: Arc<Mutex<StateData>>, remotePeer: TcpStream) {
    // Do something with a single connection here.
}
fn listen_to_incoming_messages(state: Arc<Mutex<StateData>>){
    let listener = std::net::TcpListener::bind("0.0.0.0:1111")
                                            .unwrap();
    for connection in listener.incoming(){
        let cloned_data = state.clone();
        std::thread::spawn(|| move {
            handle_peer(cloned_data, connection); 
        })
    }
}
```
An easy method to solve the above issue is ... threads again. Using a new thread per connection would allievate the above issue. But again, depending on how many peers we are communicating with, this will create a very large overhead as threads have their own stack space. More specifically, [each generated thread will allocate 2MiB for the stack space](https://doc.rust-lang.org/std/thread/#stack-size) (at the time of writing this article). That means for 100 peers, 200MiB system memory will be consumed. And if our peers are idle, it will be for naught. It is quite impossible to talk to 100 people at the same time, so we are simply wasting our system resources.

## A _very_ OS-ic solution

I want you to meet my good friend, poll.

Operating systems generally provide a nice intrinsic to handle delayed IO connections. Your hard drive might not be immediately ready to read and return the contents of a file. And your friend might not have written back to you at all. In those cases, the operating system has a facility or API for userspace code to check if any progress has been made on a particular set of functionality, like network or disk. If some change has occurred, then the OS will notify the userspace program through some shared memory structures. 

In Linux, this is called polling. In Windows IOCP, FreeBSD kqueue, etc. The point is every operating system has some functionality for this. Let's take a look at a very basic polling example:

Say, I want to read two very large files. The files are of the size around 1G each. Let's generate some random data for the files first:

```bash
$ dd if=/dev/urandom of=file1 bs=1M count=1000
$ dd if=/dev/urandom of=file2 bs=1M count=1000
```

Now, we read the files using a simple C program.
```C
#include <stdio.h>
int main(int argc, char *argv[]){
    FILE *file1, *file2;
    file1 = fopen("./file1", "r");
    file2 = fopen("./file2", "r");

    while(!feof(file1)){
        char ch = fgetc(file1);
    }

    printf("Completed reading file1");
    while(!feof(file2)){
        char ch = fgetc(file2);
    }

    printf("Completed reading file2");
    return 0;
}
```

On my system with a SSD, it takes roughly 10s to read both files.
```bash
➜ time ./readfile
./readfile  10.01s user 0.32s system 99% cpu 10.345 total
```

However, the operations take place one after another. And while reading the files _synchronously_, we are not just waiting for the bytes to appear (I know this can be sped up with larger buffers), but we are also waiting for the kernel to write out the file data to our application buffer `ch` which happens _only after_ the disk reports to the OS that it can give it a byte (generally disk operations happen in pages, a page size is typically 4KB on modern systems although this can vary). So in effect we read a page, and then wait for another page to be ready from disk. Between two pages, there is effectively just wait, and we are not doing anything with our CPU time.

Now using polling mechanism, this can be changed. When we are waiting for one file descriptor to update, we can check if another file descriptor has updated, in effect, reading both files at the same time, little by little. For an example, we read 2 pages (8KB) from the first file, then the disk becomes busy. Then we check if file2 can be read or file1 can be read. In effect, the OS will update a shared data structure and we can poll on the structure to see which file we can read and when.

A brief example follows:

```C
#include <fcntl.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/poll.h>
#include <unistd.h>

#define BUFSIZE 1024

int main(int argc, char **args) {
  int file1, file2;

  file1 = open("./file1", O_RDONLY, S_IRUSR);
  file2 = open("./file2", O_RDONLY, S_IRUSR);

  printf("File descriptors: %d %d\n", file1, file2);
  fflush(stdout);

  struct pollfd descriptors[2];
  char *memory = (char *)malloc(BUFSIZE);
  descriptors[0].fd = file1;
  descriptors[1].fd = file2;
  descriptors[0].events = POLLIN;
  descriptors[1].events = POLLIN;
  int completed[] = {0, 0};

  while (!(completed[0] & completed[1])) {
    int t = poll(descriptors, 2, 1);

    // Poll on file1
    if (!completed[0])
      if (descriptors[0].revents & POLLIN) {
        int count = read(descriptors[0].fd, memory, BUFSIZE);
        if (count == 0 || count < BUFSIZE) {
          printf("Completed reading file 1\n");
          completed[0] = 1;
          continue;
        }
      }

    // Poll on file2
    if (!completed[1])
      if (descriptors[1].revents & POLLIN) {
        int count = read(descriptors[1].fd, memory, BUFSIZE);
        if (count == 0 || count < BUFSIZE) {
          printf("Completed reading file 2\n");
          completed[1] = 1;
          continue;
        }
      }
  }

  return 0;
}
```

This example code is quite long - for the sake of understandability. For the purpose of demonstrating this program, let's write "hello" into the second file, i.e. `file2`. 

Executing this on my computer gives me the following output:
```bash
➜ gcc -g -o poll poll.c && ./poll
File descriptors: 3 4
Completed reading file 2
Completed reading file 1
```

There are two file descriptors of interest - for file1 and file2. We are using the open call from fcntl in this code example. In the poll loop, until both file descriptors are completed, we poll both the file descriptors. Whichever file descriptor has the data, will be read and the polling will continue - here's where things get interesting.

Now if we did not have the `continue` in the conditional, then the file reading would be just interleaved. We would not see any effects of polling. Remembering that we have a short string in file2, it should've been that the first file would be read first, and loop would continue. If the file1 was always available for reading, then file1 reading would be completed first, only then file2 would get the chance to be read. But since IO operations are not readily available all the time, the first check passes through to the second loop and we get a file read completion for file2 first, only then file1 continues to be read.

This code example is a bit contrived, and actually takes longer to execute than the serial read example. But in cases of a system with HDD, or a network request, this could provide us gains!

## I came here for async - where is it?
You must be thinking:
> Well all that is neat-o. But what on earth is async and have I been scammed because I'm reading about poll instead of async?

### This is not a scam
I promise you, this has not been a scam. Whatever you've read so far is how async actually operates under the hood. Thus the term async is just a fancy way of saying "Schedule the following tasks but make sure that when they are waiting on some file descriptor, you continue to run other tasks". A unit of execution in async can be called as a task - like listening on a socket or writing a file which we normally use a function to do. Then there's an async "executor" which takes these tasks and runs them on a preset number of threads, making sure that they are scheduled cooperatively (if a task decides to go malicious and not yield it can do so - that is why putting CPU bound tasks on an async executor would just run it serially if running on a single thread). In the above example, we used a blocking mechanism to read two files together (not parallely but concurrently). There are several methods of achieving asynchronous task execution - event driven methods like `aio` and blocking methods like `epoll`, `poll`, `select` or `pselect` should be explored further.

## Where do we go from here
This has been a brief introduction of a very non-ergonomic way to run asynchronous code in Linux. Going forward, all examples will be written in Rust. I am writing this article because the density of the Async book is quite difficult to tackle and these are the notes I will use to remember the contents of the book. I hope this will be helpful to others as well! 

See you in the next one.