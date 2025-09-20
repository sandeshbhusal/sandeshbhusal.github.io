cmake_minimum_required(VERSION "3.50")
project(1brc)

include(FetchContent)

FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
FetchContent_MakeAvailable(googletest)

FetchContent_Declare(
    benchmark
    URL https://github.com/google/benchmark/archive/refs/tags/v1.8.3.zip
)
FetchContent_MakeAvailable(benchmark)

add_executable(1brc 1.cc)
target_link_libraries(1brc PRIVATE pthread)

add_executable(bench1 bench1.cc)
target_link_libraries(bench1 PRIVATE benchmark pthread)

enable_testing()