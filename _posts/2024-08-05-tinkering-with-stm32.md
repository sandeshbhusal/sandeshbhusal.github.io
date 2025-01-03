---
layout: post
title: "Tinkering with STM32"
date: 2024-08-05
published: true
tags:
- embedded
- stm32
---

For a change of pace, I wanted to work on an embedded project, but being the "systems programmer" that I am, without a proper working knowledge of the electrical signals (well, I do have a degree, but it's not in electrical engineering), I decided to tinker with the STM32 microcontroller. After borrowing one from a friend (thanks, Royce!) I started to tinker with it, but I found myself working with a STM32 Cube IDE, and that just won't do, will it?

## QEMU

<br/>

![QEMU Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Qemu_logo.svg/1024px-Qemu_logo.svg.png)

<br/>

Enter QEMU. It is a virtual machine that emulates a CPU, and it is very useful for testing and debugging embedded software. After a brief hiatus with the STM32 Cube IDE, I decided to give it a try, because I wanted to try out other boards, and test my mettle with other boards, and a barebones approach. I had been using autogenerated codebases from the STM32 Cube IDE, and a lot of things are hidden under the hood. Becoming and embedded engineer would require me to interface directly with unknown hardware, for which no SDK exists (maybe I would have to write my own)!

For simplicity's sake, I decided to work with the netduinoplus2 board, which is supported by QEMU, under the machine name of "netduinoplus2". It is a arm cortex-m4 board, which was analogous to the stm32-f4discovery board I borrowed from my friend. 

## Finding stuff?

Now that I had my board, I needed a workflow. Trying to to cheat _too much_ from lowlevel learning on youtube (his tutorials are aweeeeeesome btw), I gathered the information about the necessary bits from the internet, and his videos. Here were the basic things I would need:

- A toolchain
- A bootloader (mayhaps not, I will explain this later)
- A linker script
- Build system

### Toolchain
This was trivial. I had a working toolchain, and I just needed to add the necessary bits to make it work with the board.

### A Linker Script

This is where I spent most of my time. First of all, the linker script needs the memory map of the board. I looked at the description of the netduinoplus2 board on the QEMU docs, and [found that it uses STM32F405RGT6 microcontroller](https://github.com/qemu/qemu/blob/master/docs/system/arm/stm32.rst). I wanted the memory map but I was too lazy to check out the datasheet, so I poked around the qemu repo inside [https://github.com/qemu/qemu/blob/master/hw/arm/netduinoplus2.c](https://github.com/qemu/qemu/blob/master/hw/arm/netduinoplus2.c), but I didn't find anything. Oh well. After a quick search, I found the [datasheet](hehe) and the rest is history. Well, not really.

Inside the datasheet, I found the memory map. The way netduinoplus2 boots up is configured by the boot-up pins, and the inital couple of bytes in the memory map (4G) are aliased depending on the boot pin configuration. In my case, it would boot up directly from flash which is at `0x08000000`.

![Memory Map](/images/stm32_mmap.png)

### Build System

I used my trusty old mate, 'Make' for this purpose. I also wanted to use gdb to debug the code, which the toolchain brings along with it. 

## The adventure begins

Armed with my half-baked knowledge of writing .. well .. everything, I started my journey. I had a head full of ideas, eyes full of dreams, and brain full of nothing. So I wrote this.

### A simple main

Our main does not need to do a lot. It just needs to exist. And well, loop.

```c
void main(void){
    while(1);
}
```

Then this will get compiled with a "stub bootloader". IDK where I got this idea, but the concept of mixing the arm assembly (and learning a bit of it), and calling C code sounded too sexy to pass up.

```as
.extern main
.global _start

_start:
    b main
```

Then our linker script will come into play and help us organize these bits:

```ld
ENTRY(_start)

MEMORY{
     FLASH ( rw ) : ORIGIN = 0x08000000 , LENGTH = 1M
     RAM ( xrw) : ORIGIN = 0x20000000 , LENGTH = 112K
}

SECTIONS
{
    . = 0x8000;

    .text :
    {
        *(.text._start)        /* Ensure _start is placed first */
        *(.text*)              /* All other .text sections from input files */
        *(.rodata*)            /* Read-only data */
    } > FLASH
}
```

Since I am too poor at maths, I used an online calculator to find the lengths of the memory regions.
Ahh, the code is looking sexy already.

Now, to tie it all together, I need a makefile.

```make
TARGET=arm-none-eabi
CORTEX=cortex-m4
CFLAGS=-nostartfiles

CC=${TARGET}-gcc
LD=${TARGET}-ld
AS=${TARGET}-as

OBJDUMP=${TARGET}-objdump
OBJCOPY=${TARGET}-objcopy

all: kernel.o

boot.o: boot.s
        ${AS} -mcpu=${CORTEX} -g boot.s -o boot.o

main.o: main.c
        ${CC} ${CFLAGS} -g -nostdlib -mcpu=${CORTEX} -c main.c -o main.o

kernel.o: main.o boot.o
        ${LD} -T linker.ld main.o boot.o -o kernel.o

clean:
        rm -rf *.o *.elf
```

Just look at that makefile. So clean. So concise. So sexy... 

<img src = "https://a.pinatafarm.com/680x848/03f5bb020a/anthony-adams-rubbing-hands.jpg" width = 400>

Well, I digress.
Now the time to run everything.

```bash
% make
arm-none-eabi-gcc -nostartfiles -nostdlib -mcpu=cortex-m4 -g -c main.c -o main.o
arm-none-eabi-gcc -nostartfiles -nostdlib -mcpu=cortex-m4 -g -c boot.c -o boot.o
arm-none-eabi-ld -T linker.ld main.o boot.o -o kernel.elf

% qemu-system-arm -M netduinoplus2 -nographic -kernel kernel.o
qemu: fatal: Lockup: can't escalate 3 to HardFault (current priority -1)

R00=00000000 R01=00000000 R02=00000000 R03=00000000
R04=00000000 R05=00000000 R06=00000000 R07=00000000
R08=00000000 R09=00000000 R10=00000000 R11=00000000
R12=00000000 R13=af00b460 R14=fffffff9 R15=00000000
XPSR=40000003 -Z-- A handler
s00=00000000 s01=00000000 d00=0000000000000000
s02=00000000 s03=00000000 d01=0000000000000000
s04=00000000 s05=00000000 d02=0000000000000000
s06=00000000 s07=00000000 d03=0000000000000000
s08=00000000 s09=00000000 d04=0000000000000000
s10=00000000 s11=00000000 d05=0000000000000000
s12=00000000 s13=00000000 d06=0000000000000000
s14=00000000 s15=00000000 d07=0000000000000000
s16=00000000 s17=00000000 d08=0000000000000000
s18=00000000 s19=00000000 d09=0000000000000000
s20=00000000 s21=00000000 d10=0000000000000000
s22=00000000 s23=00000000 d11=0000000000000000
s24=00000000 s25=00000000 d12=0000000000000000
s26=00000000 s27=00000000 d13=0000000000000000
s28=00000000 s29=00000000 d14=0000000000000000
s30=00000000 s31=00000000 d15=0000000000000000
FPSCR: 00000000
zsh: abort      qemu-system-arm -M netduinoplus2 -nographic -kernel kernel.o
```

This led me to a profound realization - this is why embedded engineers are so hard to find (and unhinged). 

## Analyzing the crash

No matter how hard I tried, I couldn't find the cause of the crash. Surprisingly, it is easier to find the tutorial on Rust (mi cheri) than on C (mi cherry). I was able to find some blog posts, but they just were not working out. Turns out, I had my linker script all wrong.

### Looking at the linker script
A quick look at the linker script shows a fatal flaw: 0x8000 is not the start of the .text section. So that line went away. After a couple of 5-minutes of debugging, I found the problem. The glaring issue. The bane of my code. (*add more drama here*). 

#### The IVT

The interrupt vector table is a table of addresses of the interrupt handlers. The first entry in the IVT is the stack pointer base, followed by the reset handler, the nmi handler, the hard fault handler, and so on. 

The reset handler is the first thing that runs when the processor boots up.

I did not have that.

Ugh.

The rectification was simple.

```ld
MEMORY
{
    FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 1M
    RAM (rwx)  : ORIGIN = 0x20000000, LENGTH = 112K
}

SECTIONS
{
    .text :
    {
        *(.text._start)        /* Ensure _start is placed first */
        *(.text*)              /* All other .text sections */
        *(.rodata*)            /* Read-only data */
        . = ALIGN(4);
    } > FLASH
}
```

#### The bootloader

The bootloader was mostly fine. I was thinking about the bootloader-main connection, and I thought that it would be best to initialize the IVT in the bootloader, and then jump to the main. So I set about writing the IVT in the bootloader. In the end, I removed the bootloader asm, and rewrite the bootloader in C.

```c
#include <stdint.h>

extern void main(void);

// Stack top starts at the end of the ram boundary. 
// This is technically the last mem location we can access.
// https://www.st.com/resource/en/datasheet/stm32f405rg.pdf
#define STACK_TOP 0x20010000

// The entry function (mentioned in our linker script).
// IDK What else I should add at this point, as this can be main instead of this.
void _start(void) {
    main();  // Call the main function
    while (1);  // Infinite loop to prevent falling off the end. In case main exits.
}

// NOTE: SUPERR important. If this does not exist, the CPU will NOT take us to the
// _start function, i.e. reset handler.
// Interrupt Vector Table
__attribute__((section(".isr_vector")))
uint32_t isr_vector[] = {
    STACK_TOP,          // Initial Stack Pointer
    (uint32_t) _start,  // Reset Handler
};
```

It's a bit of a mess? but it works.

#### The main
The main is pretty much the same. Pretty and useless.

## Running + debugging

Now I recompiled everything. It compiled fine. Now was the time to run it with qemu. It hung up.

The question remains - did it hang up in the bootloader loop, or did it hang up in the main loop? I wasn't sure. Enter, gdb.

Running gdb with the qemu binary is pretty simple; in one pane, you run the qemu binary, and in the other one, run gdb. In the pane with qemu, run it like:

```bash
$ qemu-system-arm -M netduinoplus2 -nographic -kernel kernel.elf -gdb tcp::4444 -S
``` 
[^1]

This suspends the execution of the kernel (which we will resume from gdb).

In the gdb pane, run gdb like:

```bash
% arm-none-eabi-gdb kernel.elf                                                                                                                                                     (main x!?)
GNU gdb (GNU Arm Embedded Toolchain 10.3-2021.10) 10.2.90.20210621-git
Copyright (C) 2021 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
Type "show copying" and "show warranty" for details.
This GDB was configured as "--host=x86_64-apple-darwin10 --target=arm-none-eabi".
Type "show configuration" for configuration details.
For bug reporting instructions, please see:
<https://www.gnu.org/software/gdb/bugs/>.
Find the GDB manual and other documentation resources online at:
    <http://www.gnu.org/software/gdb/documentation/>.

For help, type "help".
Type "apropos word" to search for commands related to "word"...
Reading symbols from kernel.elf...
```

Then attach to the gdb session:
```bash
(gdb) target remote localhost:4444
Remote debugging using localhost:4444
_start () at boot.c:12
12      void _start(void) {
(gdb) break main
Breakpoint 1 at 0x800000c: file main.c, line 3.
```

Finally, continue the execution:
```bash
(gdb) c
Continuing.

Breakpoint 1, main () at main.c:3
3           while(1);
(gdb)
```

And voila! We are in main.

![debug](/images/debug_panes.png)

## What did we learn? What's moving forward?
It's more about what I learned:
- It's not easy to debug embedded software unless you get into a debug env. Before a debug env, I cannot imagine how hard it is to debug a program.
- IVT is a cool thing. Don't forget it.
- A lot of infrastructure has gone into building these toolchains (qemu, gdb, linker scripts, etc.). I came to have a deep sense of appreciation for all the engineers who develop that.

Now that I have a somewhat working program, I can start to think about how to make it more useful. I am thinking about exploring Rust (esp in RISC-V) for my upcoming posts, since I recently bought a Milk-V board (which is super cool). Here's to learning a lot, and I hope to see you in the future.

___

[^1]: If you omit one of the colons in the `tcp::4444`, the qemu gods will be very very angry with you.