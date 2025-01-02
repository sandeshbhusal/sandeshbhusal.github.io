---
title: "Visiting `mmap`"
date: 2023-01-02
template: "post.html"
author: "Sandesh Bhusal"
tags:
- linux
- half-baked
categories:
- linux
---

## Traditional File I/O
`mmap` is a very interesting functionality that allows users to do a memory-mapped IO operation on linux files. In this blog post, I will try to define
the use case of `mmap` as well as show you the tradeoffs of using `mmap` vs using a simple file IO operation (along with some code and screenshots).

When performing a simple file-based IO, like reading a file in an application, we often make use of the `open` and `read` syscalls. However, during executing
these syscalls, we pay for the overhead of copying bytes between the kernel buffer and the userspace program buffer. For an example, I ran the following test on my computer with a 4GiB file generated from `/dev/urandom` bytes.

```bash
dd if=/dev/urandom of="file2" bs=1M count=4000
```

Now, running a normal sequential read logic using the `open` and `read` syscalls like so;

```c
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <fcntl.h>
#define BUFFER_SIZE 4096 

int main(){
	char* filename = "./file2";
	int fd = open(filename, O_RDONLY);
	char *userspace_buffer = (char*) malloc(BUFFER_SIZE);
	while(1) {
		int r = read(fd, userspace_buffer, BUFFER_SIZE);
		if (r == 0 || r < BUFFER_SIZE){
			printf("Reading completed\n");
			break;
		}	
	}
	free(userspace_buffer);
	return 0;
}
```

and then tapping into `perf` with counter for the `read` syscall, we can observe the following output:

```bash
➜ sudo perf stat -e 'syscalls:*read*' ./simpleio
Reading completed

 Performance counter stats for './simpleio':

                 0      syscalls:sys_enter_readlinkat                                      
                 0      syscalls:sys_exit_readlinkat                                       
                 0      syscalls:sys_enter_readlink                                        
                 0      syscalls:sys_exit_readlink                                         
         1,024,002      syscalls:sys_enter_read                                            
         1,024,002      syscalls:sys_exit_read                                             
                 2      syscalls:sys_enter_pread64                                         
                 2      syscalls:sys_exit_pread64                                          
                 0      syscalls:sys_enter_readv                                           
                 0      syscalls:sys_exit_readv                                            
                 0      syscalls:sys_enter_preadv                                          
                 0      syscalls:sys_exit_preadv                                           
                 0      syscalls:sys_enter_preadv2                                         
                 0      syscalls:sys_exit_preadv2                                          
                 0      syscalls:sys_enter_process_vm_readv                                   
                 0      syscalls:sys_exit_process_vm_readv                                   
                 0      syscalls:sys_enter_readahead                                       
                 0      syscalls:sys_exit_readahead                                        

       0.587292363 seconds time elapsed

       0.024970000 seconds user
       0.561262000 seconds sys
```

There are an astonishing 1M reads and writes! Well, considering our block size of 4KB and the file size of 4GiB, 1M syscalls for reads sounds reasonable. However, one very important thing to consider is that each time we perform a syscall, we make a trap into the operating system, specifically in this case, to the `read(3)` syscall which takes up additional time, due to the copying logic and entering the kernel space. This time can be quantified as well. Running another perf script this time, we can see some syscalls being made, and after some syscalls there is a **huge** contiguous block of `read` syscalls being made:

```bash
$ sudo perf script
...
simpleio 482674 [011] 380322.623068:                    syscalls:sys_enter_read: fd: 0x00000003, buf: 0x01a3a2a0, count: 0x00001000
simpleio 482674 [011] 380322.624533:                     syscalls:sys_exit_read: 0x1000
simpleio 482674 [011] 380322.624536:                    syscalls:sys_enter_read: fd: 0x00000003, buf: 0x01a3a2a0, count: 0x00001000
simpleio 482674 [011] 380322.624539:                     syscalls:sys_exit_read: 0x1000
simpleio 482674 [011] 380322.624539:                    syscalls:sys_enter_read: fd: 0x00000003, buf: 0x01a3a2a0, count: 0x00001000
simpleio 482674 [011] 380322.624540:                     syscalls:sys_exit_read: 0x1000
simpleio 482674 [011] 380322.624541:                    syscalls:sys_enter_read: fd: 0x00000003, buf: 0x01a3a2a0, count: 0x00001000
...
```
Each time the syscall happens, we can see roughly 1 microsecond being spent. This, compounded with 1M calls means 1M*1 microsecond, which is equivalent to 1 second roughly. Which means a HUGE chunk of time is being spent to copy back and forth between the kernel buffer and the userspace buffer. Running this program gives the following output:

```bash
➜ time ./simpleio
Reading completed
./simpleio  0.03s user 1.03s system 82% cpu 1.485 total
```

This is astonishing. However, if you run the same program again, you will observe _much_ lower runtimes, in the order of a second. This is due to the page cache being kept by the kernel for future usage. This can be dropped and if we run the test again, the original number repeats.

```bash
$ sudo -i
# echo 3> /proc/sys/vm/drop_cache
```

## Enter mmap.

Let's write up a simple `mmap` example to accomplish the same task:

```c
#include <stdio.h>
#include <fcntl.h>
#include <stdlib.h>
#include <error.h>
#include <sys/mman.h>
#include <sys/stat.h>
#define BUFFER_SIZE 4096

int main(){
	int fd = open("./file2", O_RDONLY);
	if (fd < 0){
		perror("Could not open file");	
	}
	struct stat filestat;
	fstat(fd, &filestat);

	char *userspace_buffer;
	userspace_buffer = (char *) mmap(0, filestat.st_size, PROT_READ, MAP_SHARED, fd, 0);
	unsigned int total = 0;
	while (total < filestat.st_size){
		// access nth byte to cause page fault, since we do not have any read
		// or eof methods to check for.
		char ch = userspace_buffer[total];
		total += BUFFER_SIZE;
	}	
	munmap(userspace_buffer, BUFFER_SIZE);
	printf("Completed reading\n");
	return 0;
}
```

Here, we map the file to a userspace buffer, and simply read the n-th byte each time. Remember, 4KB is our page size and each time we address the nth byte, we are actually requesting the next page (and a couple more since the OS pipelines the loading of pages). Then, when the file stat size count of bytes are returned, we will unmap the userspace buffer.

Let's compare the same metrics as above from simple IO.

```bash
➜ sudo perf stat -e 'syscalls:*read*' ./mmap
Completed reading

 Performance counter stats for './mmap':

                 0      syscalls:sys_enter_readlinkat                                      
                 0      syscalls:sys_exit_readlinkat                                       
                 0      syscalls:sys_enter_readlink                                        
                 0      syscalls:sys_exit_readlink                                         
                 1      syscalls:sys_enter_read                                            
                 1      syscalls:sys_exit_read                                             
                 2      syscalls:sys_enter_pread64                                         
                 2      syscalls:sys_exit_pread64                                          
                 0      syscalls:sys_enter_readv                                           
                 0      syscalls:sys_exit_readv                                            
                 0      syscalls:sys_enter_preadv                                          
                 0      syscalls:sys_exit_preadv                                           
                 0      syscalls:sys_enter_preadv2                                         
                 0      syscalls:sys_exit_preadv2                                          
                 0      syscalls:sys_enter_process_vm_readv                                   
                 0      syscalls:sys_exit_process_vm_readv                                   
                 0      syscalls:sys_enter_readahead                                       
                 0      syscalls:sys_exit_readahead                                        

       0.385496230 seconds time elapsed

       0.084344000 seconds user
       0.262157000 seconds sys
```

Welp, that is definitely interesting! We see no large number of syscalls being made. The single read syscall is being made due to the file stat call we make in the code. (Although, it seems unfair to check _just_ the read syscalls, if you check all syscalls being made by running `perf stat -e 'syscalls:*' ./mmap`, then you would not see any frequent syscalls being made at all).

I have also mentioned the page fault in the mmap code. Well, when the nth byte is accessed, then the page might not yet exist in OS page cache so it needs to be fetched. So, comparing the mmap version with simple io version, we get:

**SimpleIO**
```bash
➜ /usr/bin/time -v ./simpleio
Reading completed
        Command being timed: "./simpleio"
        User time (seconds): 0.01
        System time (seconds): 0.49
        Percent of CPU this job got: 99%
        Elapsed (wall clock) time (h:mm:ss or m:ss): 0:00.51
        Average shared text size (kbytes): 0
        Average unshared data size (kbytes): 0
        Average stack size (kbytes): 0
        Average total size (kbytes): 0
        Maximum resident set size (kbytes): 1328
        Average resident set size (kbytes): 0
        Major (requiring I/O) page faults: 0
        Minor (reclaiming a frame) page faults: 69
        Voluntary context switches: 1
        Involuntary context switches: 2
        Swaps: 0
        File system inputs: 0
        File system outputs: 0
        Socket messages sent: 0
        Socket messages received: 0
        Signals delivered: 0
        Page size (bytes): 4096
        Exit status: 0
```

**mmap**

```bash
➜ /usr/bin/time -v ./mmap    
Completed reading
        Command being timed: "./mmap"
        User time (seconds): 0.07
        System time (seconds): 0.20
        Percent of CPU this job got: 99%
        Elapsed (wall clock) time (h:mm:ss or m:ss): 0:00.28
        Average shared text size (kbytes): 0
        Average unshared data size (kbytes): 0
        Average stack size (kbytes): 0
        Average total size (kbytes): 0
        Maximum resident set size (kbytes): 4097268
        Average resident set size (kbytes): 0
        Major (requiring I/O) page faults: 0
        Minor (reclaiming a frame) page faults: 64064
        Voluntary context switches: 2
        Involuntary context switches: 1
        Swaps: 0
        File system inputs: 56
        File system outputs: 0
        Socket messages sent: 0
        Socket messages received: 0
        Signals delivered: 0
        Page size (bytes): 4096
        Exit status: 0
```

Both tests are made on hot page caches, i.e. page cache was not flushed like before. Here, no major page faults are seen. This is because of preloading of the file pages into memory by the OS which is pretty efficient. However, in the minor page fault section, we see a lot of page faults for the mmap version.

