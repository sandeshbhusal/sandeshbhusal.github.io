---
title: "Rust Async 02 - Understanding Async"
date: 2022-12-30
categories:
- series
tags:
- series
---

## Introduction

This is going to be a brief introduction on how Async actually operates under the hood. Most of what I am writing in this post is going to be true for all languages. There might be some mistakes here and there and I rely on the reader to point those out to me.

## What is "Async"?

I think the blog post should've started with this question instead. In the first part, we got a taste of what async is - one of the mechanisms implementing it. Going to wikipedia (as one always does when one is in a pickle to give definition to something), we find the following introduction:

> Asynchrony, in computer programming, refers to the occurrence of events independent of the main program flow and ways to deal with such events. These may be "outside" events such as the arrival of signals, or actions instigated by a program that take place concurrently with program execution, without the program blocking to wait for results.

In the example in the first part, we took a look at doing two file reads concurrently - when one file is not availble for a read, we do not block and instead, opt to utilize our CPU time to checking if the second file is available for a read. We do not block, and when the OS signals to us that the second file is ready for reading, we read it.

> **This is the main idea behind async - to not block waiting for external IO operations. This includes network, disk and file activity (I have separated disk and file because file might mean something else, like `stdin` as well).**