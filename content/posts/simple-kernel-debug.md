---
layout: post
title: "Building smol Linux image for reproducible crashes"
date: 2025-06-14
published: true
toc:
  sidebar: left
description: "How I (sometimes) debug issues with reproducible kernel issues"
tags:
- linux 
- os 
---
<!-- 
This is not a fancy "tutorial" you will find elsewhere on the internet. The topic of building and debugging the Linux Kernel has been explained to death all over the internet. This post entails how _I_ intend to build, and run the Linux Kernel on qemu for debugging purposes, primarily with syzcaller.

### Getting the Kernel Source

There are a couple of kernel variants that can be built and debugged. One thing to keep in mind while building the kernel for debugging would be to look at the stack trace, and checkout to/add remote of the particular branch the trace alludes to. For e.g. I am working on this issue:

```plaintext
------------[ cut here ]------------
ODEBUG: activate active (active state 1) object: ffff888025e8e118 object type: rcu_head hint: 0x0
WARNING: CPU: 1 PID: 5839 at lib/debugobjects.c:615 debug_print_object+0x17a/0x1f0 lib/debugobjects.c:612
Modules linked in:
CPU: 1 UID: 0 PID: 5839 Comm: strace-static-x Not tainted 6.14.0-syzkaller-01103-g2df0c02dab82 #0 PREEMPT(full) 
Hardware name: Google Google Compute Engine/Google Compute Engine, BIOS Google 02/12/2025
RIP: 0010:debug_print_object+0x17a/0x1f0 lib/debugobjects.c:612
Code: e8 8b a3 2d fd 4c 8b 0b 48 c7 c7 40 24 80 8c 48 8b 74 24 08 48 89 ea 44 89 e1 4d 89 f8 ff 34 24 e8 5b 2a 87 fc 48 83 c4 08 90
```

In this case, the kernel version is 6.14.0, so I generally check-out to this branch after cloning the kernel. Cloning the kernel itself is very straightforward - I just clone `https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/`

### Building the kernel

When working with qemu (instead of a vm, which I use if I have to install the kernel and run it -- apparently there's better ways to go about this, using virt-ng, etc, but I haven't explored them yet), my general flow is to take the `.config` file produced by syzcaller ([an example](https://syzkaller.appspot.com/text?tag=KernelConfig&x=5f1762820c18874b)), and copy it to the kernel source. Then, there are a couple of things I ensure in the `.config`:

```make
CONFIG_DEBUG_INFO=y
CONFIG_DEBUG_INFO_DWARF5=y
CONFIG_DEBUG_INFO_REDUCED=n
CONFIG_RANDOMIZE_BASE=n
```

All of these parts are crucial:
- Without `DEBUG_INFO`, and `DEBUG_INFO_DWARF5`, we will not be able to peek at the kernel source while running it on gdb.
- Without `CONFIG_RANDOMIZE_BASE`, gdb will not be able to accurately identify where the kernel starts, due to [KASLR](https://www.ibm.com/docs/en/linux-on-systems?topic=shutdown-kaslr). I was unable to put breakpoints in gdb when `RANDOMIZE_BASE` was set.

### Creating a small ramfs

I plan to figure out better ways to do this, since I haven't needed to have a entire big rootfs in my image yet (that part will come gradually, with requirements to compile + run syzcaller repro C files within the kernel), so I just use busybox. Once you have downloaded the busybox binary, do the following:

- Create a folder called `ramfs/bin`. On the internet, people have tutorials that ask you to create more folders, like `dev, sbin, proc, sys`, etc. But I stripped everything and the kernel still boots. On boot, the kernel _will_ create the `dev` and `root` folders for you in the ramfs itself.
- Inside the `ramfs/bin`, place your busybox. Then start to symlink:

```bash
ln -s ./busybox ./sh
ln -s ./busybox ./clear
```

Also this is pretty minimal. If you want more utilities, run the busybox binary, and see what other commands it provides.

- After this, create a `init` file, plaintext shell, and write the following into it:

```shell
#!/bin/sh
clear
echo "Welcome to tiny kernel\n"
/bin/sh
```

Don't forget to make it executable, i.e. `chmod +x` it.

- In the `ramfs` directory, run the following command:

```shell
find . -print0 | cpio -0 -o --format=newc > ../initramfs.cpio
```

What this does is, finds all files in the current directory and prints them out with null terminators to the console. Then `cpio` takes this, with the `-0` flag finds all the files, and outputs it to `../initramfs.cpio`. The `--format=newc` was absolutely crucial for the kernel to know I was creating a ramfs.

### Booting the small kernel

At this point, if you have qemu installed (which I assumed you do), running the kernel is as trivial as:

```shell
qemu-system-x86_64 -kernel arch/x86/boot/bzImage -append "console=ttyS0" -m 1G -nographic -initrd initramfs.cpio -accel kvm
```

You can remove the `-accel` part. But `-m` is absolutely necessary to give some ram to the kernel image to boot. Also, if you do not have `-nographic`, a qemu window will open up, but you will see that it does not produce outputs after a certain point. I am not sure why, maybe it's not mapped to the `console` 🤷🏽. The `console=ttyS0` is a kernel command line parameter.

### Conclusion

I hope this post is a first of many, where I document my journey of debugging kernel bugs. Hopefully it will be useful to you (and me)!

<!-- https://nickdesaulniers.github.io/blog/2018/10/24/booting-a-custom-linux-kernel-in-qemu-and-debugging-it-with-gdb/ -->
<!-- https://bmeneg.com/post/kernel-debugging-with-qemu/ -->
<!-- https://medium.com/@alessandrozanni.dev/setup-linux-kernel-debugging-with-qemu-and-gdb-e5446c16cd85 -->

The internet is filled with tutorials on building and debugging the Linux kernel. This isn't one of them. This post details *my* personal workflow for building, running, and debugging the Linux kernel using QEMU, primarily for working with syzkaller bug reports.

### Getting the Kernel Source

When tackling a kernel bug, the first step is to get the correct version of the source code. A typical syzkaller stack trace will tell you exactly which version you need. For example, consider this report:

```plaintext
------------[ cut here ]------------
ODEBUG: activate active (active state 1) object: ffff888025e8e118 object type: rcu_head hint: 0x0
WARNING: CPU: 1 PID: 5839 at lib/debugobjects.c:615 debug_print_object+0x17a/0x1f0 lib/debugobjects.c:612
Modules linked in:
CPU: 1 UID: 0 PID: 5839 Comm: strace-static-x Not tainted 6.14.0-syzkaller-01103-g2df0c02dab82 #0 PREEMPT(full)
Hardware name: Google Google Compute Engine/Google Compute Engine, BIOS Google 02/12/2025
RIP: 0010:debug_print_object+0x17a/0x1f0 lib/debugobjects.c:612
Code: e8 8b a3 2d fd 4c 8b 0b 48 c7 c7 40 24 80 8c 48 8b 74 24 08 48 89 ea 44 89 e1 4d 89 f8 ff 34 24 e8 5b 2a 87 fc 48 83 c4 08 90
```

The key information here is `6.14.0-syzkaller-01103-g2df0c02dab82`. This tells me the base version is **6.14.0**.

Cloning the mainline kernel is straightforward:

```bash
git clone https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/
```

After cloning, I check out the specific commit or tag mentioned in the report to ensure my source tree matches the one where the bug occurred.

-----

### Configuring the Build

My workflow is centered around QEMU, which simplifies the process of testing and debugging. I start by grabbing the `.config` file provided by syzkaller (see an [example here](https://syzkaller.appspot.com/text?tag=KernelConfig&x=5f1762820c18874b)) and copying it into the root of my kernel source directory.

Next, I ensure the following configuration options are set correctly for a smooth debugging session with GDB:

```make
CONFIG_DEBUG_INFO=y
CONFIG_DEBUG_INFO_DWARF5=y
CONFIG_DEBUG_INFO_REDUCED=n
CONFIG_RANDOMIZE_BASE=n
```

These settings are crucial:

- `CONFIG_DEBUG_INFO=y` and `CONFIG_DEBUG_INFO_DWARF5=y` embed debugging information into the kernel image, allowing GDB to map executable code back to the source.
- `CONFIG_RANDOMIZE_BASE=n` disables Kernel Address Space Layout Randomization (KASLR). With KASLR enabled, the kernel's base address is randomized at boot, making it impossible for GDB to reliably set breakpoints. Disabling it ensures a predictable memory layout.

Once the `.config` file is ready, I build the kernel:

```bash
make -j$(nproc)
```

-----

### Creating a Minimalist Ramdisk

For many debugging tasks, a full-blown root filesystem is overkill. I create a minimal initial ramdisk (`initramfs`) using **BusyBox**.

1. **Set up the directory structure.**

    ```bash
    mkdir -p ramfs/{bin,proc,dev,sys}
    ```

    A side note here is that all you really need is a directory for binaries. The kernel will create a directory for `/dev` when it boots, and my image still booted even when I did not have the `proc` and `sys` directories.

2. **Add BusyBox and create symlinks.**
    Copy the `busybox` binary into `ramfs/bin`. You can then create symbolic links for the essential commands you'll need.

    ```bash
    cp ~/wherever/busybox/is ./ramfs/bin/busybox && chmod +x ./ramfs/bin/busybox
    cd ramfs/bin
    ln -s busybox sh
    ln -s busybox clear
    cd ../..
    ```

    To see a full list of available commands, just run the `busybox` binary with no arguments.

3. **Create an `init` script.**
    This script is the first process the kernel executes. Create a file named `init` in the `ramfs` directory with the following content:

    ```shell
    #!/bin/sh
    #
    # My minimal init script
    #
    mount -t proc none /proc
    mount -t sysfs none /sys

    clear
    echo "Welcome to your custom kernel!"
    echo

    /bin/sh
    ```

    Make it executable:

    ```bash
    chmod +x ramfs/init
    ```

    Here, one thing to *absolutely not miss* would be the inital [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)). If you miss that, then this init will not work. Which also means if you miss symlinking `/bin/busybox` to `/bin/sh`, it will not work.

4. **Package the ramdisk.**
    From the directory containing your `ramfs` folder, run the following command to create the `initramfs` image:

    ```bash
    find ramfs -print0 | cpio -0 -o --format=newc > initramfs.cpio
    ```

    This command pipes a null-terminated list of files into `cpio`, which archives them into a compressed CPIO image. The `--format=newc` option is essential for the kernel to recognize it correctly.

-----

### Booting with QEMU

With the kernel (`bzImage`) and the initial ramdisk (`initramfs.cpio`) ready, booting is a one-line command:

```shell
qemu-system-x86_64 \
    -kernel arch/x86/boot/bzImage \
    -initrd initramfs.cpio \
    -append "console=ttyS0" \
    -m 1G \
    -nographic \
    -s -S
```

Let's break down these options:

- `-kernel`: Specifies the path to the compressed kernel image.
- `-initrd`: Specifies the path to our initial ramdisk.
- `-append "console=ttyS0"`: A kernel command-line parameter that directs all console output to the serial port, which is what we see in our terminal. `ttyS0` is the first serial port available in the device, which is generally a UART device.
- `-m 1G`: Allocates 2GB of RAM to the virtual machine. This is essential.
- `-nographic`: Prevents QEMU from opening a graphical window and instead redirects all I/O to the current terminal. I had to learn this one the hard way -- after a certain point, the output is not shown if you look at the graphical window, right after `Booting the kernel`. So if you are stuck at that point, this will help.
- `-s -S`: The `-S` part suspends the CPU at startup -- which means qemu waits until we type `c` at the monitor. The `-s` part is shorthand for `-gdb tcp::1234`, which opens up a gdb server at port 1234 on the qemu host. We can connect to the server with the gdb client for debugging purposes.

If everything is configured correctly, you'll see your kernel boot messages, followed by the welcome message from your `init` script and a shell prompt.

### Attaching with GDB

With QEMU waiting for a debugger connection, you can now attach GDB to the running kernel.

First, launch GDB and point it to `vmlinux`, the uncompressed kernel executable that contains all the symbol and debugging information. It's important to use `vmlinux` from the root of your kernel source tree, not the compressed `bzImage` (although that is what we booted up with qemu).

```shell
gdb ./vmlinux
(gdb) target remote localhost:1234
```

This command tells GDB to connect to a remote target. Sometimes, if you miss this step before setting breakpoints, gdb complains:

```shell
(gdb) hbreak kernel_init
No hardware breakpoint support in the target.
```

So make sure that you set the `target remote` option before setting breakpoints.

```gdb
(gdb) add-auto-load-safe-path /path/to/your/linux/scripts/gdb/vmlinux-gdb.py
```

The Linux kernel source comes with a collection of powerful helper scripts for GDB that understand kernel-specific data structures and states. This command adds the path to these scripts to GDB's safe-path list, allowing it to load them automatically. These helpers provide commands like `lx-dmesg` to view the kernel log buffer or `lx-ps` to list processes within the debugged kernel, which are incredibly useful. And some other stuff starting with [`lx-`](https://blogs.oracle.com/linux/post/live-kernel-debugging-2).

```gdb
(gdb) hbreak start_kernel
```

This sets a hardware-assisted breakpoint at the `start_kernel` function, which is the official entry point for all architecture-independent kernel code. An `hbreak` (hardware breakpoint) is required. I could not break with a normal `break` breakpoint.

```shell
(gdb) target remote localhost:1234
Remote debugging using localhost:1234
0x000000000000fff0 in ?? ()
(gdb) break kernel_init
Breakpoint 1 at 0xffffffff82212bc0: file init/main.c, line 1465.
(gdb) c
Continuing.
Warning:
Cannot insert breakpoint 1.
Cannot access memory at address 0xffffffff82212bc0

Command aborted.
```

Finally, `c` (or `continue`) tells GDB to resume the execution of the program. Since you started QEMU with the `-S` flag, the CPU was frozen. This command un-freezes it, and execution will proceed until it hits your breakpoint at `start_kernel`.

```gdb
(gdb) c
```

You should see something like this on the screen (I'm using tmux):

{% include figure.liquid loading="eager" path="assets/img/gdb-kernel-init.jpg" class="img-fluid rounded z-depth-1" %}

> Side fun, if you try to kill the console at this point with Ctrl+d on qemu, your kernel panics (as it should):

```shell
[   12.788898] RDX: 00007f00aad9e030 RSI: 0000000000000000 RDI: 000000000000007f
[   12.789624] RBP: 00007fff38c0dec8 R08: 0000000000000000 R09: 0000000000000000
[   12.790350] R10: 0000000000000000 R11: 0000000000000246 R12: 00007fff38c0dec0
[   12.791073] R13: 00007fff38c0deb8 R14: 0000000000000000 R15: 0000000000000000
[   12.791805]  </TASK>
[   12.792438] Kernel Offset: disabled
[   12.792810] ---[ end Kernel panic - not syncing: Attempted to kill init! exitcode=0x00007f00 ]---
```